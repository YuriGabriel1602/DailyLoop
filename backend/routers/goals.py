from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Goal, User, get_session
from services import activity_log_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])


class GoalCreate(BaseModel):
    title: str
    target_date: Optional[date] = None
    area: Optional[str] = None
    note: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_date: Optional[date] = None
    progress_percent: Optional[int] = None
    area: Optional[str] = None
    note: Optional[str] = None


def _get_owned(goal_id: int, current_user: User, session: Session) -> Goal:
    goal = session.get(Goal, goal_id)
    if not goal or goal.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    return goal


@router.get("")
def list_goals(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(Goal).where(Goal.owner_id == current_user.id).order_by(Goal.created_at.desc())
    return session.exec(statement).all()


@router.post("")
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    goal = Goal(owner_id=current_user.id, **payload.model_dump())
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal


@router.patch("/{goal_id}")
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    goal = _get_owned(goal_id, current_user, session)
    old_percent = goal.progress_percent
    patch_data = payload.model_dump(exclude_unset=True)
    if "progress_percent" in patch_data:
        patch_data["progress_percent"] = max(0, min(100, patch_data["progress_percent"]))
    for field, value in patch_data.items():
        setattr(goal, field, value)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    if "progress_percent" in patch_data:
        activity_log_service.log(
            session, current_user.id, "pessoal", "goal.progress_updated",
            f"Meta '{goal.title}' foi pra {goal.progress_percent}%",
        )
    achievement_hit = "progress_percent" in patch_data and goal.progress_percent == 100 and old_percent != 100
    return {**goal.model_dump(), "achievement_hit": achievement_hit}


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    goal = _get_owned(goal_id, current_user, session)
    session.delete(goal)
    session.commit()
    return {"status": "deleted"}
