from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Task, User, get_session
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    category: str = "Geral"
    due_at: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    completed: Optional[bool] = None
    due_at: Optional[datetime] = None


def _get_owned_task(task_id: int, current_user: User, session: Session) -> Task:
    db_task = session.get(Task, task_id)
    if not db_task or db_task.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    return db_task


@router.get("")
def list_tasks(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    statement = (
        select(Task).where(Task.owner_id == current_user.id).order_by(Task.created_at.desc())
    )
    return session.exec(statement).all()


@router.post("")
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_task = Task(title=task.title, category=task.category, due_at=task.due_at, owner_id=current_user.id)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@router.patch("/{task_id}")
def update_task(
    task_id: int,
    patch: TaskUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_task = _get_owned_task(task_id, current_user, session)
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_task = _get_owned_task(task_id, current_user, session)
    session.delete(db_task)
    session.commit()
    return {"status": "deleted"}
