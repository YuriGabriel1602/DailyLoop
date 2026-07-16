from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Note, get_session

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteCreate(BaseModel):
    content: str


@router.post("")
def create_note(note: NoteCreate, session: Session = Depends(get_session)):
    db_note = Note(content=note.content)
    session.add(db_note)
    session.commit()
    session.refresh(db_note)
    return db_note


@router.get("")
def list_notes(session: Session = Depends(get_session)):
    statement = select(Note).where(Note.is_archived == False).order_by(Note.id.desc())  # noqa: E712
    return session.exec(statement).all()
