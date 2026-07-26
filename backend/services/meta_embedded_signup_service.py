import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

TOKEN_ENDPOINT = "https://graph.facebook.com/v20.0/oauth/access_token"


def exchange_embedded_signup_code(code: str) -> str | None:
    """Troca o `code` devolvido pelo SDK JS do Embedded Signup por um token de negócio
    (escopos whatsapp_business_management/whatsapp_business_messaging). Diferente do OAuth
    por redirect (Fase 1) — o Embedded Signup roda via `FB.login` no navegador e não usa
    `redirect_uri` nessa troca."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                TOKEN_ENDPOINT,
                params={
                    "client_id": settings.meta_app_id,
                    "client_secret": settings.meta_app_secret,
                    "code": code,
                },
            )
            if response.status_code >= 400:
                logger.error("Meta recusou a troca do code do Embedded Signup: %s", response.text)
                return None
            return response.json().get("access_token")
    except Exception:
        logger.exception("Falha ao trocar o code do Embedded Signup por um access_token")
        return None


def subscribe_app_to_waba(waba_id: str, access_token: str) -> bool:
    """Inscreve o app da Meta pra receber webhooks dessa WABA — sem isso, a Meta nunca
    manda nenhum evento pro endpoint de webhook, mesmo com tudo certo do lado de vocês."""
    url = f"https://graph.facebook.com/{settings.meta_graph_api_version}/{waba_id}/subscribed_apps"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, params={"access_token": access_token})
        if response.status_code >= 400:
            logger.error("Falha ao inscrever o app na WABA %s: %s", waba_id, response.text)
            return False
        return True
    except Exception:
        logger.exception("Falha ao inscrever o app na WABA %s", waba_id)
        return False


def get_phone_number_details(phone_number_id: str, access_token: str) -> dict | None:
    """Detalhes cosméticos do número (nome verificado, telefone formatado) pra exibir na UI."""
    url = f"https://graph.facebook.com/{settings.meta_graph_api_version}/{phone_number_id}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                url, params={"fields": "display_phone_number,verified_name", "access_token": access_token}
            )
        if response.status_code >= 400:
            logger.error("Falha ao buscar detalhes do número %s: %s", phone_number_id, response.text)
            return None
        return response.json()
    except Exception:
        logger.exception("Falha ao buscar detalhes do número %s", phone_number_id)
        return None
