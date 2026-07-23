import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Contact, Conversation, ConversationMessage, EmailAccount, IntegrationCredential, User, engine, get_session
from services import activity_log_service, crypto_service, email_account_service, meta_messaging_service, whatsapp_service
from services.auth_service import decode_user_id, get_current_user
from services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


class ConversationPatch(BaseModel):
    ai_enabled: Optional[bool] = None
    status: Optional[str] = None


class ReplyCreate(BaseModel):
    content: str


def _get_owned_conversation(conversation_id: int, current_user: User, session: Session) -> Conversation:
    db_conversation = session.get(Conversation, conversation_id)
    if not db_conversation or db_conversation.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return db_conversation


def _send_to_channel(conversation: Conversation, content: str, session: Session) -> bool:
    """Envia de fato a mensagem pro canal externo (WhatsApp/Instagram/Facebook), mesma
    lógica de saída usada pelas respostas automáticas da IA em `routers/webhooks.py`."""
    contact = session.get(Contact, conversation.contact_id)
    if not contact:
        return False

    if conversation.channel == "whatsapp":
        cred = session.exec(
            select(IntegrationCredential).where(
                IntegrationCredential.owner_id == conversation.owner_id, IntegrationCredential.channel == "whatsapp"
            )
        ).first()
        if not cred or not cred.access_token_encrypted or not cred.phone_number_id:
            logger.warning("WhatsApp do negócio sem conexão completa — mensagem só salva localmente.")
            return False
        token = crypto_service.decrypt(cred.access_token_encrypted)
        return whatsapp_service.send_whatsapp_text(
            contact.external_id, content, access_token=token, phone_number_id=cred.phone_number_id
        )

    if conversation.channel == "email":
        account = session.exec(
            select(EmailAccount).where(EmailAccount.owner_id == conversation.owner_id, EmailAccount.status == "connected")
        ).first()
        if not account:
            logger.warning("Sem conta de email conectada — resposta não enviada.")
            return False
        return email_account_service.send_email(account, contact.external_id, content)

    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == conversation.owner_id,
            IntegrationCredential.channel == conversation.channel,
        )
    ).first()
    if not cred or not cred.access_token_encrypted:
        logger.warning("Sem credencial conectada pro canal %s — mensagem só salva localmente.", conversation.channel)
        return False

    token = crypto_service.decrypt(cred.access_token_encrypted)
    return meta_messaging_service.send_meta_text(
        channel=conversation.channel, page_access_token=token, recipient_id=contact.external_id, body=content
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

    db_message = ConversationMessage(
        conversation_id=conversation_id,
        direction="outbound",
        sender="agent",
        content=payload.content,
    )
    session.add(db_message)
    db_conversation.ai_enabled = False  # atendente humano assumiu — pausa a IA nesta conversa
    db_conversation.last_message_at = datetime.utcnow()
    session.add(db_conversation)
    session.commit()
    session.refresh(db_message)

    _send_to_channel(db_conversation, payload.content, session)

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
