import logging
from datetime import date, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, select

from config import settings
from database import Task, User, engine
from services.notification_service import notify

logger = logging.getLogger(__name__)


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
    _scheduler.start()
    logger.info(
        "Agendador iniciado: briefing diário às %dh (UTC), lembretes a cada %d min.",
        settings.daily_briefing_hour,
        settings.task_reminder_check_minutes,
    )
