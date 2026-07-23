import json
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Ritual, RitualLog, User, get_session
from services import activity_log_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/rituals", tags=["rituals"])

# Marcos de streak que valem um convite pra compartilhar no Hive — nunca automático,
# só quando o usuário aceita o toast que o frontend mostra ao ver `milestone_hit`.
MILESTONES = {7, 14, 30, 60, 100, 180, 365}


class RitualCreate(BaseModel):
    name: str
    steps: list[str]
    area: Optional[str] = None


class LogStepsUpdate(BaseModel):
    date: Optional[date] = None
    completed_steps: list[int]


def _get_owned(ritual_id: int, current_user: User, session: Session) -> Ritual:
    ritual = session.get(Ritual, ritual_id)
    if not ritual or ritual.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ritual não encontrado")
    return ritual


def _compute_streak(session: Session, ritual_id: int) -> int:
    logs = session.exec(select(RitualLog).where(RitualLog.ritual_id == ritual_id)).all()
    done_dates = {log.date for log in logs if json.loads(log.completed_steps)}
    streak = 0
    cursor = date.today()
    while cursor in done_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _public(ritual: Ritual, session: Session) -> dict:
    today_log = session.exec(
        select(RitualLog).where(RitualLog.ritual_id == ritual.id, RitualLog.date == date.today())
    ).first()
    return {
        "id": ritual.id,
        "name": ritual.name,
        "steps": json.loads(ritual.steps),
        "area": ritual.area,
        "completed_today": json.loads(today_log.completed_steps) if today_log else [],
        "streak": _compute_streak(session, ritual.id),
    }


@router.get("")
def list_rituals(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(Ritual).where(Ritual.owner_id == current_user.id).order_by(Ritual.created_at.asc())
    return [_public(r, session) for r in session.exec(statement).all()]


@router.post("")
def create_ritual(
    payload: RitualCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ritual = Ritual(owner_id=current_user.id, name=payload.name, steps=json.dumps(payload.steps), area=payload.area)
    session.add(ritual)
    session.commit()
    session.refresh(ritual)
    return _public(ritual, session)


@router.post("/{ritual_id}/log")
def log_steps(
    ritual_id: int,
    payload: LogStepsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ritual = _get_owned(ritual_id, current_user, session)
    old_streak = _compute_streak(session, ritual.id)

    log_date = payload.date or date.today()
    log = session.exec(
        select(RitualLog).where(RitualLog.ritual_id == ritual.id, RitualLog.date == log_date)
    ).first()
    if not log:
        log = RitualLog(ritual_id=ritual.id, date=log_date)
    log.completed_steps = json.dumps(payload.completed_steps)
    session.add(log)
    session.commit()
    if payload.completed_steps:
        activity_log_service.log(session, current_user.id, "pessoal", "ritual.logged", f"Ritual '{ritual.name}' marcado")

    result = _public(ritual, session)
    new_streak = result["streak"]
    result["milestone_hit"] = new_streak if new_streak in MILESTONES and new_streak != old_streak else None
    return result


@router.delete("/{ritual_id}")
def delete_ritual(
    ritual_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ritual = _get_owned(ritual_id, current_user, session)
    for log in session.exec(select(RitualLog).where(RitualLog.ritual_id == ritual.id)).all():
        session.delete(log)
    session.delete(ritual)
    session.commit()
    return {"status": "deleted"}
