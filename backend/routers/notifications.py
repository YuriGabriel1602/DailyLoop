from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from database import User, get_session
from services.auth_service import get_current_user
from services.notification_service import CATEGORIES, get_or_create_preference

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class PreferenceUpdate(BaseModel):
    email_enabled: bool
    whatsapp_enabled: bool


@router.get("/preferences")
def list_preferences(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return [
        {
            "category": category,
            "email_enabled": get_or_create_preference(session, current_user.id, category).email_enabled,
            "whatsapp_enabled": get_or_create_preference(session, current_user.id, category).whatsapp_enabled,
        }
        for category in CATEGORIES
    ]


@router.put("/preferences/{category}")
def update_preference(
    category: str,
    payload: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoria inválida")
    pref = get_or_create_preference(session, current_user.id, category)
    pref.email_enabled = payload.email_enabled
    pref.whatsapp_enabled = payload.whatsapp_enabled
    session.add(pref)
    session.commit()
    session.refresh(pref)
    return pref
