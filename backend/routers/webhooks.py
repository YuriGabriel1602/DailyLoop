import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlmodel import Session, select

from config import settings
from database import BusinessAISettings, Contact, Conversation, ConversationMessage, IntegrationCredential, User, get_session
from services import activity_log_service, ai_service, crypto_service, meta_messaging_service, whatsapp_service
from services.connection_manager import manager
from services.notification_service import notify

logger = logging.getLogger(__name__)

# Nome deliberadamente diferente de `routers/meta.py` (que é só o health check
# `GET /`) — este router lida com os webhooks reais da Meta (WhatsApp/Instagram/Facebook).
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

OBJECT_TO_CHANNEL = {
    "whatsapp_business_account": "whatsapp",
    "instagram": "instagram",
    "page": "facebook",
}


@router.get("/meta")
def verify_webhook(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
):
    """Handshake de verificação exigido pela Meta ao cadastrar a URL do webhook."""
    if (
        hub_mode == "subscribe"
        and settings.meta_webhook_verify_token
        and hub_verify_token == settings.meta_webhook_verify_token
    ):
        return Response(content=hub_challenge, media_type="text/plain")
    return Response(status_code=403)


def _is_group_message(msg: dict) -> bool:
    """Checagem defensiva de mensagem de grupo — a Cloud API oficial do WhatsApp Business
    não repassa grupos no fluxo padrão, mas alguns gateways/BSPs incluem sinais de grupo
    no payload (JID terminando em "g.us", ou um campo "group_id" explícito)."""
    sender = msg.get("from", "") or ""
    return sender.endswith("g.us") or "group_id" in msg


def _resolve_credential(channel: str, external_account_id: str, session: Session) -> Optional[IntegrationCredential]:
    return session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.channel == channel,
            IntegrationCredential.external_account_id == external_account_id,
            IntegrationCredential.status == "connected",
        )
    ).first()


def _get_or_create_contact(owner_id: int, channel: str, external_id: str, name: str, session: Session) -> Contact:
    contact = session.exec(
        select(Contact).where(
            Contact.owner_id == owner_id, Contact.channel == channel, Contact.external_id == external_id
        )
    ).first()
    if contact:
        return contact
    contact = Contact(owner_id=owner_id, channel=channel, external_id=external_id, name=name or external_id)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


def _get_or_create_conversation(
    owner_id: int, contact: Contact, channel: str, ai_default_mode: str, session: Session
) -> Conversation:
    conversation = session.exec(
        select(Conversation).where(
            Conversation.owner_id == owner_id, Conversation.contact_id == contact.id, Conversation.status == "open"
        )
    ).first()
    if conversation:
        return conversation
    conversation = Conversation(
        owner_id=owner_id,
        contact_id=contact.id,
        channel=channel,
        ai_enabled=(ai_default_mode == "24_7"),
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


async def _handle_inbound_message(
    *,
    owner_id: int,
    channel: str,
    contact_external_id: str,
    contact_name: str,
    text: str,
    external_message_id: Optional[str],
    session: Session,
    is_group: bool = False,
):
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == owner_id, IntegrationCredential.channel == channel
        )
    ).first()
    contact = _get_or_create_contact(owner_id, channel, contact_external_id, contact_name, session)
    conversation = _get_or_create_conversation(
        owner_id, contact, channel, cred.ai_default_mode if cred else "24_7", session
    )

    inbound = ConversationMessage(
        conversation_id=conversation.id,
        direction="inbound",
        sender="contact",
        content=text,
        external_message_id=external_message_id,
    )
    session.add(inbound)
    conversation.last_message_at = datetime.utcnow()
    session.add(conversation)
    session.commit()
    session.refresh(inbound)

    await manager.broadcast_to_user(
        owner_id,
        {"type": "message", "conversation_id": conversation.id, "message": inbound.model_dump(mode="json")},
    )
    activity_log_service.log(
        session, owner_id, "empresarial", "inbox.message_received",
        f"{contact.name} ({channel}) mandou uma mensagem",
    )
    owner_for_notify = session.get(User, owner_id)
    if owner_for_notify:
        notify(
            session, owner_for_notify, "inbox_new_message",
            email_subject="Nova mensagem no Inbox — DailyLoop",
            email_body=f"{contact.name} ({channel}) mandou: \"{text[:200]}\"",
        )

    if not conversation.ai_enabled:
        return

    if is_group:
        ai_settings = session.exec(select(BusinessAISettings).where(BusinessAISettings.owner_id == owner_id)).first()
        if not ai_settings or ai_settings.ignore_whatsapp_groups:
            logger.info("Mensagem de grupo ignorada pela IA (owner_id=%s)", owner_id)
            return

    owner = session.get(User, owner_id)
    reply_text = ai_service.answer_conversation(session, owner, conversation, text)

    outbound = ConversationMessage(conversation_id=conversation.id, direction="outbound", sender="ai", content=reply_text)
    session.add(outbound)
    conversation.last_message_at = datetime.utcnow()
    session.add(conversation)
    session.commit()
    session.refresh(outbound)

    if channel == "whatsapp":
        whatsapp_service.send_whatsapp_text(contact_external_id, reply_text)
    elif cred and cred.access_token_encrypted:
        token = crypto_service.decrypt(cred.access_token_encrypted)
        meta_messaging_service.send_meta_text(
            channel=channel, page_access_token=token, recipient_id=contact_external_id, body=reply_text
        )

    await manager.broadcast_to_user(
        owner_id,
        {"type": "message", "conversation_id": conversation.id, "message": outbound.model_dump(mode="json")},
    )
    activity_log_service.log(
        session, owner_id, "empresarial", "inbox.ai_replied", f"IA respondeu {contact.name} ({channel})"
    )


@router.post("/meta")
async def receive_webhook(request: Request, session: Session = Depends(get_session)):
    payload = await request.json()
    channel = OBJECT_TO_CHANNEL.get(payload.get("object", ""))
    if not channel:
        return {"status": "ignored"}

    for entry in payload.get("entry", []):
        entry_id = entry.get("id", "")
        cred = _resolve_credential(channel, entry_id, session)
        if not cred:
            logger.warning("Webhook %s recebido de conta não conectada (entry.id=%s)", channel, entry_id)
            continue

        if channel == "whatsapp":
            for change in entry.get("changes", []):
                value = change.get("value", {})
                names_by_wa_id = {
                    c.get("wa_id"): c.get("profile", {}).get("name", "") for c in value.get("contacts", [])
                }
                for msg in value.get("messages", []):
                    if msg.get("type") != "text":
                        continue
                    wa_id = msg.get("from", "")
                    text = msg.get("text", {}).get("body", "")
                    await _handle_inbound_message(
                        owner_id=cred.owner_id,
                        channel=channel,
                        contact_external_id=wa_id,
                        contact_name=names_by_wa_id.get(wa_id, wa_id),
                        text=text,
                        external_message_id=msg.get("id"),
                        session=session,
                        is_group=_is_group_message(msg),
                    )
        else:
            for messaging_event in entry.get("messaging", []):
                message = messaging_event.get("message", {})
                text = message.get("text", "")
                if not message or message.get("is_echo") or not text:
                    continue
                sender_id = messaging_event.get("sender", {}).get("id", "")
                await _handle_inbound_message(
                    owner_id=cred.owner_id,
                    channel=channel,
                    contact_external_id=sender_id,
                    contact_name=f"Lead {sender_id}",
                    text=text,
                    external_message_id=message.get("mid"),
                    session=session,
                )

    return {"status": "ok"}
