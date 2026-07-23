from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import IntegrationCredential, User, get_session
from services import crypto_service, github_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/github", tags=["github"])


def _get_token(current_user: User, session: Session) -> str:
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == current_user.id,
            IntegrationCredential.channel == "github",
            IntegrationCredential.status == "connected",
        )
    ).first()
    if not cred or not cred.access_token_encrypted:
        raise HTTPException(status_code=400, detail="GitHub não conectado. Adicione um token em Integrações.")
    return crypto_service.decrypt(cred.access_token_encrypted)


@router.get("/repos")
def list_repos(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    token = _get_token(current_user, session)
    return github_service.list_repos(token)


@router.get("/me")
def whoami(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    token = _get_token(current_user, session)
    login = github_service.get_authenticated_login(token)
    return {"login": login}
