import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from config import settings
from database import PasswordResetToken, User, get_session
from services.auth_service import (
    create_access_token,
    generate_reset_token,
    get_current_user,
    hash_password,
    verify_password,
)
from services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_public(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
    }


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


def _validate_email(email: str):
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Email inválido")


@router.post("/register")
def register(payload: RegisterRequest, session: Session = Depends(get_session)):
    _validate_email(payload.email)

    existing = session.exec(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.email)
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username ou email já cadastrado")

    is_first_user = session.exec(select(User)).first() is None
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="admin" if is_first_user else "user",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer", "user": _user_public(user)}


@router.post("/login")
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(
            (User.username == payload.username_or_email)
            | (User.email == payload.username_or_email)
        )
    ).first()

    invalid = HTTPException(status_code=401, detail="Usuário/email ou senha incorretos")
    if not user or not verify_password(payload.password, user.hashed_password):
        raise invalid
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desativada")

    token = create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer", "user": _user_public(user)}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_public(current_user)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if user:
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
        if not sent:
            # SMTP não configurado (modo dev): loga o link pra não travar o teste do fluxo.
            logger.info("Link de redefinição (SMTP não configurado): %s", reset_link)

    # Resposta genérica sempre igual, exista ou não o email — evita confirmar quais
    # emails estão cadastrados.
    return {"message": "Se o email existir, enviaremos um link de redefinição."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, session: Session = Depends(get_session)):
    reset_token = session.exec(
        select(PasswordResetToken).where(PasswordResetToken.token == payload.token)
    ).first()

    invalid = HTTPException(status_code=400, detail="Token inválido ou expirado")
    if not reset_token or reset_token.used:
        raise invalid
    if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise invalid

    user = session.get(User, reset_token.user_id)
    if not user:
        raise invalid

    user.hashed_password = hash_password(payload.new_password)
    reset_token.used = True
    session.add(user)
    session.add(reset_token)
    session.commit()
    return {"message": "Senha redefinida com sucesso."}
