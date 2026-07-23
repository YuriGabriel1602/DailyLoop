from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import PersonalContact, User, get_session
from services import activity_log_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/people", tags=["people"])

RELATIONSHIPS = ["familia", "amigo", "mentor", "outro"]
COLD_AFTER_DAYS = 14


class PersonalContactCreate(BaseModel):
    name: str
    relationship: str = "amigo"
    important_date: Optional[date] = None
    notes: Optional[str] = None


class PersonalContactUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    important_date: Optional[date] = None
    notes: Optional[str] = None
    last_contact_at: Optional[datetime] = None


def _get_owned(contact_id: int, current_user: User, session: Session) -> PersonalContact:
    db_contact = session.get(PersonalContact, contact_id)
    if not db_contact or db_contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    return db_contact


def _public(contact: PersonalContact) -> dict:
    cold = (
        contact.last_contact_at is None
        or contact.last_contact_at < datetime.utcnow() - timedelta(days=COLD_AFTER_DAYS)
    )
    return {
        "id": contact.id,
        "name": contact.name,
        "relationship": contact.relationship,
        "last_contact_at": contact.last_contact_at,
        "important_date": contact.important_date,
        "notes": contact.notes,
        "created_at": contact.created_at,
        "cold": cold,
    }


@router.get("")
def list_people(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = (
        select(PersonalContact)
        .where(PersonalContact.owner_id == current_user.id)
        .order_by(PersonalContact.created_at.desc())
    )
    return [_public(c) for c in session.exec(statement).all()]


@router.post("")
def create_person(
    payload: PersonalContactCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if payload.relationship not in RELATIONSHIPS:
        raise HTTPException(status_code=400, detail=f"Relação inválida. Use uma de: {RELATIONSHIPS}")
    contact = PersonalContact(
        owner_id=current_user.id,
        name=payload.name,
        relationship=payload.relationship,
        important_date=payload.important_date,
        notes=payload.notes,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return _public(contact)


@router.patch("/{contact_id}")
def update_person(
    contact_id: int,
    payload: PersonalContactUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    contact = _get_owned(contact_id, current_user, session)
    patch_data = payload.model_dump(exclude_unset=True)
    if "relationship" in patch_data and patch_data["relationship"] not in RELATIONSHIPS:
        raise HTTPException(status_code=400, detail=f"Relação inválida. Use uma de: {RELATIONSHIPS}")
    for field, value in patch_data.items():
        setattr(contact, field, value)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return _public(contact)


@router.post("/{contact_id}/mark-contacted")
def mark_contacted(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Atalho pra registrar 'falei com essa pessoa agora' sem precisar montar o PATCH."""
    contact = _get_owned(contact_id, current_user, session)
    contact.last_contact_at = datetime.utcnow()
    session.add(contact)
    session.commit()
    session.refresh(contact)
    activity_log_service.log(session, current_user.id, "pessoal", "people.contacted", f"Marcou contato com {contact.name}")
    return _public(contact)


@router.delete("/{contact_id}")
def delete_person(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    contact = _get_owned(contact_id, current_user, session)
    session.delete(contact)
    session.commit()
    return {"status": "deleted"}
