import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from config import settings
from database import IntegrationCredential, User, get_session
from services import activity_log_service, crypto_service, google_oauth_service
from services.auth_service import create_access_token, decode_user_id, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/google", tags=["google"])


@router.get("/connect")
def start_connect(current_user: User = Depends(get_current_user)):
    if not google_oauth_service.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Google ainda não configurado no servidor (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET ausentes).",
        )
    state = create_access_token(current_user.id, current_user.role)
    return {"auth_url": google_oauth_service.build_auth_url(state)}


@router.get("/callback")
def oauth_callback(
    code: str = Query(default=""),
    state: str = Query(default=""),
    error: str = Query(default=""),
    session: Session = Depends(get_session),
):
    frontend_base = settings.frontend_url

    if error or not code:
        return RedirectResponse(f"{frontend_base}/integrations?google=erro")

    user_id = decode_user_id(state)
    if not user_id:
        return RedirectResponse(f"{frontend_base}/integrations?google=erro")

    tokens = google_oauth_service.exchange_code(code)
    if not tokens:
        return RedirectResponse(f"{frontend_base}/integrations?google=erro")

    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == user_id, IntegrationCredential.channel == "google"
        )
    ).first()
    if not cred:
        cred = IntegrationCredential(owner_id=user_id, channel="google")

    cred.access_token_encrypted = crypto_service.encrypt(google_oauth_service.serialize_tokens(tokens))
    cred.external_account_id = "Google"
    cred.status = "connected"
    session.add(cred)
    session.commit()
    activity_log_service.log(session, user_id, "pessoal", "integration.connected", "Conectou Google (Calendar/Gmail/Fit)")

    return RedirectResponse(f"{frontend_base}/integracoes-pessoais?google=conectado")
