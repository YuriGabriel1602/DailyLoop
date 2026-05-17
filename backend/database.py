from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, Session, create_engine

from settings import settings


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str


class Mission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    status: str = "active"
    duration_minutes: int = 45
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str
    amount: float
    category: str = "Outros"
    type: str = "expense"
    date: str = Field(default_factory=lambda: datetime.now().isoformat())


class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    is_archived: bool = False


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    role: str
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    start_time: str
    location: Optional[str] = "Remoto"
    description: Optional[str] = None


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    print("DailyLoop database initialized.")


def get_session():
    with Session(engine) as session:
        yield session
