from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import User, get_session
from services import ai_service, insights_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return insights_service.get_dashboard_insights(session, current_user.id)


@router.get("/life-areas")
def get_life_areas(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return insights_service.get_life_areas(session, current_user.id)


@router.get("/daily-briefing")
def get_daily_briefing(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return {"text": ai_service.generate_daily_briefing(session, current_user)}


@router.get("/activity-heatmap")
def get_activity_heatmap(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return insights_service.get_activity_heatmap(session, current_user.id)


@router.get("/time-capsule")
def get_time_capsule(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return insights_service.get_time_capsule(session, current_user.id)
