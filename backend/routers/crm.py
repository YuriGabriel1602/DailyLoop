from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Contact, ContactTag, Tag, User, get_session
from services import activity_log_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/crm", tags=["crm"])

STAGES = ["novo", "qualificado", "convertido", "perdido"]


class TagIdsUpdate(BaseModel):
    tag_ids: list[int]


class ContactCreate(BaseModel):
    name: str
    phone_number: Optional[str] = None
    channel: str = "whatsapp"
    external_id: str = ""
    stage: str = "novo"


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    stage: Optional[str] = None


class StageUpdate(BaseModel):
    stage: str


def _get_owned_contact(contact_id: int, current_user: User, session: Session) -> Contact:
    db_contact = session.get(Contact, contact_id)
    if not db_contact or db_contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    return db_contact


@router.get("/contacts")
def list_contacts(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    statement = (
        select(Contact)
        .where(Contact.owner_id == current_user.id)
        .order_by(Contact.created_at.desc())
    )
    contacts = session.exec(statement).all()

    tags_by_id = {t.id: t for t in session.exec(select(Tag).where(Tag.owner_id == current_user.id)).all()}
    contact_ids = [c.id for c in contacts]
    links = (
        session.exec(select(ContactTag).where(ContactTag.contact_id.in_(contact_ids))).all() if contact_ids else []
    )
    tags_per_contact: dict[int, list[dict]] = {}
    for link in links:
        tag = tags_by_id.get(link.tag_id)
        if tag:
            tags_per_contact.setdefault(link.contact_id, []).append({"id": tag.id, "name": tag.name, "color": tag.color})

    return [{**c.model_dump(), "tags": tags_per_contact.get(c.id, [])} for c in contacts]


@router.post("/contacts")
def create_contact(
    contact: ContactCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if contact.stage not in STAGES:
        raise HTTPException(status_code=400, detail=f"Stage inválido. Use um de: {STAGES}")
    db_contact = Contact(
        name=contact.name,
        phone_number=contact.phone_number,
        channel=contact.channel,
        external_id=contact.external_id,
        stage=contact.stage,
        owner_id=current_user.id,
    )
    session.add(db_contact)
    session.commit()
    session.refresh(db_contact)
    return db_contact


@router.patch("/contacts/{contact_id}")
def update_contact(
    contact_id: int,
    patch: ContactUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_contact = _get_owned_contact(contact_id, current_user, session)
    patch_data = patch.model_dump(exclude_unset=True)
    if "stage" in patch_data and patch_data["stage"] not in STAGES:
        raise HTTPException(status_code=400, detail=f"Stage inválido. Use um de: {STAGES}")
    for field, value in patch_data.items():
        setattr(db_contact, field, value)
    session.add(db_contact)
    session.commit()
    session.refresh(db_contact)
    return db_contact


@router.patch("/contacts/{contact_id}/stage")
def move_contact_stage(
    contact_id: int,
    patch: StageUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if patch.stage not in STAGES:
        raise HTTPException(status_code=400, detail=f"Stage inválido. Use um de: {STAGES}")
    db_contact = _get_owned_contact(contact_id, current_user, session)
    db_contact.stage = patch.stage
    session.add(db_contact)
    session.commit()
    session.refresh(db_contact)
    activity_log_service.log(
        session, current_user.id, "empresarial", "crm.stage_changed",
        f"{db_contact.name} movido para '{patch.stage}'",
    )
    return db_contact


@router.put("/contacts/{contact_id}/tags")
def set_contact_tags(
    contact_id: int,
    payload: TagIdsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_contact(contact_id, current_user, session)
    owned_tag_ids = {
        t.id for t in session.exec(select(Tag).where(Tag.owner_id == current_user.id, Tag.id.in_(payload.tag_ids))).all()
    }
    for link in session.exec(select(ContactTag).where(ContactTag.contact_id == contact_id)).all():
        session.delete(link)
    for tag_id in owned_tag_ids:
        session.add(ContactTag(contact_id=contact_id, tag_id=tag_id))
    session.commit()

    tags = session.exec(select(Tag).where(Tag.id.in_(owned_tag_ids))).all() if owned_tag_ids else []
    return [{"id": t.id, "name": t.name, "color": t.color} for t in tags]


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_contact = _get_owned_contact(contact_id, current_user, session)
    session.delete(db_contact)
    session.commit()
    return {"status": "deleted"}
