import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(ROOT_DIR / ".env")


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'dailyloop_brain.db'}"
    )
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://127.0.0.1:1420,http://localhost:1420"
        ).split(",")
        if origin.strip()
    ]
    log_dir: Path = BACKEND_DIR / "logs"
    log_file: Path = log_dir / "app.log"

    # Autenticação
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))
    password_reset_token_expire_minutes: int = int(
        os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30")
    )

    # Email (redefinição de senha)
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from: str = os.getenv("SMTP_FROM", "") or os.getenv("SMTP_USER", "")

    # URL do frontend, usada para montar o link de redefinição de senha
    frontend_url: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:1420")

    # WhatsApp Business Cloud API (Meta)
    whatsapp_access_token: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    whatsapp_phone_number_id: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    whatsapp_business_account_id: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    whatsapp_api_version: str = os.getenv("WHATSAPP_API_VERSION", "v20.0")

    # Nomes dos templates aprovados no Meta Business Manager — atualize aqui
    # quando o nome definitivo aprovado divergir do rascunho.
    whatsapp_template_password_reset: str = os.getenv(
        "WHATSAPP_TEMPLATE_PASSWORD_RESET", "password_reset_link"
    )
    whatsapp_template_task_reminder: str = os.getenv(
        "WHATSAPP_TEMPLATE_TASK_REMINDER", "task_reminder"
    )
    whatsapp_template_daily_briefing: str = os.getenv(
        "WHATSAPP_TEMPLATE_DAILY_BRIEFING", "daily_briefing"
    )
    whatsapp_template_budget_alert: str = os.getenv(
        "WHATSAPP_TEMPLATE_BUDGET_ALERT", "budget_alert"
    )
    whatsapp_template_language: str = os.getenv("WHATSAPP_TEMPLATE_LANGUAGE", "pt_BR")
    # Template de categoria "Authentication" (código de verificação de telefone).
    whatsapp_template_otp: str = os.getenv("WHATSAPP_TEMPLATE_OTP", "otp_verification")

    # Agendamento (horário do servidor) do briefing diário e intervalo de
    # checagem de lembretes de tarefa.
    daily_briefing_hour: int = int(os.getenv("DAILY_BRIEFING_HOUR", "7"))
    task_reminder_check_minutes: int = int(os.getenv("TASK_REMINDER_CHECK_MINUTES", "15"))
    task_reminder_window_minutes: int = int(os.getenv("TASK_REMINDER_WINDOW_MINUTES", "60"))

    # Verificação de telefone (código de uso único)
    phone_verification_code_expire_minutes: int = int(
        os.getenv("PHONE_VERIFICATION_CODE_EXPIRE_MINUTES", "10")
    )
    phone_verification_resend_cooldown_seconds: int = int(
        os.getenv("PHONE_VERIFICATION_RESEND_COOLDOWN_SECONDS", "60")
    )

    # Criptografia em repouso de credenciais de integração (tokens de canal).
    # Gere com: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    credential_encryption_key: str = os.getenv("CREDENTIAL_ENCRYPTION_KEY", "")

    # Token arbitrário que você escolhe e cadastra no painel de Webhooks do app da Meta
    # (Meta valida o handshake de verificação do endpoint com esse mesmo valor).
    meta_webhook_verify_token: str = os.getenv("META_WEBHOOK_VERIFY_TOKEN", "")


settings = Settings()
