from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import IntegrationCredential, User, get_session
from services import crypto_service, whatsapp_template_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/whatsapp-templates", tags=["whatsapp-templates"])


class TemplateCreate(BaseModel):
    name: str
    category: str  # MARKETING, UTILITY, AUTHENTICATION
    language: str
    body_text: str


def _connected_waba_credential(current_user: User, session: Session) -> IntegrationCredential:
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == current_user.id,
            IntegrationCredential.channel == "whatsapp",
            IntegrationCredential.status == "connected",
        )
    ).first()
    if not cred or not cred.external_account_id:
        raise HTTPException(status_code=400, detail="Conecte uma WABA em Integrações antes de gerenciar templates.")
    return cred


@router.get("")
def list_templates(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    cred = _connected_waba_credential(current_user, session)
    token = crypto_service.decrypt(cred.access_token_encrypted)
    return whatsapp_template_service.list_templates(cred.external_account_id, token)


@router.post("")
def create_template(
    payload: TemplateCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cred = _connected_waba_credential(current_user, session)
    token = crypto_service.decrypt(cred.access_token_encrypted)
    result = whatsapp_template_service.create_template(
        cred.external_account_id,
        token,
        name=payload.name,
        category=payload.category,
        language=payload.language,
        body_text=payload.body_text,
    )
    if not result:
        raise HTTPException(status_code=400, detail="A Meta recusou a criação desse template.")
    return result


@router.delete("/{name}")
def delete_template(
    name: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cred = _connected_waba_credential(current_user, session)
    token = crypto_service.decrypt(cred.access_token_encrypted)
    if not whatsapp_template_service.delete_template(cred.external_account_id, token, name):
        raise HTTPException(status_code=400, detail="Não foi possível apagar esse template.")
    return {"status": "deleted"}
