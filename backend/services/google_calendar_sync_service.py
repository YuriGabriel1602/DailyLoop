"""Sincroniza os eventos do Google Calendar pro banco local (GoogleCalendarEvent) —
a Agenda passa a ler daqui em vez de bater na API do Google a cada tela aberta.
Guarda os campos que o Google manda (descrição, local, participantes, link de
videochamada etc.) pra exibir no detalhe do evento, não só título/hora."""

import json
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlmodel import Session, select

from database import GoogleCalendarEvent, User
from services import google_oauth_service

logger = logging.getLogger(__name__)

EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

# Janela sincronizada — "global" o bastante pra cobrir histórico recente e o futuro
# previsível, sem puxar anos de eventos recorrentes expandidos a cada sync.
PAST_DAYS = 180
FUTURE_DAYS = 365


def _parse_when(value: dict) -> tuple[datetime, bool]:
    """`start`/`end` do Google vêm como {"dateTime": "...", "timeZone": "..."} (evento
    com hora) ou {"date": "2026-01-01"} (evento de dia inteiro) — normaliza pros dois
    casos num datetime, sinalizando qual foi."""
    if "dateTime" in value:
        return datetime.fromisoformat(value["dateTime"].replace("Z", "+00:00")), False
    date_str = value.get("date")
    return datetime.fromisoformat(date_str), True


def _parse_google_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def sync_owner(owner_id: int, session: Session) -> int:
    user = session.get(User, owner_id)
    if not user:
        return 0
    token = google_oauth_service.get_valid_access_token(session, user)
    if not token:
        return 0

    now = datetime.now(timezone.utc)
    time_min = now - timedelta(days=PAST_DAYS)
    time_max = now + timedelta(days=FUTURE_DAYS)

    upserted = 0
    page_token = None
    try:
        with httpx.Client(timeout=15.0) as client:
            while True:
                params = {
                    "timeMin": time_min.isoformat(),
                    "timeMax": time_max.isoformat(),
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 250,
                }
                if page_token:
                    params["pageToken"] = page_token
                response = client.get(
                    EVENTS_ENDPOINT, headers={"Authorization": f"Bearer {token}"}, params=params
                )
                if response.status_code >= 400:
                    logger.error("Google Calendar recusou a sincronização: %s", response.text)
                    break
                payload = response.json()

                for item in payload.get("items", []):
                    if item.get("status") == "cancelled" or "start" not in item:
                        continue
                    start_at, all_day = _parse_when(item["start"])
                    end_at, _ = _parse_when(item.get("end", item["start"]))
                    attendees = item.get("attendees")
                    creator = item.get("creator", {})
                    organizer = item.get("organizer", {})

                    existing = session.exec(
                        select(GoogleCalendarEvent).where(
                            GoogleCalendarEvent.owner_id == owner_id,
                            GoogleCalendarEvent.google_event_id == item["id"],
                        )
                    ).first()
                    event = existing or GoogleCalendarEvent(owner_id=owner_id, google_event_id=item["id"])

                    event.title = item.get("summary") or "(sem título)"
                    event.description = item.get("description")
                    event.location = item.get("location")
                    event.start_at = start_at
                    event.end_at = end_at
                    event.all_day = all_day
                    event.timezone = item.get("start", {}).get("timeZone")
                    event.status = item.get("status", "confirmed")
                    event.html_link = item.get("htmlLink")
                    event.hangout_link = item.get("hangoutLink")
                    event.creator_email = creator.get("email")
                    event.organizer_email = organizer.get("email")
                    event.organizer_name = organizer.get("displayName")
                    event.attendees_json = json.dumps(attendees) if attendees else None
                    event.recurring_event_id = item.get("recurringEventId")
                    event.recurrence_json = json.dumps(item["recurrence"]) if item.get("recurrence") else None
                    event.color_id = item.get("colorId")
                    event.visibility = item.get("visibility")
                    event.transparency = item.get("transparency")
                    event.google_created_at = _parse_google_ts(item.get("created"))
                    event.google_updated_at = _parse_google_ts(item.get("updated"))
                    event.synced_at = datetime.utcnow()

                    session.add(event)
                    upserted += 1

                session.commit()
                page_token = payload.get("nextPageToken")
                if not page_token:
                    break
    except Exception:
        logger.exception("Falha ao sincronizar Google Calendar (owner_id=%s)", owner_id)

    if upserted:
        logger.info("Google Calendar: %d evento(s) sincronizado(s) (owner_id=%s).", upserted, owner_id)
    return upserted
