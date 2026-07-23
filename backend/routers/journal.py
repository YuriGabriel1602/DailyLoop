from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import JournalEntry, User, get_session
from services import activity_log_service, ai_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/journal", tags=["journal"])


class JournalEntryCreate(BaseModel):
    content: str
    mood_score: int | None = None


@router.get("")
def list_entries(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = (
        select(JournalEntry)
        .where(JournalEntry.owner_id == current_user.id)
        .order_by(JournalEntry.created_at.desc())
        .limit(50)
    )
    return session.exec(statement).all()


@router.post("")
def create_entry(
    payload: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    entry = JournalEntry(owner_id=current_user.id, content=payload.content, mood_score=payload.mood_score)
    session.add(entry)
    session.commit()
    session.refresh(entry)

    entry.ai_reflection = ai_service.reflect_on_journal(session, current_user, payload.content)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    activity_log_service.log(session, current_user.id, "pessoal", "journal.created", "Nova entrada no diário")
    return entry


@router.get("/week-review")
def week_review(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    since = datetime.utcnow() - timedelta(days=7)
    statement = (
        select(JournalEntry)
        .where(JournalEntry.owner_id == current_user.id, JournalEntry.created_at >= since)
        .order_by(JournalEntry.created_at.asc())
    )
    entries = session.exec(statement).all()
    mood_by_day: dict[str, list[int]] = {}
    for e in entries:
        if e.mood_score is None:
            continue
        day = e.created_at.date().isoformat()
        mood_by_day.setdefault(day, []).append(e.mood_score)

    return {
        "entries_count": len(entries),
        "mood_series": [
            {"date": day, "avg_mood": sum(scores) / len(scores)} for day, scores in sorted(mood_by_day.items())
        ],
    }
