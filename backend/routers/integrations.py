from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import IntegrationCredential, User, get_session
from services import activity_log_service, crypto_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

BUSINESS_CHANNELS = ["whatsapp", "instagram", "facebook", "github", "openai", "anthropic"]
PERSONAL_CHANNELS = ["google", "open_finance", "whatsapp_personal"]
CHANNELS = BUSINESS_CHANNELS + PERSONAL_CHANNELS


def _realm_for(channel: str) -> str:
    return "empresarial" if channel in BUSINESS_CHANNELS else "pessoal"


class ConnectRequest(BaseModel):
    external_account_id: str
    access_token: str


class AiModeUpdate(BaseModel):
    ai_default_mode: str  # 24_7, off


def _public(cred: IntegrationCredential) -> dict:
    return {
        "id": cred.id,
        "channel": cred.channel,
        "external_account_id": cred.external_account_id,
        "status": cred.status,
        "ai_default_mode": cred.ai_default_mode,
        "created_at": cred.created_at,
    }


def _get_or_create(channel: str, current_user: User, session: Session) -> IntegrationCredential:
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == current_user.id,
            IntegrationCredential.channel == channel,
        )
    ).first()
    if not cred:
        cred = IntegrationCredential(owner_id=current_user.id, channel=channel)
        session.add(cred)
        session.commit()
        session.refresh(cred)
    return cred


def _validate_channel(channel: str):
    if channel not in CHANNELS:
        raise HTTPException(status_code=400, detail=f"Canal inválido. Use um de: {CHANNELS}")


@router.get("")
def list_integrations(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    existing = {
        cred.channel: cred
        for cred in session.exec(
            select(IntegrationCredential).where(IntegrationCredential.owner_id == current_user.id)
        ).all()
    }
    return [
        _public(existing[channel]) if channel in existing else _public(
            IntegrationCredential(channel=channel, owner_id=current_user.id)
        )
        for channel in CHANNELS
    ]


@router.post("/{channel}/connect")
def connect_channel(
    channel: str,
    payload: ConnectRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _validate_channel(channel)
    cred = _get_or_create(channel, current_user, session)
    cred.external_account_id = payload.external_account_id
    cred.access_token_encrypted = crypto_service.encrypt(payload.access_token)
    cred.status = "connected"
    session.add(cred)
    session.commit()
    session.refresh(cred)
    activity_log_service.log(session, current_user.id, _realm_for(channel), "integration.connected", f"Conectou {channel}")
    return _public(cred)


@router.post("/{channel}/disconnect")
def disconnect_channel(
    channel: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _validate_channel(channel)
    cred = _get_or_create(channel, current_user, session)
    cred.status = "disconnected"
    cred.access_token_encrypted = ""
    cred.external_account_id = ""
    session.add(cred)
    session.commit()
    session.refresh(cred)
    activity_log_service.log(session, current_user.id, _realm_for(channel), "integration.disconnected", f"Desconectou {channel}")
    return _public(cred)


@router.patch("/{channel}")
def update_ai_mode(
    channel: str,
    payload: AiModeUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _validate_channel(channel)
    if payload.ai_default_mode not in ("24_7", "off"):
        raise HTTPException(status_code=400, detail="ai_default_mode deve ser '24_7' ou 'off'")
    cred = _get_or_create(channel, current_user, session)
    cred.ai_default_mode = payload.ai_default_mode
    session.add(cred)
    session.commit()
    session.refresh(cred)
    return _public(cred)
