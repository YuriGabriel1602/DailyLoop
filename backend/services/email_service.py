import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Envia um email via SMTP. Retorna False (sem lançar erro) se SMTP não
    estiver configurado ou o envio falhar — quem chama decide o fallback."""
    if not settings.smtp_host or not settings.smtp_user:
        logger.warning("SMTP não configurado — email para %s não foi enviado.", to)
        return False

    message = MIMEMultipart()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
        return True
    except Exception:
        logger.exception("Falha ao enviar email para %s", to)
        return False


def send_password_reset_email(to: str, reset_link: str) -> bool:
    subject = "Redefinição de senha — DailyLoop"
    body = (
        "Você solicitou a redefinição da sua senha no DailyLoop.\n\n"
        f"Clique no link abaixo (válido por tempo limitado):\n{reset_link}\n\n"
        "Se você não pediu isso, pode ignorar este email."
    )
    return send_email(to, subject, body)
