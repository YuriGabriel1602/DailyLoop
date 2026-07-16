from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Note, User, get_session
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteCreate(BaseModel):
    content: str


@router.post("")
def create_note(
    note: NoteCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_note = Note(content=note.content, owner_id=current_user.id)
    session.add(db_note)
    session.commit()
    session.refresh(db_note)
    return db_note


@router.get("")
def list_notes(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    statement = (
        select(Note)
        .where(Note.owner_id == current_user.id, Note.is_archived == False)  # noqa: E712
        .order_by(Note.id.desc())
    )
    return session.exec(statement).all()


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_note = session.get(Note, note_id)
    if not db_note or db_note.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    session.delete(db_note)
    session.commit()
    return {"status": "deleted"}
