from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, Numeric, UniqueConstraint
from sqlmodel import Field, Session, SQLModel, create_engine

from config import settings

# --- MODELOS DE DADOS (TABELAS) ---


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str
    role: str = "user"  # user, admin
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    phone_number: Optional[str] = None  # E.164, ex: +5511999999999
    whatsapp_opted_in: bool = False


class PasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    title: str
    category: str = "Geral"
    completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    due_at: Optional[datetime] = None
    reminded_at: Optional[datetime] = None


class NotificationPreference(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("owner_id", "category", name="uq_notifpref_owner_category"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    category: str  # password_reset, task_reminder, daily_briefing, budget_alert
    email_enabled: bool = True
    whatsapp_enabled: bool = False


class Budget(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("owner_id", "category", name="uq_budget_owner_category"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    category: str
    monthly_limit: Decimal = Field(sa_column=Column(Numeric(12, 2)))


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    description: str
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2)))
    category: str = "Outros"
    type: str = "expense"  # income, expense
    date: date_type = Field(default_factory=date_type.today)


class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    role: str  # user, assistant
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# --- CONFIGURAÇÃO DO MOTOR ---

connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
