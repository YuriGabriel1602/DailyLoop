import logging
from datetime import date, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, select

from config import settings
from database import (
    BusinessAISettings,
    Contact,
    Conversation,
    ConversationMessage,
    EmailAccount,
    IntegrationCredential,
    Task,
    User,
    engine,
)
from services import (
    activity_log_service,
    ai_service,
    email_account_service,
    google_calendar_sync_service,
    instagram_sync_service,
    whatsapp_service,
)
from services.notification_service import notify

logger = logging.getLogger(__name__)

WATCHDOG_CHECK_MINUTES = 15
EMAIL_POLL_MINUTES = 5
INSTAGRAM_POLL_MINUTES = 5
GOOGLE_CALENDAR_POLL_MINUTES = 20


def _run_daily_briefing():
    with Session(engine) as session:
        users = session.exec(select(User).where(User.is_active == True)).all()  # noqa: E712
        for user in users:
            tasks = session.exec(select(Task).where(Task.owner_id == user.id, Task.completed == False)).all()  # noqa: E712
            today = date.today()
            due_today = [t for t in tasks if t.due_at and t.due_at.date() == today]
            notify(
                session,
                user,
                "daily_briefing",
                email_subject="Seu resumo do dia — DailyLoop",
                email_body=(
                    f"Bom dia, {user.username}! Você tem {len(due_today)} compromisso(s) hoje "
                    f"e {len(tasks)} tarefa(s) pendente(s) no total."
                ),
                whatsapp_params=[user.username, str(len(due_today)), str(len(tasks))],
            )
    logger.info("Briefing diário processado para %d usuário(s).", len(users))


def _run_task_reminders():
    with Session(engine) as session:
        now = datetime.utcnow()
        window_end = now + timedelta(minutes=settings.task_reminder_window_minutes)
        due_tasks = session.exec(
            select(Task).where(
                Task.completed == False,  # noqa: E712
                Task.reminded_at == None,  # noqa: E711
                Task.due_at != None,  # noqa: E711
                Task.due_at >= now,
                Task.due_at <= window_end,
            )
        ).all()
        for task in due_tasks:
            user = session.get(User, task.owner_id)
            if not user or not user.is_active:
                continue
            notify(
                session,
                user,
                "task_reminder",
                email_subject="Lembrete de tarefa — DailyLoop",
                email_body=f"Sua tarefa \"{task.title}\" está marcada para {task.due_at.strftime('%d/%m %H:%M')}.",
                whatsapp_params=[user.username, task.title, task.due_at.strftime("%d/%m %H:%M")],
            )
            task.reminded_at = now
            session.add(task)
        session.commit()
        if due_tasks:
            logger.info("%d lembrete(s) de tarefa enviado(s).", len(due_tasks))


def _send_reply_to_channel(conversation: Conversation, content: str, session: Session) -> bool:
    """WhatsApp/Instagram/Facebook passam pelo dispatcher único
    `whatsapp_service.send_business_message` (mesmo usado por `routers/inbox.py` e pela
    resposta automática da IA em `services/lead_inbound_service.py`); email continua
    fora dele porque esse dispatcher só cobre canais de mensageria via Meta/Baileys."""
    contact = session.get(Contact, conversation.contact_id)
    if not contact:
        return False
    return whatsapp_service.send_business_message(conversation.owner_id, conversation.channel, contact, content, session)


def _run_conversation_watchdog():
    """Sweep de conversas presas: cliente escreveu, ninguém (IA nem humano) respondeu, e a
    IA está pausada há mais tempo que o configurado — reativa e responde sozinho. Roda a
    cada 15 min (Fase 2 do atendimento automático); ver plano em
    C:\\Users\\brmod\\.claude\\plans para o desenho completo."""
    with Session(engine) as session:
        stuck_conversations = session.exec(
            select(Conversation).where(Conversation.ai_enabled == False, Conversation.status == "open")  # noqa: E712
        ).all()
        reactivated = 0
        for conversation in stuck_conversations:
            ai_settings = session.exec(
                select(BusinessAISettings).where(BusinessAISettings.owner_id == conversation.owner_id)
            ).first()
            if ai_settings and not ai_settings.watchdog_enabled:
                continue
            inactivity_minutes = ai_settings.watchdog_inactivity_minutes if ai_settings else 30

            last_message = session.exec(
                select(ConversationMessage)
                .where(ConversationMessage.conversation_id == conversation.id)
                .order_by(ConversationMessage.created_at.desc())
            ).first()
            if not last_message or last_message.direction != "inbound":
                continue  # já foi respondida (por humano ou IA) — não está presa
            if datetime.utcnow() - last_message.created_at < timedelta(minutes=inactivity_minutes):
                continue  # ainda dentro da janela de tolerância

            owner = session.get(User, conversation.owner_id)
            if not owner or not owner.is_active:
                continue

            conversation.ai_enabled = True
            session.add(conversation)
            session.commit()

            reply_text = ai_service.answer_conversation(session, owner, conversation, last_message.content)
            outbound = ConversationMessage(conversation_id=conversation.id, direction="outbound", sender="ai", content=reply_text)
            session.add(outbound)
            conversation.last_message_at = datetime.utcnow()
            session.add(conversation)
            session.commit()

            _send_reply_to_channel(conversation, reply_text, session)
            activity_log_service.log(
                session, conversation.owner_id, "empresarial", "inbox.watchdog_reactivated",
                f"Watchdog reativou a IA numa conversa parada há {inactivity_minutes}+ min",
            )
            notify(
                session, owner, "watchdog_reactivated",
                email_subject="Watchdog reativou uma conversa — DailyLoop",
                email_body=f"Uma conversa estava parada há {inactivity_minutes}+ minutos sem resposta — o watchdog reativou a IA e já respondeu.",
            )
            reactivated += 1

        if reactivated:
            logger.info("Watchdog reativou %d conversa(s) presa(s).", reactivated)


def _run_email_poll():
    """Sincroniza cada conta de email conectada (Empresarial) — traz emails novos pra
    caixa unificada do Inbox. A IA nunca responde email nesta fase (Fase 5)."""
    with Session(engine) as session:
        accounts = session.exec(select(EmailAccount).where(EmailAccount.status == "connected")).all()
        total_imported = 0
        for account in accounts:
            total_imported += email_account_service.poll_inbox(account, session)
        if total_imported:
            logger.info("Email: %d mensagem(ns) nova(s) importada(s) de %d conta(s).", total_imported, len(accounts))


def _run_instagram_poll():
    """Instagram ainda não publicado no Meta for Developers não recebe webhook — poll
    periódico via Conversations API preenche essa lacuna (ver
    services/instagram_sync_service.py; trocar por webhook quando o app for publicado)."""
    with Session(engine) as session:
        creds = session.exec(
            select(IntegrationCredential).where(
                IntegrationCredential.channel == "instagram", IntegrationCredential.status == "connected"
            )
        ).all()
        total = sum(instagram_sync_service.sync_owner(cred.owner_id, session) for cred in creds)
        if total:
            logger.info("Instagram: %d mensagem(ns) nova(s) no total (%d conta(s)).", total, len(creds))


def _run_google_calendar_poll():
    """Espelha os eventos do Google Calendar de cada conta Pessoal conectada pro
    banco local (GoogleCalendarEvent) — ver services/google_calendar_sync_service.py."""
    with Session(engine) as session:
        creds = session.exec(
            select(IntegrationCredential).where(
                IntegrationCredential.channel == "google", IntegrationCredential.status == "connected"
            )
        ).all()
        total = sum(google_calendar_sync_service.sync_owner(cred.owner_id, session) for cred in creds)
        if total:
            logger.info("Google Calendar: %d evento(s) sincronizado(s) no total (%d conta(s)).", total, len(creds))


_scheduler: BackgroundScheduler | None = None


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _run_daily_briefing,
        CronTrigger(hour=settings.daily_briefing_hour, minute=0),
        id="daily_briefing",
    )
    _scheduler.add_job(
        _run_task_reminders,
        IntervalTrigger(minutes=settings.task_reminder_check_minutes),
        id="task_reminders",
    )
    _scheduler.add_job(
        _run_conversation_watchdog,
        IntervalTrigger(minutes=WATCHDOG_CHECK_MINUTES),
        id="conversation_watchdog",
    )
    _scheduler.add_job(
        _run_email_poll,
        IntervalTrigger(minutes=EMAIL_POLL_MINUTES),
        id="email_poll",
    )
    _scheduler.add_job(
        _run_instagram_poll,
        IntervalTrigger(minutes=INSTAGRAM_POLL_MINUTES),
        id="instagram_poll",
    )
    _scheduler.add_job(
        _run_google_calendar_poll,
        IntervalTrigger(minutes=GOOGLE_CALENDAR_POLL_MINUTES),
        id="google_calendar_poll",
    )
    _scheduler.start()
    logger.info(
        "Agendador iniciado: briefing diário às %dh (UTC), lembretes a cada %d min, watchdog a cada %d min, "
        "email a cada %d min, instagram a cada %d min, google calendar a cada %d min.",
        settings.daily_briefing_hour,
        settings.task_reminder_check_minutes,
        WATCHDOG_CHECK_MINUTES,
        EMAIL_POLL_MINUTES,
        INSTAGRAM_POLL_MINUTES,
        GOOGLE_CALENDAR_POLL_MINUTES,
    )
