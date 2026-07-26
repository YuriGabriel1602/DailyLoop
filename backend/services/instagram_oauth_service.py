"""Login direto do Instagram (produto "API do Instagram com login do Instagram" no Meta
for Developers) — diferente do antigo login via Página do Facebook
(`meta_oauth_service.py`, que usava graph.facebook.com e permissões
instagram_basic/instagram_manage_messages, hoje sem cobertura de mensagens nesse app).
Esse fluxo usa credenciais próprias (Instagram App ID/Secret, distintas do App ID/Secret
do Facebook) e os hosts instagram.com/api.instagram.com/graph.instagram.com."""

import logging
import secrets
import time
from urllib.parse import urlencode

import httpx

from config import settings

logger = logging.getLogger(__name__)

AUTH_ENDPOINT = "https://www.instagram.com/oauth/authorize"
TOKEN_ENDPOINT = "https://api.instagram.com/oauth/access_token"
LONG_LIVED_ENDPOINT = "https://graph.instagram.com/access_token"
GRAPH_API_VERSION = "v21.0"

# Mínimo necessário pra ler o perfil e trocar DMs — instagram_business_manage_comments
# fica de fora de propósito (não mexemos em comentário, só mensagem direta).
SCOPES = ["instagram_business_basic", "instagram_business_manage_messages"]

_pending_states: dict[str, tuple[int, str, str, float]] = {}
STATE_EXPIRE_SECONDS = 600


def is_configured() -> bool:
    return bool(settings.instagram_app_id and settings.instagram_app_secret and settings.instagram_redirect_uri)


def create_state(user_id: int, realm: str, channel: str) -> str:
    now = time.time()
    for expired_nonce in [nonce for nonce, (_, _, _, expires_at) in _pending_states.items() if expires_at < now]:
        _pending_states.pop(expired_nonce, None)
    nonce = secrets.token_urlsafe(32)
    _pending_states[nonce] = (user_id, realm, channel, now + STATE_EXPIRE_SECONDS)
    return nonce


def consume_state(nonce: str) -> tuple[int, str, str] | None:
    entry = _pending_states.pop(nonce, None)
    if not entry:
        return None
    user_id, realm, channel, expires_at = entry
    if time.time() > expires_at:
        return None
    return user_id, realm, channel


def build_auth_url(state: str) -> str:
    params = {
        "force_reauth": "true",
        "client_id": settings.instagram_app_id,
        "redirect_uri": settings.instagram_redirect_uri,
        "response_type": "code",
        "scope": ",".join(SCOPES),
        "state": state,
    }
    return f"{AUTH_ENDPOINT}?{urlencode(params)}"


def exchange_code(code: str) -> str | None:
    """Troca o `code` do redirect por um access_token de curta duração (~1h)."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                TOKEN_ENDPOINT,
                data={
                    "client_id": settings.instagram_app_id,
                    "client_secret": settings.instagram_app_secret,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.instagram_redirect_uri,
                    "code": code,
                },
            )
            if response.status_code >= 400:
                logger.error("Instagram recusou a troca do code: %s", response.text)
                return None
            return response.json().get("access_token")
    except Exception:
        logger.exception("Falha ao trocar o code do Instagram por um access_token")
        return None


def exchange_long_lived_token(short_lived_token: str) -> str | None:
    """Troca um access_token de curta duração por um de ~60 dias."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                LONG_LIVED_ENDPOINT,
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": settings.instagram_app_secret,
                    "access_token": short_lived_token,
                },
            )
            if response.status_code >= 400:
                logger.error("Instagram recusou a troca pelo token de longa duração: %s", response.text)
                return None
            return response.json().get("access_token")
    except Exception:
        logger.exception("Falha ao trocar o token de longa duração do Instagram")
        return None


def get_profile(access_token: str) -> dict | None:
    """Perfil da conta Instagram Profissional dona do token — `user_id` é o identificador
    a usar como `IntegrationCredential.external_account_id` e como remetente/destinatário
    nas chamadas de mensagem."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"https://graph.instagram.com/{GRAPH_API_VERSION}/me",
                params={"fields": "user_id,username,account_type", "access_token": access_token},
            )
            if response.status_code >= 400:
                logger.error("Falha ao buscar perfil do Instagram: %s", response.text)
                return None
            return response.json()
    except Exception:
        logger.exception("Falha ao buscar perfil do Instagram")
        return None
