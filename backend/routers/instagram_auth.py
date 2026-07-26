import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from config import settings
from database import IntegrationCredential, User, get_session
from services import activity_log_service, crypto_service, instagram_oauth_service, instagram_sync_service
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

# channel → (realm, redirect de volta em caso de sucesso/erro) — mesma ideia do antigo
# meta_auth.py, agora contra o login direto do Instagram (ver services/instagram_oauth_service.py).
CHANNEL_CONFIG = {
    "instagram": {"realm": "empresarial", "frontend_path": "/integrations"},
    "instagram_personal": {"realm": "pessoal", "frontend_path": "/integracoes-pessoais"},
}


@router.get("/connect")
def start_connect(channel: str = Query(...), current_user: User = Depends(get_current_user)):
    if channel not in CHANNEL_CONFIG:
        raise HTTPException(status_code=400, detail=f"Canal inválido. Use um de: {list(CHANNEL_CONFIG)}")
    if not instagram_oauth_service.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Instagram ainda não configurado no servidor (INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET ausentes).",
        )
    realm = CHANNEL_CONFIG[channel]["realm"]
    state = instagram_oauth_service.create_state(current_user.id, realm, channel)
    return {"auth_url": instagram_oauth_service.build_auth_url(state)}


@router.get("/callback")
def oauth_callback(
    code: str = Query(default=""),
    state: str = Query(default=""),
    error: str = Query(default=""),
    session: Session = Depends(get_session),
):
    consumed = instagram_oauth_service.consume_state(state) if state else None
    if error or not code or not consumed:
        fallback = consumed[2] if consumed else "instagram"
        frontend_path = CHANNEL_CONFIG.get(fallback, CHANNEL_CONFIG["instagram"])["frontend_path"]
        return RedirectResponse(f"{settings.frontend_url}{frontend_path}?{fallback}=erro")

    user_id, realm, channel = consumed
    frontend_path = CHANNEL_CONFIG[channel]["frontend_path"]

    short_lived_token = instagram_oauth_service.exchange_code(code)
    long_lived_token = (
        instagram_oauth_service.exchange_long_lived_token(short_lived_token) if short_lived_token else None
    )
    if not long_lived_token:
        return RedirectResponse(f"{settings.frontend_url}{frontend_path}?{channel}=erro")

    profile = instagram_oauth_service.get_profile(long_lived_token)
    if not profile or not profile.get("user_id"):
        return RedirectResponse(f"{settings.frontend_url}{frontend_path}?{channel}=erro")

    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == user_id, IntegrationCredential.channel == channel
        )
    ).first()
    if not cred:
        cred = IntegrationCredential(owner_id=user_id, channel=channel)

    cred.external_account_id = str(profile["user_id"])
    cred.access_token_encrypted = crypto_service.encrypt(long_lived_token)
    cred.status = "connected"
    session.add(cred)
    session.commit()
    activity_log_service.log(
        session, user_id, realm, "integration.connected",
        f"Conectou Instagram ({'pessoal' if realm == 'pessoal' else 'empresarial'}) — @{profile.get('username', '')}",
    )

    if channel == "instagram":
        # Puxa o histórico de DMs existente na hora, em vez de esperar o próximo poll
        # agendado (ver services/instagram_sync_service.py — só o canal empresarial
        # alimenta o Inbox/CRM, "instagram_personal" não tem essa caixa).
        try:
            instagram_sync_service.sync_owner(user_id, session)
        except Exception:
            logger.exception("Falha ao sincronizar DMs do Instagram logo após conectar (owner_id=%s)", user_id)

    return RedirectResponse(f"{settings.frontend_url}{frontend_path}?{channel}=conectado")
