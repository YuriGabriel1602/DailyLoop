import sys
import os
import traceback
from datetime import datetime
import requests # <--- MUDAMOS PARA REQUESTS (Muito mais estável)
import uvicorn
from dotenv import load_dotenv

# ==============================================================================
# CORREÇÃO DE PATH E DETETIVE DE .ENV
# ==============================================================================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
os.chdir(CURRENT_DIR)

env_path_backend = os.path.join(CURRENT_DIR, ".env")
env_path_root = os.path.join(os.path.dirname(CURRENT_DIR), ".env")

print("\n" + "="*60)
print("🔍 INICIANDO BUSCA PELO FICHEIRO .ENV...")

if os.path.exists(env_path_backend):
    print(f"✅ Ficheiro .env ENCONTRADO na pasta backend: {env_path_backend}")
    load_dotenv(dotenv_path=env_path_backend, override=True)
elif os.path.exists(env_path_root):
    print(f"✅ Ficheiro .env ENCONTRADO na pasta raiz: {env_path_root}")
    load_dotenv(dotenv_path=env_path_root, override=True)
else:
    print("❌ ALERTA CRÍTICO: Nenhum ficheiro .env foi encontrado!")
    load_dotenv(override=True)
print("="*60 + "\n")

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel

# Importações do seu sistema
from database import create_db_and_tables, get_session, Mission, Transaction, Note, Message, Event
from ai_service import ask_prometheus
from ai_logic import train_categorizer

app = FastAPI(title="DailyLoop OS Core v3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

finance_model = None

@app.on_event("startup")
def on_startup():
    global finance_model
    create_db_and_tables()
    finance_model = train_categorizer()
    print("🚀 DailyLoop Backend: Sistemas Online e IA Treinada.")

@app.get("/")
def read_root():
    return {"status": "online", "system": "DailyLoop v3.0"}

@app.get("/api/config")
def get_frontend_config():
    return {
        "spotify_client_id": os.getenv("VITE_SPOTIFY_CLIENT_ID", "") or os.getenv("SPOTIFY_CLIENT_ID", ""),
        "youtube_api_key": os.getenv("VITE_YOUTUBE_API_KEY", "") 
    }

# =============================================================================
# MÓDULO: SEGUNDO CÉREBRO (NOTION) - AGORA COM REQUESTS
# =============================================================================
class NoteCreate(BaseModel):
    content: str

@app.post("/api/notes")
def create_note(note: NoteCreate):
    print("\n" + "="*60)
    print(f"📝 1. SINAL RECEBIDO DO DASHBOARD: '{note.content}'")
    
    raw_key = os.getenv("NOTION_API_KEY", "")
    raw_db = os.getenv("NOTION_DATABASE_ID", "")

    notion_key = raw_key.strip(' "\'') if raw_key else ""
    database_id = raw_db.strip(' "\'') if raw_db else ""

    if not notion_key:
        print("❌ 2. ERRO: NOTION_API_KEY não foi encontrada na memória do Python!")
    else:
        print(f"✅ 2. CHAVE API ENCONTRADA: {notion_key[:5]}...{notion_key[-4:]} (Tam: {len(notion_key)})")

    if not database_id:
        print("❌ 3. ERRO: NOTION_DATABASE_ID não foi encontrado na memória do Python!")
    else:
        print(f"✅ 3. DATABASE ID ENCONTRADO: {database_id[:5]}...{database_id[-4:]} (Tam: {len(database_id)})")

    if not notion_key or not database_id:
        print("⚠️ OPERAÇÃO CANCELADA: Faltam chaves.")
        print("="*60 + "\n")
        raise HTTPException(status_code=400, detail="Chaves do Notion ausentes no .env")

    print("🔄 4. A comunicar com os servidores do Notion...")
    url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {notion_key}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    payload = {
        "parent": {"database_id": database_id},
        "properties": {
            "Name": {
                "title": [{"text": {"content": note.content}}]
            }
        },
        "children": [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [{"type": "text", "text": {"content": note.content}}]}
            }
        ]
    }
    
    try:
        # Usando a biblioteca requests (muito mais robusta no Windows)
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            print("✅ 5. SUCESSO ABSOLUTO! A nota está no seu Notion.")
            print("="*60 + "\n")
            return {"status": "success", "message": "Nota processada."}
        else:
            print(f"❌ 5. O NOTION RECUSOU A NOTA! (Código HTTP {response.status_code})")
            print(f"MOTIVO EXATO DADO PELO NOTION: {response.text}")
            print("="*60 + "\n")
            raise HTTPException(status_code=400, detail="O Notion recusou a nota.")
            
    except Exception as e:
        print(f"❌ 5. ERRO DE REDE FATAL (Detalhes):")
        print(traceback.format_exc()) # Imprime o erro completo na tela!
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail="Erro de rede interno.")

# =============================================================================
# MÓDULO: CHAT PROMETHEUS
# =============================================================================
class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat(request: ChatRequest, session: Session = Depends(get_session)):
    session.add(Message(role="user", content=request.message, timestamp=datetime.now().isoformat()))
    response = ask_prometheus(request.message)
    session.add(Message(role="assistant", content=response, timestamp=datetime.now().isoformat()))
    session.commit()
    return {"response": response}

@app.get("/api/chat/history")
def get_chat_history(session: Session = Depends(get_session)):
    statement = select(Message).order_by(Message.id.desc()).limit(50)
    results = session.exec(statement).all()
    return results[::-1]

if __name__ == "__main__":
    print("🧠 Motor DailyLoop ligado. À escuta na porta 8000...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)