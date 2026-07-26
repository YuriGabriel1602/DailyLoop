import logging

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from config import settings
from database import Contact, ConversationMessage, IntegrationCredential, User, get_session
from services import activity_log_service, crypto_service, meta_embedded_signup_service
from services.auth_service import get_current_user
from services.connection_manager import manager
from services.lead_inbound_service import get_or_create_contact, handle_inbound_message, record_message
from services.sidecar_event_schemas import SidecarEvent, ts_to_dt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp-business", tags=["whatsapp-business"])


def _get_or_create_cred(owner_id: int, session: Session) -> IntegrationCredential:
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == owner_id, IntegrationCredential.channel == "whatsapp"
        )
    ).first()
    if not cred:
        cred = IntegrationCredential(owner_id=owner_id, channel="whatsapp")
        session.add(cred)
        session.commit()
        session.refresh(cred)
    return cred


class EmbeddedSignupRequest(BaseModel):
    code: str
    waba_id: str
    phone_number_id: str


@router.post("/embedded-signup")
def embedded_signup(
    payload: EmbeddedSignupRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    access_token = meta_embedded_signup_service.exchange_embedded_signup_code(payload.code)
    if not access_token:
        raise HTTPException(status_code=400, detail="Não foi possível trocar o code do Embedded Signup por um token.")

    if not meta_embedded_signup_service.subscribe_app_to_waba(payload.waba_id, access_token):
        raise HTTPException(
            status_code=400,
            detail="Token obtido, mas não foi possível inscrever o app nessa WABA (webhooks não vão chegar).",
        )

    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == current_user.id, IntegrationCredential.channel == "whatsapp"
        )
    ).first()
    if not cred:
        cred = IntegrationCredential(owner_id=current_user.id, channel="whatsapp")

    cred.external_account_id = payload.waba_id
    cred.phone_number_id = payload.phone_number_id
    cred.access_token_encrypted = crypto_service.encrypt(access_token)
    cred.status = "connected"
    cred.connection_mode = "cloud_api"
    session.add(cred)
    session.commit()
    session.refresh(cred)
    activity_log_service.log(
        session, current_user.id, "empresarial", "integration.connected", "Conectou WhatsApp Business (WABA) via Embedded Signup"
    )

    return {
        "id": cred.id,
        "channel": cred.channel,
        "external_account_id": cred.external_account_id,
        "status": cred.status,
    }


# --- WhatsApp Business via QR Code (alternativa à Cloud API oficial) ---
#
# Mesmo mecanismo do WhatsApp Pessoal (sidecar Node/Baileys, slot "business" em vez de
# "personal") — pareia o número de negócio direto, sem token nem verificação de
# Business Manager, com o mesmo risco de banimento por automação que a Meta pode
# detectar. Mensagens recebidas/enviadas caem no Inbox/CRM (Contact/Conversation/
# ConversationMessage), igual à Cloud API — os leads não se importam por qual
# transporte a resposta chegou.


@router.post("/qr/connect")
def qr_connect(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    cred = _get_or_create_cred(current_user.id, session)
    cred.connection_mode = "qr"
    session.add(cred)
    session.commit()
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{current_user.id}/business/start",
                headers={"X-Sidecar-Secret": settings.sidecar_shared_secret},
            )
        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail="O serviço de WhatsApp recusou o pareamento.")
    except httpx.RequestError:
        logger.exception("Falha ao contatar o sidecar do WhatsApp Business")
        raise HTTPException(
            status_code=503,
            detail="Serviço de WhatsApp indisponível — confirme que o whatsapp-sidecar está rodando.",
        )
    return {"status": "pairing_started"}


@router.post("/qr/disconnect")
def qr_disconnect(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    cred = _get_or_create_cred(current_user.id, session)
    try:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{current_user.id}/business/logout",
                headers={"X-Sidecar-Secret": settings.sidecar_shared_secret},
            )
    except httpx.RequestError:
        logger.exception("Falha ao contatar o sidecar do WhatsApp Business pro logout")

    cred.status = "disconnected"
    cred.access_token_encrypted = ""
    cred.external_account_id = ""
    session.add(cred)
    session.commit()
    activity_log_service.log(
        session, current_user.id, "empresarial", "integration.disconnected", "Desconectou WhatsApp Business (QR Code)"
    )
    return {"status": "disconnected"}


@router.post("/qr/event")
async def qr_event(
    payload: SidecarEvent,
    session: Session = Depends(get_session),
    x_sidecar_secret: str = Header(default=""),
):
    """Chamado pelo whatsapp-sidecar (slot "business") — mesmo protocolo do
    `/api/whatsapp-personal/event`, mas as mensagens caem no Inbox/CRM em vez de nas
    tabelas só-pessoais."""
    if not settings.sidecar_shared_secret or x_sidecar_secret != settings.sidecar_shared_secret:
        raise HTTPException(status_code=401, detail="Segredo do sidecar ausente ou inválido.")

    if payload.type == "qr":
        await manager.broadcast_to_user(
            payload.owner_id, {"type": "whatsapp_business_qr", "qr_data_url": payload.qr_data_url}
        )
    elif payload.type == "connected":
        cred = _get_or_create_cred(payload.owner_id, session)
        cred.status = "connected"
        cred.connection_mode = "qr"
        cred.external_account_id = payload.phone_number or payload.jid or ""
        session.add(cred)
        session.commit()
        activity_log_service.log(
            session, payload.owner_id, "empresarial", "integration.connected", "Conectou WhatsApp Business via QR Code"
        )
        await manager.broadcast_to_user(
            payload.owner_id, {"type": "whatsapp_business_qr_status", "status": "connected"}
        )
    elif payload.type == "disconnected":
        cred = _get_or_create_cred(payload.owner_id, session)
        cred.status = "disconnected"
        session.add(cred)
        session.commit()
        await manager.broadcast_to_user(
            payload.owner_id, {"type": "whatsapp_business_qr_status", "status": "disconnected"}
        )
    elif payload.type == "message" and payload.message:
        m = payload.message
        if m.direction == "inbound":
            # Ao vivo e de verdade: grava E deixa a IA responder na hora, se estiver ligada.
            await handle_inbound_message(
                owner_id=payload.owner_id,
                channel="whatsapp",
                contact_external_id=m.jid.split("@")[0],
                contact_name=m.push_name or m.jid.split("@")[0],
                text=m.content,
                external_message_id=m.external_message_id,
                session=session,
                whatsapp_jid=m.jid,
                message_type=m.message_type,
                media_base64=m.media_base64,
                media_mime=m.media_mime,
            )
        else:
            # Mandada direto do celular do negócio (fora do DailyLoop) — só registra,
            # sem gatilho de IA nem reenvio (a mensagem já saiu de verdade).
            await record_message(
                owner_id=payload.owner_id,
                channel="whatsapp",
                contact_external_id=m.jid.split("@")[0],
                contact_name=m.push_name or m.jid.split("@")[0],
                text=m.content,
                direction="outbound",
                sender="agent",
                external_message_id=m.external_message_id,
                session=session,
                whatsapp_jid=m.jid,
                message_type=m.message_type,
                media_base64=m.media_base64,
                media_mime=m.media_mime,
            )
    elif payload.type == "contacts":
        for c in payload.history_chats:
            get_or_create_contact(
                payload.owner_id, "whatsapp", c.jid.split("@")[0], c.name, session, whatsapp_jid=c.jid
            )
    elif payload.type == "phone_share" and payload.jid and payload.phone_number:
        # Contato @lid cujo número de telefone real o WhatsApp acabou de revelar — só
        # troca o número exibido, o external_id/whatsapp_jid usados pra mandar e casar
        # com a Cloud API continuam os mesmos.
        contact = session.exec(
            select(Contact).where(Contact.owner_id == payload.owner_id, Contact.whatsapp_jid == payload.jid)
        ).first()
        if contact:
            contact.phone_number = payload.phone_number
            session.add(contact)
            session.commit()
    elif payload.type == "history_sync":
        names = {c.jid: c.name for c in payload.history_chats if c.name}
        for m in payload.history_messages:
            if m.external_message_id:
                exists = session.exec(
                    select(ConversationMessage).where(ConversationMessage.external_message_id == m.external_message_id)
                ).first()
                if exists:
                    continue
            await record_message(
                owner_id=payload.owner_id,
                channel="whatsapp",
                contact_external_id=m.jid.split("@")[0],
                contact_name=names.get(m.jid, m.push_name or m.jid.split("@")[0]),
                text=m.content,
                direction=m.direction,
                sender="contact" if m.direction == "inbound" else "agent",
                external_message_id=m.external_message_id,
                session=session,
                whatsapp_jid=m.jid,
                message_type=m.message_type,
                media_base64=m.media_base64,
                media_mime=m.media_mime,
                created_at=ts_to_dt(m.timestamp),
                broadcast=False,
            )
    # "chat_meta" (archived) do slot "business": Contact/Conversation não têm conceito
    # de "arquivada" hoje (isso é só do WhatsApp Pessoal) — ignorado de propósito.

    return {"status": "ok"}
