import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from config import settings
from database import Contact, Conversation, ConversationMessage, EmailAccount, IntegrationCredential, User, engine, get_session
from services import activity_log_service, email_account_service, media_service, whatsapp_service
from services.auth_service import decode_user_id, get_current_user
from services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


class ConversationPatch(BaseModel):
    ai_enabled: Optional[bool] = None
    status: Optional[str] = None


class ReplyCreate(BaseModel):
    content: str = ""
    image_base64: Optional[str] = None
    mime_type: Optional[str] = None


def _get_owned_conversation(conversation_id: int, current_user: User, session: Session) -> Conversation:
    db_conversation = session.get(Conversation, conversation_id)
    if not db_conversation or db_conversation.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return db_conversation


def _send_to_channel(
    conversation: Conversation, content: str, session: Session, *, image_base64: Optional[str] = None, mime_type: Optional[str] = None
) -> bool:
    """Envia de fato a mensagem pro canal externo. Pra "whatsapp"/instagram/facebook
    delega pro dispatcher único (`whatsapp_service.send_business_message`, que decide
    Cloud API oficial vs QR Code vs Meta genérico) — o mesmo usado pelas respostas
    automáticas da IA (`services/lead_inbound_service.py`) e pelo watchdog
    (`services/scheduler_service.py`), pra nunca duplicar essa decisão de transporte."""
    contact = session.get(Contact, conversation.contact_id)
    if not contact:
        return False

    if conversation.channel == "email":
        if image_base64:
            logger.warning("Envio de imagem por email ainda não suportado — mensagem não enviada.")
            return False
        account = session.exec(
            select(EmailAccount).where(EmailAccount.owner_id == conversation.owner_id, EmailAccount.status == "connected")
        ).first()
        if not account:
            logger.warning("Sem conta de email conectada — resposta não enviada.")
            return False
        return email_account_service.send_email(account, contact.external_id, content)

    return whatsapp_service.send_business_message(
        conversation.owner_id, conversation.channel, contact, content, session,
        image_base64=image_base64, mime_type=mime_type,
    )


@router.get("/conversations")
def list_conversations(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    statement = (
        select(Conversation, Contact)
        .join(Contact, Contact.id == Conversation.contact_id)
        .where(Conversation.owner_id == current_user.id)
        .order_by(Conversation.last_message_at.desc())
    )
    rows = session.exec(statement).all()
    return [
        {
            "id": conversation.id,
            "channel": conversation.channel,
            "ai_enabled": conversation.ai_enabled,
            "status": conversation.status,
            "last_message_at": conversation.last_message_at,
            "created_at": conversation.created_at,
            "contact": contact,
        }
        for conversation, contact in rows
    ]


@router.get("/search")
def search_messages(
    q: str = Query(default="", min_length=1),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Busca em todo o histórico de mensagens do Inbox (todos os canais, abertas ou
    fechadas), não só na conversa aberta na tela."""
    like = f"%{q.strip()}%"
    statement = (
        select(ConversationMessage, Conversation, Contact)
        .join(Conversation, Conversation.id == ConversationMessage.conversation_id)
        .join(Contact, Contact.id == Conversation.contact_id)
        .where(Conversation.owner_id == current_user.id, ConversationMessage.content.ilike(like))
        .order_by(ConversationMessage.id.desc())
        .limit(100)
    )
    rows = session.exec(statement).all()
    return [
        {
            "message_id": message.id,
            "conversation_id": conversation.id,
            "contact_name": contact.name,
            "channel": conversation.channel,
            "content": message.content,
            "created_at": message.created_at,
        }
        for message, conversation, contact in rows
    ]


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_conversation(conversation_id, current_user, session)
    statement = (
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.created_at.asc())
    )
    return session.exec(statement).all()


@router.post("/conversations/{conversation_id}/messages")
async def send_reply(
    conversation_id: int,
    payload: ReplyCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_conversation = _get_owned_conversation(conversation_id, current_user, session)
    if not payload.content.strip() and not payload.image_base64:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    message_type = "image" if payload.image_base64 else "text"
    media_path = None
    if payload.image_base64:
        try:
            media_path = media_service.save_media(
                settings.whatsapp_business_media_dir, current_user.id, payload.image_base64, payload.mime_type or "image/jpeg"
            )
        except Exception:
            logger.exception("Falha ao salvar mídia de saída do Inbox")
            message_type = "unsupported"

    db_message = ConversationMessage(
        conversation_id=conversation_id,
        direction="outbound",
        sender="agent",
        content=payload.content,
        message_type=message_type,
        media_path=media_path,
        media_mime=payload.mime_type if media_path else None,
    )
    session.add(db_message)
    db_conversation.ai_enabled = False  # atendente humano assumiu — pausa a IA nesta conversa
    db_conversation.last_message_at = datetime.utcnow()
    session.add(db_conversation)
    session.commit()
    session.refresh(db_message)

    _send_to_channel(db_conversation, payload.content, session, image_base64=payload.image_base64, mime_type=payload.mime_type)

    await manager.broadcast_to_user(
        current_user.id,
        {"type": "message", "conversation_id": conversation_id, "message": db_message.model_dump(mode="json")},
    )
    activity_log_service.log(
        session, current_user.id, "empresarial", "inbox.manual_reply", "Você respondeu manualmente e pausou a IA"
    )
    return db_message


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: int,
    patch: ConversationPatch,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_conversation = _get_owned_conversation(conversation_id, current_user, session)
    patch_data = patch.model_dump(exclude_unset=True)
    for field, value in patch_data.items():
        setattr(db_conversation, field, value)
    session.add(db_conversation)
    session.commit()
    session.refresh(db_conversation)

    await manager.broadcast_to_user(
        current_user.id,
        {"type": "conversation_updated", "conversation": db_conversation.model_dump(mode="json")},
    )
    return db_conversation


@router.get("/media/{message_id}")
def get_media(message_id: int, token: str = Query(default=""), session: Session = Depends(get_session)):
    """Mesmo mecanismo de auth por token na query string do `/api/whatsapp-personal/media`
    (uma tag <img> não manda header Authorization)."""
    user_id = decode_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido.")

    message = session.get(ConversationMessage, message_id)
    if not message or not message.media_path:
        raise HTTPException(status_code=404, detail="Mídia não encontrada.")

    conversation = session.get(Conversation, message.conversation_id)
    if not conversation or conversation.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Mídia não encontrada.")

    path = media_service.resolve_media_path(settings.whatsapp_business_media_dir, message.media_path)
    if not path:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    return FileResponse(path, media_type=message.media_mime or "application/octet-stream")


@router.websocket("/ws")
async def inbox_ws(websocket: WebSocket, token: str = ""):
    user_id = decode_user_id(token)
    if not user_id:
        await websocket.close(code=4401)
        return

    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user or not user.is_active:
            await websocket.close(code=4401)
            return

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # mantém a conexão viva; cliente não precisa enviar nada
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
