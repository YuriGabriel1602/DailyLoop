from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import ContactTag, Tag, User, get_session
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str
    color: str


def _get_owned_tag(tag_id: int, current_user: User, session: Session) -> Tag:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    return tag


@router.get("")
def list_tags(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(Tag).where(Tag.owner_id == current_user.id).order_by(Tag.name)).all()


@router.post("")
def create_tag(
    payload: TagCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Nome da tag não pode ser vazio")
    tag = Tag(owner_id=current_user.id, name=payload.name.strip(), color=payload.color)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tag = _get_owned_tag(tag_id, current_user, session)
    for link in session.exec(select(ContactTag).where(ContactTag.tag_id == tag_id)).all():
        session.delete(link)
    session.delete(tag)
    session.commit()
    return {"status": "deleted"}
