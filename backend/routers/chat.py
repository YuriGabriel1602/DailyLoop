from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Message, User, get_session
from services.ai_service import ask_prometheus
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Carrega o histórico (mensagens já persistidas) antes de gravar a mensagem atual,
    # senão o autoflush do SQLAlchemy a incluiria duas vezes no contexto do modelo.
    response = ask_prometheus(session, current_user, request.message)
    session.add(Message(role="user", content=request.message, owner_id=current_user.id))
    session.add(Message(role="assistant", content=response, owner_id=current_user.id))
    session.commit()
    return {"response": response}


@router.get("/history")
def get_chat_history(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    statement = (
        select(Message)
        .where(Message.owner_id == current_user.id)
        .order_by(Message.id.desc())
        .limit(50)
    )
    results = session.exec(statement).all()
    return list(reversed(results))
