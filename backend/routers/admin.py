from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from config import settings
from database import PasswordResetToken, User, get_session
from services.auth_service import generate_reset_token, require_admin
from services.email_service import send_password_reset_email

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _user_public(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
    }


@router.get("/users")
def list_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return [_user_public(u) for u in users]


class UserPatch(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.patch("/users/{user_id}")
def update_user(user_id: int, patch: UserPatch, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if patch.role is not None:
        if patch.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="role precisa ser 'user' ou 'admin'")
        user.role = patch.role
    if patch.is_active is not None:
        user.is_active = patch.is_active
    session.add(user)
    session.commit()
    session.refresh(user)
    return _user_public(user)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    session.delete(user)
    session.commit()
    return {"status": "deleted"}


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    token_value = generate_reset_token()
    session.add(
        PasswordResetToken(
            user_id=user.id,
            token=token_value,
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.password_reset_token_expire_minutes),
        )
    )
    session.commit()
    reset_link = f"{settings.frontend_url}/reset-password/{token_value}"
    sent = send_password_reset_email(user.email, reset_link)
    return {"message": "Link de redefinição gerado.", "email_sent": sent}


@router.get("/logs")
def get_logs(lines: int = 200):
    if not settings.log_file.exists():
        return {"lines": []}
    with settings.log_file.open("r", encoding="utf-8", errors="replace") as f:
        all_lines = f.readlines()
    return {"lines": [line.rstrip("\n") for line in all_lines[-lines:]]}
