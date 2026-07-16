import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from config import settings
from database import PasswordResetToken, PhoneVerificationCode, User, get_session
from services.auth_service import (
    create_access_token,
    generate_reset_token,
    get_current_user,
    hash_password,
    verify_password,
)
from services.notification_service import notify
from services.whatsapp_service import send_whatsapp_template

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_public(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "phone_number": user.phone_number,
        "phone_verified": user.phone_verified,
        "whatsapp_opted_in": user.whatsapp_opted_in,
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


class ProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    whatsapp_opted_in: Optional[bool] = None


@router.patch("/me")
def update_me(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if payload.phone_number is not None and not payload.phone_number.strip():
        # Só permite LIMPAR o telefone por aqui — cadastrar um número novo
        # passa obrigatoriamente pelo fluxo de verificação (/phone/request-code).
        current_user.phone_number = None
        current_user.phone_verified = False
        current_user.whatsapp_opted_in = False
    if payload.whatsapp_opted_in is not None:
        if payload.whatsapp_opted_in and not current_user.phone_verified:
            raise HTTPException(status_code=400, detail="Verifique seu telefone antes de ativar o WhatsApp")
        current_user.whatsapp_opted_in = payload.whatsapp_opted_in
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return _user_public(current_user)


def _normalize_e164(phone_number: str) -> str:
    phone = phone_number.strip()
    if not phone.startswith("+"):
        raise HTTPException(status_code=400, detail="Telefone deve estar no formato E.164 (ex: +5511999999999)")
    return phone


class PhoneRequestCodeRequest(BaseModel):
    phone_number: str


@router.post("/phone/request-code")
def request_phone_code(
    payload: PhoneRequestCodeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    phone = _normalize_e164(payload.phone_number)

    recent = session.exec(
        select(PhoneVerificationCode)
        .where(PhoneVerificationCode.user_id == current_user.id)
        .order_by(PhoneVerificationCode.created_at.desc())
    ).first()
    if recent and recent.created_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc) - timedelta(
        seconds=settings.phone_verification_resend_cooldown_seconds
    ):
        raise HTTPException(status_code=429, detail="Aguarde um pouco antes de pedir um novo código.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    session.add(
        PhoneVerificationCode(
            user_id=current_user.id,
            phone_number=phone,
            code=code,
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.phone_verification_code_expire_minutes),
        )
    )
    # Telefone fica associado mas NÃO verificado até o código ser confirmado.
    current_user.phone_number = phone
    current_user.phone_verified = False
    current_user.whatsapp_opted_in = False
    session.add(current_user)
    session.commit()

    sent = send_whatsapp_template(phone, settings.whatsapp_template_otp, [code])
    if not sent:
        # WhatsApp não configurado/recusado (modo dev): loga o código pra não travar o teste.
        logger.info("Código de verificação (WhatsApp não configurado) para %s: %s", phone, code)

    return {"message": "Código enviado.", "whatsapp_sent": sent}


class PhoneVerifyCodeRequest(BaseModel):
    code: str


@router.post("/phone/verify-code")
def verify_phone_code(
    payload: PhoneVerifyCodeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verification = session.exec(
        select(PhoneVerificationCode)
        .where(PhoneVerificationCode.user_id == current_user.id, PhoneVerificationCode.code == payload.code)
        .order_by(PhoneVerificationCode.created_at.desc())
    ).first()

    invalid = HTTPException(status_code=400, detail="Código inválido ou expirado")
    if not verification or verification.used:
        raise invalid
    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise invalid

    verification.used = True
    current_user.phone_verified = True
    session.add(verification)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
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
        result = notify(
            session,
            user,
            "password_reset",
            email_subject="Redefinição de senha — DailyLoop",
            email_body=(
                "Você solicitou a redefinição da sua senha no DailyLoop.\n\n"
                f"Clique no link abaixo (válido por tempo limitado):\n{reset_link}\n\n"
                "Se você não pediu isso, pode ignorar este email."
            ),
            whatsapp_params=[user.username, token_value],
        )
        if not result["email_sent"] and not result["whatsapp_sent"]:
            # Nenhum canal configurado/habilitado (modo dev): loga o link pra não travar o teste.
            logger.info("Link de redefinição (nenhum canal configurado): %s", reset_link)

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
