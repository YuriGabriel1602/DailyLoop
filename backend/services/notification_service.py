from typing import Optional

from sqlmodel import Session, select

from config import settings
from database import NotificationPreference, User
from services.email_service import send_email
from services.whatsapp_service import send_whatsapp_template

CATEGORIES = [
    "password_reset", "task_reminder", "daily_briefing", "budget_alert",
    "inbox_new_message", "watchdog_reactivated",
]

_TEMPLATE_BY_CATEGORY = {
    "password_reset": lambda: settings.whatsapp_template_password_reset,
    "task_reminder": lambda: settings.whatsapp_template_task_reminder,
    "daily_briefing": lambda: settings.whatsapp_template_daily_briefing,
    "budget_alert": lambda: settings.whatsapp_template_budget_alert,
}


def get_or_create_preference(session: Session, owner_id: int, category: str) -> NotificationPreference:
    pref = session.exec(
        select(NotificationPreference).where(
            NotificationPreference.owner_id == owner_id, NotificationPreference.category == category
        )
    ).first()
    if pref:
        return pref
    pref = NotificationPreference(owner_id=owner_id, category=category)
    session.add(pref)
    session.commit()
    session.refresh(pref)
    return pref


def notify(
    session: Session,
    user: User,
    category: str,
    *,
    email_subject: Optional[str] = None,
    email_body: Optional[str] = None,
    whatsapp_params: Optional[list[str]] = None,
) -> dict:
    """Envia uma notificação da `category` pros canais habilitados do usuário.

    Se nenhuma preferência existir ainda pra essa categoria, o padrão é
    email habilitado / WhatsApp desabilitado (usuário precisa optar
    explicitamente, com telefone verificado, pra receber por WhatsApp)."""
    pref = get_or_create_preference(session, user.id, category)
    result = {"email_sent": False, "whatsapp_sent": False}

    if pref.email_enabled and email_subject and email_body:
        result["email_sent"] = send_email(user.email, email_subject, email_body)

    if pref.whatsapp_enabled and user.whatsapp_opted_in and user.phone_number and whatsapp_params is not None:
        template_name = _TEMPLATE_BY_CATEGORY[category]()
        result["whatsapp_sent"] = send_whatsapp_template(user.phone_number, template_name, whatsapp_params)

    return result
