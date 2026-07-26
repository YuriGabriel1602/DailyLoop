"""Sincronização pull das DMs do Instagram (Conversations API, graph.instagram.com).

Existe porque o app ainda está "Não publicado" no Meta for Developers — webhooks só são
entregues pra apps publicados (`routers/webhooks.py` continua sendo o caminho oficial pro
dia em que o app for publicado, é só cadastrar a assinatura lá). Até isso acontecer, o poll
periódico (ver `services/scheduler_service.py`) é a única forma de trazer DM pro Inbox.

Só importa mensagens INBOUND (do contato pra nós): outbound já é gravado no momento do
envio (`routers/inbox.py`, `services/lead_inbound_service.py`), e a resposta da Conversations
API não carrega o `external_message_id` que aquele fluxo usa pra gravar — reimportar os dois
sentidos aqui duplicaria as respostas mandadas pelo próprio CRM."""

import logging

from sqlmodel import Session, select

from database import ConversationMessage, IntegrationCredential
from services import crypto_service, instagram_service
from services.connection_manager import manager
from services.lead_inbound_service import get_or_create_contact, get_or_create_conversation

logger = logging.getLogger(__name__)


def sync_owner(owner_id: int, session: Session) -> int:
    """Busca conversas+mensagens novas do Instagram pro dono da credencial e grava no
    Inbox/CRM. Retorna quantas mensagens novas foram importadas."""
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == owner_id,
            IntegrationCredential.channel == "instagram",
            IntegrationCredential.status == "connected",
        )
    ).first()
    if not cred or not cred.access_token_encrypted or not cred.external_account_id:
        return 0

    token = crypto_service.decrypt(cred.access_token_encrypted)
    my_ig_id = cred.external_account_id
    imported = 0

    for conv in instagram_service.list_conversations(token):
        participants = conv.get("participants", {}).get("data", [])
        other = next((p for p in participants if p.get("id") != my_ig_id), None)
        if not other or not other.get("id"):
            continue

        messages = sorted(
            instagram_service.get_conversation_messages(token, conv["id"]),
            key=lambda m: m.get("created_time", ""),
        )
        for msg in messages:
            msg_id = msg.get("id")
            text = (msg.get("message") or "").strip()
            sender_id = msg.get("from", {}).get("id", "")
            if sender_id != other["id"] or not text:
                continue  # não é do contato, ou é mídia sem legenda (mídia ainda não suportada aqui)
            if msg_id and session.exec(
                select(ConversationMessage).where(ConversationMessage.external_message_id == msg_id)
            ).first():
                continue

            contact = get_or_create_contact(
                owner_id, "instagram", other["id"], other.get("username", other["id"]), session
            )
            conversation = get_or_create_conversation(owner_id, contact, "instagram", cred.ai_default_mode, session)

            inbound = ConversationMessage(
                conversation_id=conversation.id,
                direction="inbound",
                sender="contact",
                content=text,
                external_message_id=msg_id,
            )
            session.add(inbound)
            conversation.last_message_at = inbound.created_at
            session.add(conversation)
            session.commit()
            session.refresh(inbound)

            manager.broadcast_to_user_from_thread(
                owner_id,
                {"type": "message", "conversation_id": conversation.id, "message": inbound.model_dump(mode="json")},
            )
            imported += 1

    if imported:
        logger.info("Instagram: %d mensagem(ns) nova(s) importada(s) (owner_id=%s).", imported, owner_id)
    return imported
