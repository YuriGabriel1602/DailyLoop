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
    phone_verified: bool = False
    whatsapp_opted_in: bool = False


class PasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PhoneVerificationCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    phone_number: str
    code: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    title: str
    category: str = "Geral"
    priority: str = "normal"  # baixa, normal, alta
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


def _run_lightweight_migrations():
    """SQLite não altera colunas de tabelas já existentes com create_all — sem isso,
    adicionar um Field novo a um modelo que já tem tabela criada no banco de dev
    quebraria com "no such column" em vez de simplesmente aparecer com o default."""
    migrations = [
        ("task", "priority", "ALTER TABLE task ADD COLUMN priority VARCHAR DEFAULT 'normal'"),
    ]
    with engine.connect() as conn:
        for table_name, column_name, ddl in migrations:
            existing = {row[1] for row in conn.exec_driver_sql(f'PRAGMA table_info("{table_name}")')}
            if not existing or column_name in existing:
                continue
            conn.exec_driver_sql(ddl)
        conn.commit()


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _run_lightweight_migrations()


def get_session():
    with Session(engine) as session:
        yield session
