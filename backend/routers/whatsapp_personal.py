import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from config import settings
from database import IntegrationCredential, User, WhatsappPersonalChat, WhatsappPersonalMessage, get_session
from services import activity_log_service, media_service
from services.auth_service import decode_user_id, get_current_user
from services.connection_manager import manager
from services.sidecar_event_schemas import SidecarEvent, ts_to_dt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp-personal", tags=["whatsapp-personal"])


def _get_or_create_cred(owner_id: int, session: Session) -> IntegrationCredential:
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == owner_id, IntegrationCredential.channel == "whatsapp_personal"
        )
    ).first()
    if not cred:
        cred = IntegrationCredential(owner_id=owner_id, channel="whatsapp_personal")
        session.add(cred)
        session.commit()
        session.refresh(cred)
    return cred


@router.post("/connect")
def connect(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _get_or_create_cred(current_user.id, session)
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{current_user.id}/personal/start",
                headers={"X-Sidecar-Secret": settings.sidecar_shared_secret},
            )
        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail="O serviço de WhatsApp Pessoal recusou o pareamento.")
    except httpx.RequestError:
        logger.exception("Falha ao contatar o sidecar do WhatsApp Pessoal")
        raise HTTPException(
            status_code=503,
            detail="Serviço de WhatsApp Pessoal indisponível — confirme que o whatsapp-sidecar está rodando.",
        )
    return {"status": "pairing_started"}


@router.post("/disconnect")
def disconnect(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    cred = _get_or_create_cred(current_user.id, session)
    try:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{current_user.id}/personal/logout",
                headers={"X-Sidecar-Secret": settings.sidecar_shared_secret},
            )
    except httpx.RequestError:
        logger.exception("Falha ao contatar o sidecar do WhatsApp Pessoal pro logout")

    cred.status = "disconnected"
    cred.access_token_encrypted = ""
    cred.external_account_id = ""
    session.add(cred)
    session.commit()
    activity_log_service.log(session, current_user.id, "pessoal", "integration.disconnected", "Desconectou WhatsApp Pessoal")
    return {"status": "disconnected"}


# --- Chats e mensagens ---


def _get_or_create_chat(owner_id: int, jid: str, name: str, session: Session) -> WhatsappPersonalChat:
    chat = session.exec(
        select(WhatsappPersonalChat).where(WhatsappPersonalChat.owner_id == owner_id, WhatsappPersonalChat.jid == jid)
    ).first()
    if chat:
        if name and chat.name != name:
            chat.name = name
            session.add(chat)
            session.commit()
            session.refresh(chat)
        return chat
    chat = WhatsappPersonalChat(owner_id=owner_id, jid=jid, name=name, phone_number=jid.split("@")[0])
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return chat


def _get_owned_chat(chat_id: int, owner_id: int, session: Session) -> WhatsappPersonalChat:
    chat = session.get(WhatsappPersonalChat, chat_id)
    if not chat or chat.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return chat


async def _store_message(
    *,
    owner_id: int,
    chat: WhatsappPersonalChat,
    direction: str,
    message_type: str,
    content: str,
    media_base64: Optional[str],
    media_mime: Optional[str],
    external_message_id: str,
    session: Session,
    created_at: Optional[datetime] = None,
    broadcast: bool = True,
    mark_unread: bool = False,
) -> WhatsappPersonalMessage:
    media_path = None
    if media_base64 and message_type == "image":
        try:
            media_path = media_service.save_media(
                settings.whatsapp_personal_media_dir, owner_id, media_base64, media_mime or "image/jpeg"
            )
        except Exception:
            logger.exception("Falha ao salvar mídia do WhatsApp Pessoal")
            message_type = "unsupported"
            content = content or "📎 Não foi possível salvar a mídia recebida"

    kwargs = dict(
        chat_id=chat.id,
        direction=direction,
        message_type=message_type,
        content=content,
        media_path=media_path,
        media_mime=media_mime if media_path else None,
        external_message_id=external_message_id,
    )
    if created_at is not None:
        kwargs["created_at"] = created_at

    message = WhatsappPersonalMessage(**kwargs)
    session.add(message)
    chat.last_message_at = message.created_at
    chat.has_conversation = True
    if mark_unread:
        chat.unread_count += 1
    session.add(chat)
    session.commit()
    session.refresh(message)

    if broadcast:
        await manager.broadcast_to_user(
            owner_id,
            {"type": "whatsapp_personal_message", "chat_id": chat.id, "message": message.model_dump(mode="json")},
        )
    return message


@router.get("/chats")
def list_chats(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    chats = session.exec(
        select(WhatsappPersonalChat).where(WhatsappPersonalChat.owner_id == current_user.id)
    ).all()
    # Conversas de verdade primeiro (mais recente primeiro); contatos sem nenhuma
    # mensagem trocada ainda vão depois, em ordem alfabética.
    chats.sort(
        key=lambda c: (
            0 if c.has_conversation else 1,
            -c.last_message_at.timestamp() if c.has_conversation else 0,
            (c.name or c.phone_number or "").lower(),
        )
    )
    result = []
    for chat in chats:
        last = session.exec(
            select(WhatsappPersonalMessage)
            .where(WhatsappPersonalMessage.chat_id == chat.id)
            .order_by(WhatsappPersonalMessage.id.desc())
        ).first()
        preview = ""
        if last:
            preview = "📷 Foto" if last.message_type == "image" and not last.content else last.content
        result.append(
            {
                "id": chat.id,
                "jid": chat.jid,
                "name": chat.name or chat.phone_number,
                "phone_number": chat.phone_number,
                "last_message_at": chat.last_message_at,
                "last_message_preview": preview,
                "archived": chat.archived,
                "unread_count": chat.unread_count,
                "has_conversation": chat.has_conversation,
            }
        )
    return result


@router.post("/chats/{chat_id}/read")
def mark_chat_read(
    chat_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    chat = _get_owned_chat(chat_id, current_user.id, session)
    if chat.unread_count:
        chat.unread_count = 0
        session.add(chat)
        session.commit()
    return {"status": "ok"}


class NewChatPayload(BaseModel):
    phone_number: str


@router.post("/chats")
def create_chat(
    payload: NewChatPayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    digits = "".join(ch for ch in payload.phone_number if ch.isdigit())
    if not digits:
        raise HTTPException(status_code=400, detail="Número inválido.")
    chat = _get_or_create_chat(current_user.id, f"{digits}@s.whatsapp.net", "", session)
    return chat


@router.get("/search")
def search_messages(
    q: str = Query(default="", min_length=1),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Busca em TODO o histórico já sincronizado (lidas, não lidas, arquivadas — sem
    filtro nenhum de status), não só nas mensagens carregadas na tela."""
    like = f"%{q.strip()}%"
    statement = (
        select(WhatsappPersonalMessage, WhatsappPersonalChat)
        .join(WhatsappPersonalChat, WhatsappPersonalChat.id == WhatsappPersonalMessage.chat_id)
        .where(
            WhatsappPersonalChat.owner_id == current_user.id,
            WhatsappPersonalMessage.content.ilike(like),
        )
        .order_by(WhatsappPersonalMessage.id.desc())
        .limit(100)
    )
    rows = session.exec(statement).all()
    return [
        {
            "message_id": message.id,
            "chat_id": chat.id,
            "chat_name": chat.name or chat.phone_number,
            "content": message.content,
            "created_at": message.created_at,
        }
        for message, chat in rows
    ]


@router.get("/chats/{chat_id}/messages")
def list_messages(
    chat_id: int,
    before_id: Optional[int] = Query(default=None),
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_chat(chat_id, current_user.id, session)
    statement = select(WhatsappPersonalMessage).where(WhatsappPersonalMessage.chat_id == chat_id)
    if before_id is not None:
        statement = statement.where(WhatsappPersonalMessage.id < before_id)
    statement = statement.order_by(WhatsappPersonalMessage.id.desc()).limit(limit)
    messages = session.exec(statement).all()
    return list(reversed(messages))


class SendMessagePayload(BaseModel):
    content: str = ""
    image_base64: Optional[str] = None
    mime_type: Optional[str] = None


@router.post("/chats/{chat_id}/messages")
async def send_message(
    chat_id: int,
    payload: SendMessagePayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    chat = _get_owned_chat(chat_id, current_user.id, session)
    if not payload.content.strip() and not payload.image_base64:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    message_type = "image" if payload.image_base64 else "text"
    message = await _store_message(
        owner_id=current_user.id,
        chat=chat,
        direction="outbound",
        message_type=message_type,
        content=payload.content,
        media_base64=payload.image_base64,
        media_mime=payload.mime_type,
        external_message_id="",
        session=session,
    )

    ok = False
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{current_user.id}/personal/send",
                headers={"X-Sidecar-Secret": settings.sidecar_shared_secret},
                json={
                    "jid": chat.jid,
                    "text": payload.content if message_type == "text" else None,
                    "image_base64": payload.image_base64,
                    "mime_type": payload.mime_type,
                    "caption": payload.content if message_type == "image" else None,
                },
            )
        ok = response.status_code < 400
    except httpx.RequestError:
        logger.exception("Falha ao contatar o sidecar pra enviar mensagem")

    if not ok:
        message.status = "failed"
        session.add(message)
        session.commit()
        session.refresh(message)

    return message


@router.get("/media/{message_id}")
def get_media(message_id: int, token: str = Query(default=""), session: Session = Depends(get_session)):
    """Autenticado por token na query string (não header) porque uma tag <img> não
    manda Authorization — mesmo mecanismo já usado pelo handshake do /api/inbox/ws."""
    user_id = decode_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido.")

    message = session.get(WhatsappPersonalMessage, message_id)
    if not message or not message.media_path:
        raise HTTPException(status_code=404, detail="Mídia não encontrada.")

    chat = session.get(WhatsappPersonalChat, message.chat_id)
    if not chat or chat.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Mídia não encontrada.")

    path = media_service.resolve_media_path(settings.whatsapp_personal_media_dir, message.media_path)
    if not path:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    return FileResponse(path, media_type=message.media_mime or "application/octet-stream")


# --- Eventos do sidecar (Node/Baileys) ---


@router.post("/event")
async def receive_event(
    payload: SidecarEvent,
    session: Session = Depends(get_session),
    x_sidecar_secret: str = Header(default=""),
):
    """Chamado pelo whatsapp-sidecar (Node/Baileys), não pelo navegador — por isso a
    autenticação é por segredo compartilhado, não por JWT de usuário logado."""
    if not settings.sidecar_shared_secret or x_sidecar_secret != settings.sidecar_shared_secret:
        raise HTTPException(status_code=401, detail="Segredo do sidecar ausente ou inválido.")

    if payload.type == "qr":
        await manager.broadcast_to_user(
            payload.owner_id, {"type": "whatsapp_personal_qr", "qr_data_url": payload.qr_data_url}
        )
    elif payload.type == "connected":
        cred = _get_or_create_cred(payload.owner_id, session)
        cred.status = "connected"
        cred.external_account_id = payload.phone_number or payload.jid or ""
        session.add(cred)
        session.commit()
        activity_log_service.log(
            session, payload.owner_id, "pessoal", "integration.connected", "Conectou WhatsApp Pessoal via QR Code"
        )
        await manager.broadcast_to_user(
            payload.owner_id, {"type": "whatsapp_personal_status", "status": "connected"}
        )
    elif payload.type == "disconnected":
        cred = _get_or_create_cred(payload.owner_id, session)
        cred.status = "disconnected"
        session.add(cred)
        session.commit()
        await manager.broadcast_to_user(
            payload.owner_id, {"type": "whatsapp_personal_status", "status": "disconnected"}
        )
    elif payload.type == "message" and payload.message:
        m = payload.message
        chat = _get_or_create_chat(payload.owner_id, m.jid, m.push_name or "", session)
        await _store_message(
            owner_id=payload.owner_id,
            chat=chat,
            direction=m.direction,
            message_type=m.message_type,
            content=m.content,
            media_base64=m.media_base64,
            media_mime=m.media_mime,
            external_message_id=m.external_message_id,
            created_at=ts_to_dt(m.timestamp),
            session=session,
            mark_unread=(m.direction == "inbound"),
        )
    elif payload.type == "contacts":
        # Só atualiza nome/cria o contato — nunca mexe em archived/unread_count aqui.
        for c in payload.history_chats:
            _get_or_create_chat(payload.owner_id, c.jid, c.name, session)
    elif payload.type == "chat_meta" and payload.jid and payload.archived is not None:
        chat = _get_or_create_chat(payload.owner_id, payload.jid, "", session)
        chat.archived = payload.archived
        session.add(chat)
        session.commit()
    elif payload.type == "phone_share" and payload.jid and payload.phone_number:
        # Contato @lid cujo número de telefone real o WhatsApp acabou de revelar —
        # só troca o número exibido, o jid usado pra mandar mensagem continua o mesmo.
        chat = _get_or_create_chat(payload.owner_id, payload.jid, "", session)
        chat.phone_number = payload.phone_number
        session.add(chat)
        session.commit()
    elif payload.type == "history_sync":
        for c in payload.history_chats:
            chat = _get_or_create_chat(payload.owner_id, c.jid, c.name, session)
            chat.archived = c.archived
            chat.unread_count = c.unread_count
            session.add(chat)
        if payload.history_chats:
            session.commit()

        names = {c.jid: c.name for c in payload.history_chats if c.name}
        for m in payload.history_messages:
            chat = _get_or_create_chat(payload.owner_id, m.jid, names.get(m.jid, m.push_name or ""), session)
            if m.external_message_id:
                exists = session.exec(
                    select(WhatsappPersonalMessage).where(
                        WhatsappPersonalMessage.chat_id == chat.id,
                        WhatsappPersonalMessage.external_message_id == m.external_message_id,
                    )
                ).first()
                if exists:
                    continue
            await _store_message(
                owner_id=payload.owner_id,
                chat=chat,
                direction=m.direction,
                message_type=m.message_type,
                content=m.content,
                media_base64=m.media_base64,
                media_mime=m.media_mime,
                external_message_id=m.external_message_id,
                created_at=ts_to_dt(m.timestamp),
                session=session,
                broadcast=False,
            )
    # "message" sem `payload.message` ou tipos desconhecidos: ignorado.

    return {"status": "ok"}
