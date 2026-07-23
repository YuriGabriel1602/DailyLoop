from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlmodel import Session, select

from database import HiveLike, HivePost, User, engine, get_session
from services import activity_log_service
from services.auth_service import decode_user_id, get_current_user
from services.hive_manager import manager

router = APIRouter(prefix="/api/hive", tags=["hive"])


class PostCreate(BaseModel):
    content: str
    kind: str = "post"
    source_type: Optional[str] = None


def _get_owned_post(post_id: int, current_user: User, session: Session) -> HivePost:
    post = session.get(HivePost, post_id)
    if not post or post.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return post


def _serialize(post: HivePost, author: User, liked_post_ids: set[int]) -> dict:
    return {
        "id": post.id,
        "owner_id": post.owner_id,
        "author": author.username,
        "content": post.content,
        "kind": post.kind,
        "source_type": post.source_type,
        "likes_count": post.likes_count,
        "liked_by_me": post.id in liked_post_ids,
        "created_at": post.created_at.isoformat(),
    }


@router.get("/posts")
def list_posts(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(HivePost, User)
        .join(User, User.id == HivePost.owner_id)
        .order_by(HivePost.created_at.desc())
        .limit(limit)
    ).all()
    post_ids = [post.id for post, _ in rows]
    liked_post_ids = set(
        session.exec(
            select(HiveLike.post_id).where(HiveLike.owner_id == current_user.id, HiveLike.post_id.in_(post_ids))
        ).all()
    ) if post_ids else set()
    return [_serialize(post, author, liked_post_ids) for post, author in rows]


@router.post("/posts")
async def create_post(
    payload: PostCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if payload.kind not in ("post", "achievement"):
        raise HTTPException(status_code=400, detail="kind inválido")
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Post vazio")

    post = HivePost(
        owner_id=current_user.id,
        content=payload.content.strip(),
        kind=payload.kind,
        source_type=payload.source_type,
    )
    session.add(post)
    session.commit()
    session.refresh(post)

    activity_log_service.log(
        session, current_user.id, "pessoal",
        "hive.achievement_shared" if payload.kind == "achievement" else "hive.post_created",
        "Publicou no The Hive" if payload.kind == "post" else post.content,
    )

    serialized = _serialize(post, current_user, set())
    await manager.broadcast({"type": "post_created", "post": serialized})
    return serialized


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    post = _get_owned_post(post_id, current_user, session)
    for like in session.exec(select(HiveLike).where(HiveLike.post_id == post_id)).all():
        session.delete(like)
    session.delete(post)
    session.commit()
    await manager.broadcast({"type": "post_deleted", "post_id": post_id})
    return {"status": "deleted"}


@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    post = session.get(HivePost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    existing = session.exec(
        select(HiveLike).where(HiveLike.post_id == post_id, HiveLike.owner_id == current_user.id)
    ).first()
    if not existing:
        session.add(HiveLike(post_id=post_id, owner_id=current_user.id))
        post.likes_count += 1
        session.add(post)
        session.commit()
        await manager.broadcast({"type": "like_changed", "post_id": post_id, "likes_count": post.likes_count})
    return {"likes_count": post.likes_count, "liked_by_me": True}


@router.delete("/posts/{post_id}/like")
async def unlike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    post = session.get(HivePost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    existing = session.exec(
        select(HiveLike).where(HiveLike.post_id == post_id, HiveLike.owner_id == current_user.id)
    ).first()
    if existing:
        session.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        session.add(post)
        session.commit()
        await manager.broadcast({"type": "like_changed", "post_id": post_id, "likes_count": post.likes_count})
    return {"likes_count": post.likes_count, "liked_by_me": False}


@router.websocket("/ws")
async def hive_ws(websocket: WebSocket, token: str = ""):
    user_id = decode_user_id(token)
    if not user_id:
        await websocket.close(code=4401)
        return

    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user or not user.is_active:
            await websocket.close(code=4401)
            return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
