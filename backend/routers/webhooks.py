import hashlib
import hmac
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlmodel import Session, select

from config import settings
from database import IntegrationCredential, get_session
from services.lead_inbound_service import handle_inbound_message

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


def _verify_meta_signature(raw_body: bytes, signature_header: str) -> bool:
    """Confere o HMAC-SHA256 do corpo bruto contra o header `X-Hub-Signature-256`,
    provando que o payload veio mesmo da Meta (e não foi forjado por quem descobrir
    o WABA ID/Page ID, que não são segredo) — exigido pela Meta pra todo webhook."""
    if not settings.meta_app_secret:
        logger.warning("META_APP_SECRET não configurado — rejeitando webhook (configure-o pra habilitar o recebimento).")
        return False
    if not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(settings.meta_app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    provided = signature_header[len("sha256="):]
    return hmac.compare_digest(expected, provided)


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


@router.post("/meta")
async def receive_webhook(request: Request, session: Session = Depends(get_session)):
    raw_body = await request.body()
    if not _verify_meta_signature(raw_body, request.headers.get("x-hub-signature-256", "")):
        logger.warning("Webhook Meta rejeitado: assinatura ausente ou inválida.")
        return Response(status_code=403)

    payload = json.loads(raw_body)
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

                # O WABA ID (entry.id, usado acima só pra achar a credencial certa) não é
                # suficiente pra ENVIAR — precisa do phone_number_id do número de verdade,
                # que só vem no payload de cada mensagem recebida. Guarda na primeira vez.
                metadata_phone_id = value.get("metadata", {}).get("phone_number_id", "")
                if metadata_phone_id and cred.phone_number_id != metadata_phone_id:
                    cred.phone_number_id = metadata_phone_id
                    session.add(cred)
                    session.commit()

                names_by_wa_id = {
                    c.get("wa_id"): c.get("profile", {}).get("name", "") for c in value.get("contacts", [])
                }
                for msg in value.get("messages", []):
                    if msg.get("type") != "text":
                        continue
                    wa_id = msg.get("from", "")
                    text = msg.get("text", {}).get("body", "")
                    await handle_inbound_message(
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
                await handle_inbound_message(
                    owner_id=cred.owner_id,
                    channel=channel,
                    contact_external_id=sender_id,
                    contact_name=f"Lead {sender_id}",
                    text=text,
                    external_message_id=message.get("mid"),
                    session=session,
                )

    return {"status": "ok"}
