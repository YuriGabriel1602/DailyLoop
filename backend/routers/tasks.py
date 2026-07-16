from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Task, get_session

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    category: str = "Geral"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    completed: Optional[bool] = None


@router.get("")
def list_tasks(session: Session = Depends(get_session)):
    statement = select(Task).order_by(Task.created_at.desc())
    return session.exec(statement).all()


@router.post("")
def create_task(task: TaskCreate, session: Session = Depends(get_session)):
    db_task = Task(title=task.title, category=task.category)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@router.patch("/{task_id}")
def update_task(task_id: int, patch: TaskUpdate, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@router.delete("/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    session.delete(db_task)
    session.commit()
    return {"status": "deleted"}
