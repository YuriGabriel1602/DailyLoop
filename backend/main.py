from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# Importamos tudo direto do database.py (onde as tabelas agora vivem)
from database import create_db_and_tables, get_session, Mission, Transaction, Note, Message, Event
from ai_service import ask_prometheus
from ai_logic import train_categorizer, predict_category
from weather_service import get_current_weather
from content_engine import search_youtube_videos

app = FastAPI(title="DailyLoop OS Core v2.0")

# --- SEGURANÇA (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de IA Financeira (Scikit-Learn)
finance_model = None

@app.on_event("startup")
def on_startup():
    global finance_model
    create_db_and_tables()
    # Treina a IA de finanças local
    finance_model = train_categorizer()
    print("🚀 DailyLoop Backend: Sistemas Online e IA Treinada.")

# --- MÓDULO: CHAT PROMETHEUS ---
class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat(request: ChatRequest, session: Session = Depends(get_session)):
    # 1. Salva pergunta do usuário
    session.add(Message(role="user", content=request.message, timestamp=datetime.now().isoformat()))
    
    # 2. IA Prometheus (Gemini + Fallback Tático)
    response = ask_prometheus(request.message)
    
    # 3. Salva resposta da IA
    session.add(Message(role="assistant", content=response, timestamp=datetime.now().isoformat()))
    session.commit()
    
    return {"response": response}

@app.get("/api/chat/history")
def get_chat_history(session: Session = Depends(get_session)):
    statement = select(Message).order_by(Message.id.desc()).limit(50)
    results = session.exec(statement).all()
    return results[::-1]

# --- MÓDULO: FINANÇAS ---
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

# --- MÓDULO: MISSÕES (TIMER) ---
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

# --- MÓDULO: UTILIDADES ---
@app.get("/api/weather")
async def weather():
    return await get_current_weather()

@app.get("/api/search/youtube")
def search_yt(q: str):
    import os
    key = os.getenv("YOUTUBE_API_KEY")
    return search_youtube_videos(key, q)