from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import Message, get_session
from services.ai_service import ask_prometheus

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chat(request: ChatRequest, session: Session = Depends(get_session)):
    session.add(Message(role="user", content=request.message))
    response = ask_prometheus(request.message)
    session.add(Message(role="assistant", content=response))
    session.commit()
    return {"response": response}


@router.get("/history")
def get_chat_history(session: Session = Depends(get_session)):
    statement = select(Message).order_by(Message.id.desc()).limit(50)
    results = session.exec(statement).all()
    return list(reversed(results))
