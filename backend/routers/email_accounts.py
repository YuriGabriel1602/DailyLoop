from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import EmailAccount, User, get_session
from services import activity_log_service, crypto_service, email_account_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/email-accounts", tags=["email-accounts"])


class EmailAccountCreate(BaseModel):
    email_address: str
    imap_host: str
    imap_port: int = 993
    smtp_host: str
    smtp_port: int = 587
    password: str


def _public(account: EmailAccount) -> dict:
    return {
        "id": account.id,
        "email_address": account.email_address,
        "imap_host": account.imap_host,
        "imap_port": account.imap_port,
        "smtp_host": account.smtp_host,
        "smtp_port": account.smtp_port,
        "status": account.status,
        "last_synced_at": account.last_synced_at,
    }


@router.get("")
def get_email_account(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    account = session.exec(select(EmailAccount).where(EmailAccount.owner_id == current_user.id)).first()
    return _public(account) if account else None


@router.post("")
def connect_email_account(
    payload: EmailAccountCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        email_account_service.test_connection(payload.imap_host, payload.imap_port, payload.email_address, payload.password)
    except email_account_service.EmailConnectionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    account = session.exec(select(EmailAccount).where(EmailAccount.owner_id == current_user.id)).first()
    if not account:
        account = EmailAccount(owner_id=current_user.id, email_address="", imap_host="", smtp_host="", password_encrypted="")

    account.email_address = payload.email_address
    account.imap_host = payload.imap_host
    account.imap_port = payload.imap_port
    account.smtp_host = payload.smtp_host
    account.smtp_port = payload.smtp_port
    account.password_encrypted = crypto_service.encrypt(payload.password)
    account.status = "connected"
    session.add(account)
    session.commit()
    session.refresh(account)
    activity_log_service.log(session, current_user.id, "empresarial", "integration.connected", f"Conectou o email {payload.email_address}")
    return _public(account)


@router.delete("")
def disconnect_email_account(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    account = session.exec(select(EmailAccount).where(EmailAccount.owner_id == current_user.id)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Nenhuma conta de email conectada")
    account.status = "disconnected"
    account.password_encrypted = ""
    session.add(account)
    session.commit()
    activity_log_service.log(session, current_user.id, "empresarial", "integration.disconnected", f"Desconectou o email {account.email_address}")
    return _public(account)
