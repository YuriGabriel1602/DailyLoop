import json
import logging
import secrets
import time
from urllib.parse import urlencode

import httpx
from sqlmodel import Session, select

from config import settings
from database import IntegrationCredential, User
from services import crypto_service

logger = logging.getLogger(__name__)

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

# Somente leitura — Agenda Viva, Gmail (varredura de vida-admin) e Google Fit (resumo diário).
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/fitness.activity.read",
]

# Nonce de uso único pro parâmetro `state` do OAuth — em memória (processo único),
# igual ao `connection_manager` de WebSocket. Evita reaproveitar o JWT de sessão
# como `state`, que ficaria de 7 dias exposto na URL de callback (logs de acesso,
# histórico do navegador) em vez de expirar em minutos e morrer no primeiro uso.
_pending_states: dict[str, tuple[int, float]] = {}
STATE_EXPIRE_SECONDS = 600


def create_state(user_id: int) -> str:
    now = time.time()
    for expired_nonce in [nonce for nonce, (_, expires_at) in _pending_states.items() if expires_at < now]:
        _pending_states.pop(expired_nonce, None)
    nonce = secrets.token_urlsafe(32)
    _pending_states[nonce] = (user_id, now + STATE_EXPIRE_SECONDS)
    return nonce


def consume_state(nonce: str) -> int | None:
    """Consome (uso único) o nonce de `state` do OAuth Google — None se não existir,
    já foi usado, ou expirou (10 min)."""
    entry = _pending_states.pop(nonce, None)
    if not entry:
        return None
    user_id, expires_at = entry
    if time.time() > expires_at:
        return None
    return user_id


def is_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def build_auth_url(state: str) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",  # garante refresh_token mesmo em reconexões
        "state": state,
    }
    return f"{AUTH_ENDPOINT}?{urlencode(params)}"


def exchange_code(code: str) -> dict | None:
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if response.status_code >= 400:
                logger.error("Google recusou a troca do code: %s", response.text)
                return None
            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expires_at": time.time() + data.get("expires_in", 3600),
            }
    except Exception:
        logger.exception("Falha ao trocar o code do Google por tokens")
        return None


def refresh_access_token(refresh_token: str) -> dict | None:
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                TOKEN_ENDPOINT,
                data={
                    "refresh_token": refresh_token,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            if response.status_code >= 400:
                logger.error("Falha ao renovar token do Google: %s", response.text)
                return None
            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": refresh_token,  # Google não reemite o refresh_token
                "expires_at": time.time() + data.get("expires_in", 3600),
            }
    except Exception:
        logger.exception("Falha ao renovar token do Google")
        return None


def serialize_tokens(tokens: dict) -> str:
    return json.dumps(tokens)


def deserialize_tokens(blob: str) -> dict | None:
    try:
        return json.loads(blob)
    except (ValueError, TypeError):
        return None


def get_valid_access_token(session: Session, user: User) -> str | None:
    """Devolve um access_token válido pro Google, renovando via refresh_token se
    tiver expirado (e salvando o token renovado de volta). None se não conectado
    ou se a renovação falhar — cada router decide como degradar a partir daí."""
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == user.id,
            IntegrationCredential.channel == "google",
            IntegrationCredential.status == "connected",
        )
    ).first()
    if not cred or not cred.access_token_encrypted:
        return None

    tokens = deserialize_tokens(crypto_service.decrypt(cred.access_token_encrypted))
    if not tokens:
        return None

    if tokens.get("expires_at", 0) > time.time() + 60:
        return tokens["access_token"]

    if not tokens.get("refresh_token"):
        return None

    refreshed = refresh_access_token(tokens["refresh_token"])
    if not refreshed:
        return None

    cred.access_token_encrypted = crypto_service.encrypt(serialize_tokens(refreshed))
    session.add(cred)
    session.commit()
    return refreshed["access_token"]
