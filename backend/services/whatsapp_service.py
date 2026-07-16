import logging

import httpx

from config import settings

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
