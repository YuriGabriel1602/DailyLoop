from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ai_logic import predict_category, train_categorizer
from ai_service import ask_prometheus
from content_engine import search_youtube_videos
from database import Message, Mission, Transaction, create_db_and_tables, get_session
from settings import settings
from weather_service import get_current_weather

finance_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global finance_model
    create_db_and_tables()
    finance_model = train_categorizer()
    print("DailyLoop backend online.")
    yield


app = FastAPI(title="DailyLoop OS Core", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


@app.get("/")
def root():
    return {"service": "DailyLoop OS Core", "status": "online"}


@app.get("/api/health")
def health():
    return {
        "service": "dailyloop-core",
        "status": "online",
        "ai_configured": bool(settings.gemini_api_key),
    }


@app.post("/api/chat")
async def chat(request: ChatRequest, session: Session = Depends(get_session)):
    clean_message = request.message.strip()
    if not clean_message:
        raise HTTPException(status_code=400, detail="Message is required.")

    session.add(Message(role="user", content=clean_message, timestamp=datetime.now().isoformat()))
    response = ask_prometheus(clean_message)
    session.add(Message(role="assistant", content=response, timestamp=datetime.now().isoformat()))
    session.commit()
    return {"response": response}


@app.get("/api/chat/history")
def get_chat_history(session: Session = Depends(get_session)):
    statement = select(Message).order_by(Message.id.desc()).limit(50)
    results = session.exec(statement).all()
    return results[::-1]


@app.post("/api/finance")
async def add_transaction(t: Transaction, session: Session = Depends(get_session)):
    if t.category == "Outros" and finance_model:
        t.category = predict_category(finance_model, t.description)

    t.date = datetime.now().isoformat()
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@app.get("/api/finance/summary")
def get_finance_summary(session: Session = Depends(get_session)):
    transactions = session.exec(select(Transaction)).all()
    total = sum(item.amount for item in transactions)
    return {"balance": total, "history": transactions[-10:]}


@app.post("/api/missions")
async def create_mission(m: Mission, session: Session = Depends(get_session)):
    m.created_at = datetime.now().isoformat()
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


@app.get("/api/missions/active")
def get_active_mission(session: Session = Depends(get_session)):
    mission = session.exec(select(Mission).where(Mission.status == "active")).first()
    return mission if mission else {"status": "none"}


@app.get("/api/weather")
async def weather():
    data = await get_current_weather()
    if data is None:
        raise HTTPException(status_code=503, detail="Weather service unavailable.")
    return data


@app.get("/api/search/youtube")
def search_yt(q: str):
    if not settings.youtube_api_key:
        raise HTTPException(status_code=503, detail="YouTube API key is not configured.")
    return search_youtube_videos(settings.youtube_api_key, q)
