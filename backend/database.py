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
    dashboard_layout: Optional[str] = None  # JSON: ordem dos widgets do Painel, por usuário
    ai_provider_personal: str = "gemini"  # gemini, openai, anthropic — usado por ask_prometheus
    ai_provider_business: str = "gemini"  # usado por answer_conversation (Inbox)


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
    completed_at: Optional[datetime] = None


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
    realm: str = "pessoal"  # pessoal, empresarial — históricos de chat do Prometheus nunca se misturam
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# --- CRM / INBOX OMNICHANNEL ---


class Contact(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    name: str
    phone_number: Optional[str] = None
    channel: str = Field(index=True)  # whatsapp, instagram, facebook
    external_id: str = Field(index=True)  # id do contato na plataforma de origem
    stage: str = "novo"  # novo, qualificado, convertido, perdido
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Só preenchido pra contatos vindos do WhatsApp via QR Code (Baileys) — o JID
    # completo (ex: "5551999999999@s.whatsapp.net", ou "@lid" nos contatos mais novos)
    # é necessário pra ENVIAR de volta, já que `external_id` guarda só os dígitos do
    # telefone (convenção da Cloud API oficial) pra casar contatos vindos dos dois canais.
    whatsapp_jid: Optional[str] = None


class IntegrationCredential(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("owner_id", "channel", name="uq_integrationcred_owner_channel"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    channel: str  # whatsapp, instagram, facebook
    external_account_id: str = ""  # WABA ID / IG business ID / Page ID
    phone_number_id: str = ""  # só canal "whatsapp" — capturado automaticamente do primeiro
    # webhook recebido (value.metadata.phone_number_id), pois é o WABA ID (external_account_id)
    # que identifica a conta pra receber, mas o phone_number_id que identifica o número pra enviar.
    access_token_encrypted: str = ""
    status: str = "disconnected"  # disconnected, connected
    ai_default_mode: str = "24_7"  # 24_7, off
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Só relevante pro channel="whatsapp": "cloud_api" (Meta oficial, via token/Embedded
    # Signup) ou "qr" (número pessoal pareado via QR Code, sem ser a API oficial —
    # mesmo mecanismo do WhatsApp Pessoal, com risco de banimento pela Meta).
    connection_mode: str = "cloud_api"
    # Config extra por provedor de IA (channel="openai"/"anthropic"/"gemini") — os demais
    # canais (whatsapp/instagram/facebook) simplesmente nunca preenchem esses campos.
    custom_context: Optional[str] = None  # instrução extra só pra esse provedor
    monthly_token_limit: Optional[int] = None
    tokens_used_this_month: int = 0
    usage_reset_month: Optional[str] = None  # "2026-07" — zera o contador ao virar o mês


class BusinessAISettings(SQLModel, table=True):
    """Uma linha por usuário (criada sob demanda) — regras operacionais do atendimento
    automático do Inbox: horário, mensagem fora do expediente, filtro de grupos e watchdog."""

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", unique=True)
    hours_mode: str = "24_7"  # "24_7" | "custom"
    hours_start: str = "09:00"
    hours_end: str = "18:00"
    hours_days: str = '["mon","tue","wed","thu","fri","sat","sun"]'  # JSON
    # Fuso IANA em que hours_start/hours_end são interpretados — sem isso, a checagem de
    # horário comparava direto contra UTC, adiantando/atrasando o expediente conforme o
    # fuso de quem configurou.
    timezone: str = "America/Sao_Paulo"
    out_of_hours_message: str = (
        "Olá {{cliente}}, no momento estamos fora do horário de atendimento. Já te respondemos assim que possível!"
    )
    ignore_whatsapp_groups: bool = True
    watchdog_enabled: bool = True
    watchdog_inactivity_minutes: int = 30


class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    contact_id: int = Field(foreign_key="contact.id")
    channel: str  # whatsapp, instagram, facebook
    ai_enabled: bool = True
    status: str = "open"  # open, closed
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConversationMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    direction: str  # inbound, outbound
    sender: str  # contact, ai, agent
    content: str
    external_message_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    message_type: str = "text"  # text, image, unsupported
    media_path: Optional[str] = None  # caminho relativo em disco, só quando message_type="image"
    media_mime: Optional[str] = None


# --- ECOSSISTEMA PESSOAL ---


class PersonalContact(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    name: str
    relationship: str = "amigo"  # familia, amigo, mentor, outro
    last_contact_at: Optional[datetime] = None
    important_date: Optional[date_type] = None  # aniversário etc.
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class JournalEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    content: str
    ai_reflection: Optional[str] = None
    mood_score: Optional[int] = None  # 1-5
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Ritual(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    name: str
    steps: str = "[]"  # JSON: lista de strings
    area: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RitualLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ritual_id: int = Field(foreign_key="ritual.id")
    date: date_type = Field(default_factory=date_type.today)
    completed_steps: str = "[]"  # JSON: índices dos passos concluídos nesse dia


class Goal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    title: str
    target_date: Optional[date_type] = None
    progress_percent: int = 0
    area: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityLog(SQLModel, table=True):
    """Registro cronológico de eventos dos dois mundos (Empresarial/Pessoal) — só a
    tela de Logs (visível no lado Empresarial, como torre de controle) lê essa tabela;
    nenhum outro fluxo depende dela."""

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    realm: str  # "pessoal", "empresarial"
    action: str  # ex: "task.completed", "crm.stage_changed"
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HivePost(SQLModel, table=True):
    """Único lugar do sistema em que conteúdo cruza usuários — tudo o mais é isolado
    por owner_id. `content` já vem pronto (em português) de quem posta; conquistas
    (kind="achievement") nunca são geradas automaticamente, só quando o próprio usuário
    confirma o compartilhamento a partir de um marco real (streak de Ritual, meta 100%)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    content: str
    kind: str = "post"  # "post" | "achievement"
    source_type: Optional[str] = None  # "ritual_streak" | "goal_complete"
    likes_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class HiveLike(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="hivepost.id", index=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (UniqueConstraint("post_id", "owner_id", name="uq_hive_like_post_owner"),)


class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    name: str
    color: str  # hex, ex: "#3987e5"


class ContactTag(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("contact_id", "tag_id", name="uq_contacttag"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    contact_id: int = Field(foreign_key="contact.id", index=True)
    tag_id: int = Field(foreign_key="tag.id", index=True)


class EmailAccount(SQLModel, table=True):
    """Uma conta de email por usuário (Gmail/Outlook/outro, via IMAP/SMTP) — só traz os
    emails pra caixa unificada do Inbox nesta fase; a IA não responde email ainda."""

    __table_args__ = (UniqueConstraint("owner_id", name="uq_emailaccount_owner"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    email_address: str
    imap_host: str
    imap_port: int = 993
    smtp_host: str
    smtp_port: int = 587
    password_encrypted: str
    status: str = "disconnected"  # disconnected, connected
    last_synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WhatsappPersonalChat(SQLModel, table=True):
    """Uma conversa 1-a-1 do WhatsApp Pessoal (via sidecar Baileys) — separado de
    Contact/Conversation (que são do CRM de leads do WhatsApp Business, com stage/
    ai_enabled que não fazem sentido aqui) de propósito."""

    __table_args__ = (UniqueConstraint("owner_id", "jid", name="uq_wa_personal_chat_owner_jid"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    jid: str = Field(index=True)  # remoteJid do Baileys, ex "5551999999999@s.whatsapp.net"
    name: str = ""
    phone_number: str = ""
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived: bool = False
    unread_count: int = 0
    # False pra contatos sincronizados da agenda que nunca trocaram mensagem — só vira
    # True quando a primeira mensagem de fato é registrada, pra não misturar "contato
    # conhecido" com "conversa real" na ordenação da lista.
    has_conversation: bool = False


class WhatsappPersonalMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    chat_id: int = Field(foreign_key="whatsapppersonalchat.id", index=True)
    direction: str  # inbound, outbound
    message_type: str = "text"  # text, image, unsupported
    content: str = ""  # texto / legenda da imagem / rótulo do placeholder de mídia não suportada
    media_path: Optional[str] = None  # caminho relativo em disco, só quando message_type="image"
    media_mime: Optional[str] = None
    external_message_id: str = ""
    status: str = "sent"  # sent, failed — só relevante pra outbound
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GoogleCalendarEvent(SQLModel, table=True):
    """Espelho local dos eventos do Google Calendar do dono — a Agenda passa a ler
    daqui (rápido, sem depender da API do Google no ar) em vez de buscar ao vivo a
    cada carregamento de tela. `services/google_calendar_sync_service.py` faz o
    upsert periódico; `attendees_json`/`recurrence_json` guardam os campos que o
    Google manda como lista/objeto, sem tabela própria (não são consultados por
    coluna, só exibidos por inteiro no detalhe do evento)."""

    __table_args__ = (UniqueConstraint("owner_id", "google_event_id", name="uq_google_calendar_event"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    google_event_id: str = Field(index=True)
    title: str = "(sem título)"
    description: Optional[str] = None
    location: Optional[str] = None
    start_at: datetime = Field(index=True)
    end_at: datetime
    all_day: bool = False
    timezone: Optional[str] = None
    status: str = "confirmed"  # confirmed, tentative, cancelled
    html_link: Optional[str] = None
    hangout_link: Optional[str] = None
    creator_email: Optional[str] = None
    organizer_email: Optional[str] = None
    organizer_name: Optional[str] = None
    attendees_json: Optional[str] = None  # JSON: [{email, name, response_status}]
    recurring_event_id: Optional[str] = None
    recurrence_json: Optional[str] = None  # JSON: regras RRULE cruas do Google
    color_id: Optional[str] = None
    visibility: Optional[str] = None
    transparency: Optional[str] = None  # opaque (ocupado) / transparent (livre)
    google_created_at: Optional[datetime] = None
    google_updated_at: Optional[datetime] = None
    synced_at: datetime = Field(default_factory=datetime.utcnow)


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
        ("task", "completed_at", "ALTER TABLE task ADD COLUMN completed_at DATETIME"),
        ("user", "dashboard_layout", "ALTER TABLE user ADD COLUMN dashboard_layout VARCHAR"),
        ("user", "ai_provider_personal", "ALTER TABLE user ADD COLUMN ai_provider_personal VARCHAR DEFAULT 'gemini'"),
        ("user", "ai_provider_business", "ALTER TABLE user ADD COLUMN ai_provider_business VARCHAR DEFAULT 'gemini'"),
        ("message", "realm", "ALTER TABLE message ADD COLUMN realm VARCHAR DEFAULT 'pessoal'"),
        ("integrationcredential", "custom_context", "ALTER TABLE integrationcredential ADD COLUMN custom_context VARCHAR"),
        ("integrationcredential", "monthly_token_limit", "ALTER TABLE integrationcredential ADD COLUMN monthly_token_limit INTEGER"),
        ("integrationcredential", "tokens_used_this_month", "ALTER TABLE integrationcredential ADD COLUMN tokens_used_this_month INTEGER DEFAULT 0"),
        ("integrationcredential", "usage_reset_month", "ALTER TABLE integrationcredential ADD COLUMN usage_reset_month VARCHAR"),
        ("integrationcredential", "phone_number_id", "ALTER TABLE integrationcredential ADD COLUMN phone_number_id VARCHAR DEFAULT ''"),
        ("businessaisettings", "timezone", "ALTER TABLE businessaisettings ADD COLUMN timezone VARCHAR DEFAULT 'America/Sao_Paulo'"),
        ("whatsapppersonalchat", "archived", "ALTER TABLE whatsapppersonalchat ADD COLUMN archived BOOLEAN DEFAULT 0"),
        ("whatsapppersonalchat", "unread_count", "ALTER TABLE whatsapppersonalchat ADD COLUMN unread_count INTEGER DEFAULT 0"),
        ("whatsapppersonalchat", "has_conversation", "ALTER TABLE whatsapppersonalchat ADD COLUMN has_conversation BOOLEAN DEFAULT 0"),
        ("contact", "whatsapp_jid", "ALTER TABLE contact ADD COLUMN whatsapp_jid VARCHAR"),
        ("integrationcredential", "connection_mode", "ALTER TABLE integrationcredential ADD COLUMN connection_mode VARCHAR DEFAULT 'cloud_api'"),
        ("conversationmessage", "message_type", "ALTER TABLE conversationmessage ADD COLUMN message_type VARCHAR DEFAULT 'text'"),
        ("conversationmessage", "media_path", "ALTER TABLE conversationmessage ADD COLUMN media_path VARCHAR"),
        ("conversationmessage", "media_mime", "ALTER TABLE conversationmessage ADD COLUMN media_mime VARCHAR"),
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
