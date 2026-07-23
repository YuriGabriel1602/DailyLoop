import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import User, get_session
from services import google_oauth_service
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/events")
def list_events(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    token = google_oauth_service.get_valid_access_token(session, current_user)
    if not token:
        raise HTTPException(status_code=400, detail="Google Calendar não conectado.")

    now = datetime.now(timezone.utc)
    time_min = now.replace(hour=0, minute=0, second=0, microsecond=0)
    time_max = time_min + timedelta(days=7)

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "timeMin": time_min.isoformat(),
                    "timeMax": time_max.isoformat(),
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 20,
                },
            )
            if response.status_code >= 400:
                logger.error("Google Calendar recusou a listagem: %s", response.text)
                return []
            items = response.json().get("items", [])
            return [
                {
                    "id": item["id"],
                    "title": item.get("summary", "(sem título)"),
                    "start": item.get("start", {}).get("dateTime") or item.get("start", {}).get("date"),
                    "end": item.get("end", {}).get("dateTime") or item.get("end", {}).get("date"),
                    "html_link": item.get("htmlLink"),
                }
                for item in items
            ]
    except Exception:
        logger.exception("Falha ao buscar eventos do Google Calendar")
        return []
