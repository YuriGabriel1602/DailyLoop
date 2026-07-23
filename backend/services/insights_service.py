import random
from collections import defaultdict
from datetime import date as date_type
from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlmodel import Session, select

from database import Goal, JournalEntry, PersonalContact, Ritual, RitualLog, Task, Transaction

WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


def _today() -> date_type:
    return datetime.utcnow().date()


def _day_bounds(day: date_type) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min)
    return start, start + timedelta(days=1)


def _completed_at_rows(session: Session, owner_id: int) -> list[datetime]:
    rows = session.exec(
        select(Task.completed_at).where(Task.owner_id == owner_id, Task.completed_at.is_not(None))
    ).all()
    return list(rows)


def get_day_progress(session: Session, owner_id: int, today: date_type) -> dict:
    start, end = _day_bounds(today)
    todays_tasks = session.exec(
        select(Task).where(
            Task.owner_id == owner_id, Task.due_at.is_not(None), Task.due_at >= start, Task.due_at < end
        )
    ).all()
    completed = sum(1 for t in todays_tasks if t.completed)
    return {"completed": completed, "total": len(todays_tasks)}


def get_day_vs_yesterday(session: Session, owner_id: int, today: date_type) -> dict:
    completed_at = _completed_at_rows(session, owner_id)
    completed_today = sum(1 for dt in completed_at if dt.date() == today)
    completed_yesterday = sum(1 for dt in completed_at if dt.date() == today - timedelta(days=1))
    if completed_today > completed_yesterday:
        comparison = "melhor"
    elif completed_today < completed_yesterday:
        comparison = "pior"
    else:
        comparison = "igual"
    return {
        "completed_today": completed_today,
        "completed_yesterday": completed_yesterday,
        "comparison": comparison,
    }


def get_streak(session: Session, owner_id: int, today: date_type) -> dict:
    dates = {dt.date() for dt in _completed_at_rows(session, owner_id)}

    current = 0
    cursor = today
    if cursor not in dates:
        cursor -= timedelta(days=1)
    while cursor in dates:
        current += 1
        cursor -= timedelta(days=1)

    record = current
    for d in dates:
        if d - timedelta(days=1) in dates:
            continue  # não é o início de uma sequência
        length = 1
        probe = d + timedelta(days=1)
        while probe in dates:
            length += 1
            probe += timedelta(days=1)
        record = max(record, length)

    last_7_days = [
        {"date": (today - timedelta(days=6 - i)).isoformat(), "done": (today - timedelta(days=6 - i)) in dates}
        for i in range(7)
    ]

    return {"current": current, "record": record, "last_7_days": last_7_days}


def get_best_hours(session: Session, owner_id: int) -> dict | None:
    completed_at = _completed_at_rows(session, owner_id)
    if not completed_at:
        return None
    counts = [0] * 24
    for dt in completed_at:
        counts[dt.hour] += 1
    # Melhor janela contígua de 2h (soma de horas adjacentes, com wraparound à meia-noite).
    best_start, best_count = 0, -1
    for h in range(24):
        window = counts[h] + counts[(h + 1) % 24]
        if window > best_count:
            best_start, best_count = h, window
    return {"start_hour": best_start, "end_hour": (best_start + 2) % 24, "count": best_count}


def get_best_weekdays(session: Session, owner_id: int) -> dict:
    completed_at = _completed_at_rows(session, owner_id)
    counts = [0] * 7
    for dt in completed_at:
        counts[dt.weekday()] += 1
    by_weekday = [{"weekday": WEEKDAY_LABELS[i], "count": counts[i]} for i in range(7)]
    if not completed_at:
        return {"best": None, "by_weekday": by_weekday}
    best_idx = max(range(7), key=lambda i: counts[i])
    return {"best": WEEKDAY_LABELS[best_idx], "by_weekday": by_weekday}


def get_week_spend(session: Session, owner_id: int, today: date_type) -> dict:
    monday = today - timedelta(days=today.weekday())
    window_start = monday - timedelta(days=28)  # 4 semanas fechadas anteriores + semana atual
    week_end = monday + timedelta(days=7)

    transactions = session.exec(
        select(Transaction).where(
            Transaction.owner_id == owner_id,
            Transaction.type == "expense",
            Transaction.date >= window_start,
            Transaction.date < week_end,
        )
    ).all()

    daily_totals: dict[date_type, Decimal] = defaultdict(lambda: Decimal("0"))
    current_total = Decimal("0")
    for t in transactions:
        if monday <= t.date < week_end:
            daily_totals[t.date] += t.amount
            current_total += t.amount

    daily_series = [
        {"date": (monday + timedelta(days=i)).isoformat(), "amount": daily_totals[monday + timedelta(days=i)]}
        for i in range(7)
    ]

    prior_weeks_total = Decimal("0")
    for w in range(1, 5):
        w_start = monday - timedelta(days=7 * w)
        w_end = w_start + timedelta(days=7)
        prior_weeks_total += sum((t.amount for t in transactions if w_start <= t.date < w_end), Decimal("0"))
    avg_prior = prior_weeks_total / 4

    percent_vs_avg = None
    if avg_prior > 0:
        percent_vs_avg = round(float((current_total - avg_prior) / avg_prior * 100), 1)

    return {
        "current_total": current_total,
        "avg_previous_4_weeks": avg_prior,
        "percent_vs_avg": percent_vs_avg,
        "daily_series": daily_series,
    }


def get_patterns(session: Session, owner_id: int, today: date_type) -> list[dict]:
    patterns = []

    last_txn = session.exec(
        select(Transaction)
        .where(Transaction.owner_id == owner_id)
        .order_by(Transaction.date.desc())
    ).first()
    if last_txn is None:
        patterns.append(
            {"id": "no_expenses_ever", "message": "Você ainda não registrou nenhum gasto.", "action": "log_expense"}
        )
    else:
        days_since = (today - last_txn.date).days
        if days_since >= 3:
            patterns.append(
                {
                    "id": "stale_expenses",
                    "message": f"Sem registrar gasto há {days_since} dias.",
                    "action": "log_expense",
                }
            )

    completed_today = any(dt.date() == today for dt in _completed_at_rows(session, owner_id))
    # Heurística grosseira de "fim de tarde" em UTC — o app não guarda fuso por usuário ainda.
    if not completed_today and datetime.utcnow().hour >= 15:
        patterns.append(
            {"id": "streak_at_risk", "message": "Você ainda não concluiu nenhuma tarefa hoje.", "action": "open_tasks"}
        )

    return patterns


def get_dashboard_insights(session: Session, owner_id: int) -> dict:
    today = _today()
    return {
        "day_progress": get_day_progress(session, owner_id, today),
        "day_vs_yesterday": get_day_vs_yesterday(session, owner_id, today),
        "streak": get_streak(session, owner_id, today),
        "best_hours": get_best_hours(session, owner_id),
        "best_weekdays": get_best_weekdays(session, owner_id),
        "week_spend": get_week_spend(session, owner_id, today),
        "patterns": get_patterns(session, owner_id, today),
    }


def get_life_areas(session: Session, owner_id: int) -> list[dict]:
    """Agrega Tarefas (por `category`), Rituais e Metas (por `area`) num resumo por área
    de vida — sem tabela nova, só reaproveitando campos que já existem em cada modelo
    (mesmo espírito de agregação em Python que `get_week_spend` já faz)."""
    tasks = session.exec(select(Task).where(Task.owner_id == owner_id)).all()
    rituals = session.exec(select(Ritual).where(Ritual.owner_id == owner_id)).all()
    goals = session.exec(select(Goal).where(Goal.owner_id == owner_id)).all()

    areas: dict[str, dict] = {}

    def _area(name: str) -> dict:
        return areas.setdefault(
            name, {"area": name, "tasks_pending": 0, "tasks_done": 0, "rituals": [], "goals": []}
        )

    for t in tasks:
        bucket = _area(t.category or "Geral")
        bucket["tasks_done" if t.completed else "tasks_pending"] += 1

    for r in rituals:
        bucket = _area(r.area or "Geral")
        streak = 0
        done_dates = {
            log.date
            for log in session.exec(select(RitualLog).where(RitualLog.ritual_id == r.id)).all()
            if log.completed_steps != "[]"
        }
        cursor = _today()
        while cursor in done_dates:
            streak += 1
            cursor -= timedelta(days=1)
        bucket["rituals"].append({"name": r.name, "streak": streak})

    for g in goals:
        bucket = _area(g.area or "Geral")
        bucket["goals"].append({"title": g.title, "progress_percent": g.progress_percent})

    cold_count = sum(
        1
        for c in session.exec(select(PersonalContact).where(PersonalContact.owner_id == owner_id)).all()
        if c.last_contact_at is None or c.last_contact_at < datetime.utcnow() - timedelta(days=14)
    )
    relacoes = _area("Relações")
    relacoes["contacts_cold"] = cold_count

    return list(areas.values())


def get_activity_heatmap(session: Session, owner_id: int, days: int = 182) -> list[dict]:
    """Conta 'pontos de atividade' por dia (tarefa concluída + entrada de diário + ritual
    com algum passo marcado) nos últimos `days` dias — alimenta o Mapa de Calor do Painel."""
    today = _today()
    start = today - timedelta(days=days - 1)
    counts: dict[date_type, int] = defaultdict(int)

    for dt in session.exec(
        select(Task.completed_at).where(
            Task.owner_id == owner_id, Task.completed_at.is_not(None), Task.completed_at >= datetime.combine(start, time.min)
        )
    ).all():
        counts[dt.date()] += 1

    for dt in session.exec(
        select(JournalEntry.created_at).where(JournalEntry.owner_id == owner_id, JournalEntry.created_at >= datetime.combine(start, time.min))
    ).all():
        counts[dt.date()] += 1

    ritual_ids = [r.id for r in session.exec(select(Ritual).where(Ritual.owner_id == owner_id)).all()]
    if ritual_ids:
        for log in session.exec(
            select(RitualLog).where(RitualLog.ritual_id.in_(ritual_ids), RitualLog.date >= start, RitualLog.completed_steps != "[]")
        ).all():
            counts[log.date] += 1

    return [
        {"date": (start + timedelta(days=i)).isoformat(), "count": counts[start + timedelta(days=i)]}
        for i in range(days)
    ]


def get_time_capsule(session: Session, owner_id: int) -> dict | None:
    """Escolhe uma entrada de diário aleatória de mais de 3 dias atrás — alimenta a
    Cápsula do Tempo do Painel. None se não houver nenhuma entrada elegível ainda."""
    cutoff = datetime.utcnow() - timedelta(days=3)
    candidates = session.exec(
        select(JournalEntry).where(JournalEntry.owner_id == owner_id, JournalEntry.created_at < cutoff)
    ).all()
    if not candidates:
        return None
    entry = random.choice(candidates)
    days_ago = (datetime.utcnow() - entry.created_at).days
    return {"content": entry.content, "days_ago": days_ago, "mood_score": entry.mood_score}
