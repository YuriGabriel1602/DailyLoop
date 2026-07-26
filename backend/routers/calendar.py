import json
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import GoogleCalendarEvent, User, get_session
from services import google_calendar_sync_service, google_oauth_service
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


def _require_connected(current_user: User, session: Session):
    if not google_oauth_service.get_valid_access_token(session, current_user):
        raise HTTPException(status_code=400, detail="Google Calendar não conectado.")


def _serialize(event: GoogleCalendarEvent, *, detailed: bool) -> dict:
    base = {
        "id": event.id,
        "title": event.title,
        "start": event.start_at.isoformat(),
        "end": event.end_at.isoformat(),
        "all_day": event.all_day,
        "html_link": event.html_link,
    }
    if not detailed:
        return base
    base.update(
        {
            "description": event.description,
            "location": event.location,
            "timezone": event.timezone,
            "status": event.status,
            "hangout_link": event.hangout_link,
            "creator_email": event.creator_email,
            "organizer_email": event.organizer_email,
            "organizer_name": event.organizer_name,
            "attendees": json.loads(event.attendees_json) if event.attendees_json else [],
            "recurring_event_id": event.recurring_event_id,
            "recurrence": json.loads(event.recurrence_json) if event.recurrence_json else [],
            "color_id": event.color_id,
            "visibility": event.visibility,
            "transparency": event.transparency,
            "google_created_at": event.google_created_at.isoformat() if event.google_created_at else None,
            "google_updated_at": event.google_updated_at.isoformat() if event.google_updated_at else None,
            "synced_at": event.synced_at.isoformat(),
        }
    )
    return base


@router.get("/events")
def list_events(
    days_before: int = Query(default=0, ge=0),
    days_after: int = Query(default=7, ge=1, le=730),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lê do espelho local (sincronizado por services/google_calendar_sync_service.py)
    — não bate na API do Google a cada carregamento de tela."""
    _require_connected(current_user, session)

    now = datetime.utcnow()
    time_min = now - timedelta(days=days_before)
    time_max = now + timedelta(days=days_after)

    events = session.exec(
        select(GoogleCalendarEvent)
        .where(
            GoogleCalendarEvent.owner_id == current_user.id,
            GoogleCalendarEvent.start_at >= time_min,
            GoogleCalendarEvent.start_at <= time_max,
        )
        .order_by(GoogleCalendarEvent.start_at.asc())
    ).all()
    return [_serialize(e, detailed=False) for e in events]


@router.get("/events/{event_id}")
def get_event(
    event_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    event = session.get(GoogleCalendarEvent, event_id)
    if not event or event.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    return _serialize(event, detailed=True)


@router.post("/sync")
def sync_now(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Sincronização sob demanda — o agendador (scheduler_service) já roda isso
    periodicamente pra todo mundo conectado; esse endpoint é só pro botão "atualizar"."""
    _require_connected(current_user, session)
    count = google_calendar_sync_service.sync_owner(current_user.id, session)
    return {"synced": count}
