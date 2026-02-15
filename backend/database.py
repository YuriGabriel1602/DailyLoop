from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session, select
from datetime import datetime

# --- MODELOS DE DADOS (TABELAS) ---

class User(SQLModel, table=True):
    """Tabela de utilizadores para futura expansão de conta."""
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str

class Mission(SQLModel, table=True):
    """Tabela de Missões/Tarefas do Timer."""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    status: str = "active" # active, completed, paused
    duration_minutes: int = 45
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None

class Transaction(SQLModel, table=True):
    """Tabela de Finanças (Fluxo de Caixa)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str
    amount: float
    category: str = "Outros"
    type: str = "expense" # income, expense
    date: str = Field(default_factory=lambda: datetime.now().isoformat())

class Note(SQLModel, table=True):
    """Tabela de Notas Rápidas (Memória)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    is_archived: bool = False

class Message(SQLModel, table=True):
    """Histórico de conversas com o Prometheus."""
    id: Optional[int] = Field(default=None, primary_key=True)
    role: str # user, assistant
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class Event(SQLModel, table=True):
    """Eventos da Agenda/Calendário."""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    start_time: str
    location: Optional[str] = "Remoto"
    description: Optional[str] = None

# --- CONFIGURAÇÃO DO MOTOR (SQLITE) ---

# O nome do ficheiro onde os dados serão guardados fisicamente
sqlite_file_name = "dailyloop_brain.db"
sqlite_url = f"sqlite:///./{sqlite_file_name}"

# check_same_thread=False é obrigatório para o FastAPI lidar com múltiplas requisições no SQLite
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """
    Cria o ficheiro .db e gera todas as tabelas definidas acima.
    Esta função é chamada pelo main.py no arranque do servidor.
    """
    SQLModel.metadata.create_all(engine)
    print("🧠 Banco de dados inicializado: Tabelas prontas.")

def get_session():
    """
    Dependency Injection para as rotas do FastAPI.
    Garante que cada pedido abra e feche a sua própria sessão.
    """
    with Session(engine) as session:
        yield session