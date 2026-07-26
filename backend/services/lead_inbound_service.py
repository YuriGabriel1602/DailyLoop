"""Ingestão de mensagens do Inbox/CRM Empresarial — ponto único usado tanto pelo
webhook oficial da Meta (`routers/webhooks.py`) quanto pelo WhatsApp Business via QR
Code (`routers/whatsapp_business.py`), pra leads caírem sempre no mesmo lugar
(Contact/Conversation/ConversationMessage) não importa o transporte de origem."""

import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from config import settings
from database import BusinessAISettings, Contact, Conversation, ConversationMessage, IntegrationCredential, User
from services import activity_log_service, ai_service, media_service, whatsapp_service
from services.connection_manager import manager
from services.notification_service import notify

logger = logging.getLogger(__name__)


def get_or_create_contact(
    owner_id: int,
    channel: str,
    external_id: str,
    name: str,
    session: Session,
    *,
    whatsapp_jid: Optional[str] = None,
) -> Contact:
    contact = session.exec(
        select(Contact).where(
            Contact.owner_id == owner_id, Contact.channel == channel, Contact.external_id == external_id
        )
    ).first()
    if contact:
        changed = False
        if whatsapp_jid and contact.whatsapp_jid != whatsapp_jid:
            contact.whatsapp_jid = whatsapp_jid
            changed = True
        if name and contact.name == external_id and name != external_id:
            contact.name = name
            changed = True
        if changed:
            session.add(contact)
            session.commit()
            session.refresh(contact)
        return contact
    contact = Contact(
        owner_id=owner_id, channel=channel, external_id=external_id, name=name or external_id, whatsapp_jid=whatsapp_jid
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


def get_or_create_conversation(
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


async def record_message(
    *,
    owner_id: int,
    channel: str,
    contact_external_id: str,
    contact_name: str,
    text: str,
    direction: str,
    sender: str,
    external_message_id: Optional[str],
    session: Session,
    whatsapp_jid: Optional[str] = None,
    message_type: str = "text",
    media_base64: Optional[str] = None,
    media_mime: Optional[str] = None,
    created_at: Optional[datetime] = None,
    broadcast: bool = True,
) -> tuple[Contact, Conversation, ConversationMessage]:
    """Grava uma mensagem (qualquer direção) e garante contato/conversa — usado tanto
    pra inbound ao vivo quanto pro backfill de histórico (que traz os dois sentidos)."""
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == owner_id, IntegrationCredential.channel == channel
        )
    ).first()
    contact = get_or_create_contact(
        owner_id, channel, contact_external_id, contact_name, session, whatsapp_jid=whatsapp_jid
    )
    conversation = get_or_create_conversation(
        owner_id, contact, channel, cred.ai_default_mode if cred else "24_7", session
    )

    media_path = None
    if media_base64 and message_type == "image":
        try:
            media_path = media_service.save_media(
                settings.whatsapp_business_media_dir, owner_id, media_base64, media_mime or "image/jpeg"
            )
        except Exception:
            logger.exception("Falha ao salvar mídia do Inbox")
            message_type = "unsupported"
            text = text or "📎 Não foi possível salvar a mídia recebida"

    kwargs = dict(
        conversation_id=conversation.id,
        direction=direction,
        sender=sender,
        content=text,
        external_message_id=external_message_id,
        message_type=message_type,
        media_path=media_path,
        media_mime=media_mime if media_path else None,
    )
    if created_at is not None:
        kwargs["created_at"] = created_at

    message = ConversationMessage(**kwargs)
    session.add(message)
    conversation.last_message_at = message.created_at
    session.add(conversation)
    session.commit()
    session.refresh(message)

    if broadcast:
        await manager.broadcast_to_user(
            owner_id,
            {"type": "message", "conversation_id": conversation.id, "message": message.model_dump(mode="json")},
        )
    return contact, conversation, message


async def handle_inbound_message(
    *,
    owner_id: int,
    channel: str,
    contact_external_id: str,
    contact_name: str,
    text: str,
    external_message_id: Optional[str],
    session: Session,
    is_group: bool = False,
    whatsapp_jid: Optional[str] = None,
    message_type: str = "text",
    media_base64: Optional[str] = None,
    media_mime: Optional[str] = None,
):
    """Mensagem inbound AO VIVO — grava e, se a IA estiver ligada nessa conversa,
    responde na hora. Não usar pra backfill de histórico (`record_message` direto,
    sem gatilho de IA) — mensagens antigas não devem gerar resposta automática."""
    contact, conversation, inbound = await record_message(
        owner_id=owner_id,
        channel=channel,
        contact_external_id=contact_external_id,
        contact_name=contact_name,
        text=text,
        direction="inbound",
        sender="contact",
        external_message_id=external_message_id,
        session=session,
        whatsapp_jid=whatsapp_jid,
        message_type=message_type,
        media_base64=media_base64,
        media_mime=media_mime,
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

    whatsapp_service.send_business_message(owner_id, channel, contact, reply_text, session)

    await manager.broadcast_to_user(
        owner_id,
        {"type": "message", "conversation_id": conversation.id, "message": outbound.model_dump(mode="json")},
    )
    activity_log_service.log(
        session, owner_id, "empresarial", "inbox.ai_replied", f"IA respondeu {contact.name} ({channel})"
    )
