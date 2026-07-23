import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import BusinessAISettings, User, get_session
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/ai-settings", tags=["ai-settings"])

WEEKDAY_KEYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}


def _public(settings_row: BusinessAISettings) -> dict:
    return {
        "id": settings_row.id,
        "hours_mode": settings_row.hours_mode,
        "hours_start": settings_row.hours_start,
        "hours_end": settings_row.hours_end,
        "hours_days": json.loads(settings_row.hours_days),
        "out_of_hours_message": settings_row.out_of_hours_message,
        "ignore_whatsapp_groups": settings_row.ignore_whatsapp_groups,
        "watchdog_enabled": settings_row.watchdog_enabled,
        "watchdog_inactivity_minutes": settings_row.watchdog_inactivity_minutes,
    }


class AISettingsUpdate(BaseModel):
    hours_mode: Optional[str] = None
    hours_start: Optional[str] = None
    hours_end: Optional[str] = None
    hours_days: Optional[list[str]] = None
    out_of_hours_message: Optional[str] = None
    ignore_whatsapp_groups: Optional[bool] = None
    watchdog_enabled: Optional[bool] = None
    watchdog_inactivity_minutes: Optional[int] = None


def _get_or_create(session: Session, owner_id: int) -> BusinessAISettings:
    settings_row = session.exec(select(BusinessAISettings).where(BusinessAISettings.owner_id == owner_id)).first()
    if settings_row:
        return settings_row
    settings_row = BusinessAISettings(owner_id=owner_id)
    session.add(settings_row)
    session.commit()
    session.refresh(settings_row)
    return settings_row


@router.get("")
def get_ai_settings(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return _public(_get_or_create(session, current_user.id))


@router.patch("")
def update_ai_settings(
    payload: AISettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    settings_row = _get_or_create(session, current_user.id)
    patch_data = payload.model_dump(exclude_unset=True)

    if "hours_mode" in patch_data and patch_data["hours_mode"] not in ("24_7", "custom"):
        raise HTTPException(status_code=400, detail="hours_mode inválido")
    if "hours_days" in patch_data:
        if not set(patch_data["hours_days"]).issubset(WEEKDAY_KEYS):
            raise HTTPException(status_code=400, detail="hours_days inválido")
        patch_data["hours_days"] = json.dumps(patch_data["hours_days"])
    if "watchdog_inactivity_minutes" in patch_data and patch_data["watchdog_inactivity_minutes"] < 5:
        raise HTTPException(status_code=400, detail="watchdog_inactivity_minutes mínimo é 5")

    for field, value in patch_data.items():
        setattr(settings_row, field, value)
    session.add(settings_row)
    session.commit()
    session.refresh(settings_row)
    return _public(settings_row)
