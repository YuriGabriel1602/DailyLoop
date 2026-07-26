import logging
from typing import TYPE_CHECKING, Optional

import httpx
from sqlmodel import Session, select

from config import settings
from database import IntegrationCredential
from services import crypto_service, instagram_service, meta_messaging_service

if TYPE_CHECKING:
    from database import Contact

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.whatsapp_access_token and settings.whatsapp_phone_number_id)


def send_whatsapp_template(to: str, template_name: str, body_params: list[str]) -> bool:
    """Envia uma mensagem de template aprovado via WhatsApp Business Cloud API.

    `to` deve estar em E.164 (ex: +5511999999999). `body_params` preenche as
    variáveis {{1}}, {{2}}... do corpo do template, na ordem.
    Retorna False (sem lançar erro) se não configurado ou se a Meta recusar —
    quem chama decide o fallback (ex: email)."""
    if not _is_configured():
        logger.warning("WhatsApp não configurado — mensagem '%s' para %s não foi enviada.", template_name, to)
        return False

    url = (
        f"https://graph.facebook.com/{settings.whatsapp_api_version}/"
        f"{settings.whatsapp_phone_number_id}/messages"
    )
    payload = {
        "messaging_product": "whatsapp",
        "to": to.lstrip("+"),
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": settings.whatsapp_template_language},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": str(p)} for p in body_params],
                }
            ]
            if body_params
            else [],
        },
    }
    headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}", "Content-Type": "application/json"}

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            logger.error("WhatsApp recusou a mensagem '%s' para %s: %s", template_name, to, response.text)
            return False
        return True
    except Exception:
        logger.exception("Falha ao enviar WhatsApp '%s' para %s", template_name, to)
        return False


def send_whatsapp_text(to: str, body: str, *, access_token: str, phone_number_id: str) -> bool:
    """Envia texto livre via WhatsApp Business Cloud API, usando o token e o
    phone_number_id do WhatsApp CONECTADO pelo dono do negócio (`IntegrationCredential`
    channel="whatsapp") — nunca o número global de plataforma de `settings.whatsapp_*`,
    que é só pro DailyLoop notificar os próprios usuários do app (senha, lembretes etc,
    via `send_whatsapp_template`). Só funciona dentro da janela de 24h de uma conversa
    iniciada pelo contato (regra da Meta) — para iniciar contato fora dessa janela é
    obrigatório usar um template aprovado."""
    if not access_token or not phone_number_id:
        logger.warning(
            "WhatsApp do negócio não conectado (falta token ou phone_number_id) — texto para %s não foi enviado.", to
        )
        return False

    url = f"https://graph.facebook.com/{settings.whatsapp_api_version}/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to.lstrip("+"),
        "type": "text",
        "text": {"body": body},
    }
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            logger.error("WhatsApp recusou o texto livre para %s: %s", to, response.text)
            return False
        return True
    except Exception:
        logger.exception("Falha ao enviar texto livre WhatsApp para %s", to)
        return False


def _send_whatsapp_qr(owner_id: int, jid: str, content: str, image_base64: Optional[str], mime_type: Optional[str]) -> bool:
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{owner_id}/business/send",
                headers={"X-Sidecar-Secret": settings.sidecar_shared_secret},
                json={
                    "jid": jid,
                    "text": content if not image_base64 else None,
                    "image_base64": image_base64,
                    "mime_type": mime_type,
                    "caption": content if image_base64 else None,
                },
            )
        return response.status_code < 400
    except httpx.RequestError:
        logger.exception("Falha ao contatar o sidecar pra enviar mensagem de WhatsApp Business (owner_id=%s)", owner_id)
        return False


def send_business_message(
    owner_id: int,
    channel: str,
    contact: "Contact",
    content: str,
    session: Session,
    *,
    image_base64: Optional[str] = None,
    mime_type: Optional[str] = None,
) -> bool:
    """Único lugar que decide COMO uma resposta do Inbox/CRM sai de verdade —
    WhatsApp Cloud API oficial, WhatsApp via QR Code (sidecar Baileys) ou Meta
    genérico (Instagram/Facebook). Usado por `routers/inbox.py` (resposta manual),
    `services/scheduler_service.py` (watchdog) e `services/lead_inbound_service.py`
    (resposta automática da IA) — nenhum dos três decide o transporte por conta própria."""
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == owner_id, IntegrationCredential.channel == channel
        )
    ).first()

    if channel == "whatsapp":
        if cred and cred.connection_mode == "qr":
            jid = contact.whatsapp_jid or f"{contact.external_id}@s.whatsapp.net"
            return _send_whatsapp_qr(owner_id, jid, content, image_base64, mime_type)
        if not cred or not cred.access_token_encrypted or not cred.phone_number_id:
            return False
        if image_base64:
            logger.warning("Envio de imagem pela Cloud API oficial ainda não suportado — mensagem não enviada.")
            return False
        token = crypto_service.decrypt(cred.access_token_encrypted)
        return send_whatsapp_text(contact.external_id, content, access_token=token, phone_number_id=cred.phone_number_id)

    if not cred or not cred.access_token_encrypted:
        return False
    token = crypto_service.decrypt(cred.access_token_encrypted)

    if channel == "instagram":
        # Login direto do Instagram (graph.instagram.com) — não é mais um token de
        # Página do Facebook, por isso não passa por meta_messaging_service.
        return instagram_service.send_instagram_text(token, contact.external_id, content)

    return meta_messaging_service.send_meta_text(
        channel=channel, page_access_token=token, recipient_id=contact.external_id, body=content
    )
