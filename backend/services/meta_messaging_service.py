import logging

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v20.0"


def send_meta_text(*, channel: str, page_access_token: str, recipient_id: str, body: str) -> bool:
    """Envia texto livre via Graph API para Instagram DM ou Messenger — mesmo endpoint
    e formato pros dois canais, muda só o token da página/conta usada.
    `page_access_token` vem descriptografado de `IntegrationCredential` (ver crypto_service)."""
    if not page_access_token or not recipient_id:
        logger.warning("Integração %s sem token/destinatário — mensagem não enviada.", channel)
        return False

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/me/messages"
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": body},
    }
    params = {"access_token": page_access_token}

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, json=payload, params=params)
        if response.status_code >= 400:
            logger.error("Meta (%s) recusou a mensagem para %s: %s", channel, recipient_id, response.text)
            return False
        return True
    except Exception:
        logger.exception("Falha ao enviar mensagem via %s para %s", channel, recipient_id)
        return False
