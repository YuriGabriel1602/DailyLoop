import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal

from google import genai
from google.genai import types
from sqlmodel import Session, select

from config import settings
from database import (
    Budget,
    Contact,
    Conversation,
    ConversationMessage,
    Goal,
    IntegrationCredential,
    Message,
    PersonalContact,
    Ritual,
    RitualLog,
    Task,
    Transaction,
    User,
)
from services import crypto_service

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")

SYSTEM_PROMPT = """
Você é o Prometheus, o assistente pessoal do DailyLoop — o lado Pessoal, especificamente.

Você tem ferramentas que consultam as tarefas e as finanças reais do usuário — use-as
sempre que a pergunta depender desses dados, em vez de adivinhar ou responder de forma
genérica. Também pode criar uma tarefa nova ou marcar uma tarefa existente como concluída
quando o usuário pedir isso na conversa.

Tom: caloroso, direto, como alguém que realmente olhou os dados — não como um chatbot
genérico. Use Markdown (negrito, listas) quando ajudar a clareza, sem exagerar.

Nunca fale sobre CRM, leads, atendimento de clientes ou integrações de negócio — isso é
o lado Empresarial do app, um contexto totalmente separado. Se perguntarem sobre isso,
diga rapidamente que esse assunto fica no modo Empresarial.
""".strip()

BUSINESS_ADVISOR_SYSTEM_PROMPT = """
Você é o Prometheus, mas aqui no papel de consultor de negócios — o lado Empresarial do
DailyLoop, um contexto totalmente separado do assistente pessoal.

Você tem ferramentas que consultam o pipeline de CRM e o estado do Inbox de atendimento
reais do usuário — use-as sempre que a pergunta depender desses dados.

Tom: direto, objetivo, orientado a resultado — como um analista que acabou de abrir o
funil de vendas, não um assistente pessoal. Use Markdown quando ajudar a clareza.

Nunca fale sobre tarefas pessoais, finanças pessoais, diário, rituais ou vida pessoal do
usuário — isso é o lado Pessoal do app, um contexto totalmente separado. Se perguntarem
sobre isso, diga rapidamente que esse assunto fica no modo Pessoal.
""".strip()

HISTORY_LIMIT = 20


def _get_provider_api_key(session: Session, user: User, provider: str) -> str | None:
    """Chave de API do provedor (OpenAI/Anthropic), guardada por usuário em
    `IntegrationCredential` — o mesmo lugar que os canais de mensageria usam. Gemini
    continua vindo de `settings.gemini_api_key` (nível do servidor, comportamento
    existente antes do motor plugável)."""
    cred = session.exec(
        select(IntegrationCredential).where(
            IntegrationCredential.owner_id == user.id,
            IntegrationCredential.channel == provider,
            IntegrationCredential.status == "connected",
        )
    ).first()
    if not cred or not cred.access_token_encrypted:
        return None
    return crypto_service.decrypt(cred.access_token_encrypted)


def _generate_gemini(system_prompt: str, history: list[dict], prompt: str, tools=None) -> str:
    if not _client:
        return "Erro: Chave API do Gemini ausente no servidor backend."
    gemini_history = [
        types.Content(role="model" if h["role"] == "assistant" else "user", parts=[types.Part(text=h["content"])])
        for h in history
    ]
    chat = _client.chats.create(
        model="gemini-flash-latest",
        config=types.GenerateContentConfig(system_instruction=system_prompt, tools=tools or []),
        history=gemini_history,
    )
    response = chat.send_message(prompt)
    return response.text.strip()


def _generate_openai(api_key: str | None, system_prompt: str, history: list[dict], prompt: str) -> str:
    if not api_key:
        return "Erro: Conecte sua chave da OpenAI em Integrações."
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(model=OPENAI_MODEL, messages=messages)
    return (response.choices[0].message.content or "").strip()


def _generate_anthropic(api_key: str | None, system_prompt: str, history: list[dict], prompt: str) -> str:
    if not api_key:
        return "Erro: Conecte sua chave da Anthropic em Integrações."
    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    messages = [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": prompt})
    response = client.messages.create(
        model=ANTHROPIC_MODEL, max_tokens=1024, system=system_prompt, messages=messages
    )
    return "".join(block.text for block in response.content if block.type == "text").strip()


def _generate(session: Session, user: User, provider: str, system_prompt: str, history: list[dict], prompt: str, tools=None) -> str:
    """Dispatcher único pros três provedores — ferramentas (`tools`) só existem no
    branch do Gemini hoje; OpenAI/Anthropic respondem em texto puro (sem function
    calling) nesta primeira versão do motor plugável."""
    try:
        if provider == "openai":
            return _generate_openai(_get_provider_api_key(session, user, "openai"), system_prompt, history, prompt)
        if provider == "anthropic":
            return _generate_anthropic(_get_provider_api_key(session, user, "anthropic"), system_prompt, history, prompt)
        return _generate_gemini(system_prompt, history, prompt, tools)
    except Exception:
        logger.exception("Falha ao chamar o provedor de IA '%s'", provider)
        return "O núcleo de IA está processando em modo offline. Tente novamente em breve."


def _load_history(session: Session, user: User, realm: str = "pessoal") -> list[dict]:
    messages = session.exec(
        select(Message)
        .where(Message.owner_id == user.id, Message.realm == realm)
        .order_by(Message.id.desc())
        .limit(HISTORY_LIMIT)
    ).all()
    messages.reverse()
    return [{"role": "assistant" if m.role == "assistant" else "user", "content": m.content} for m in messages]


def _make_tools(session: Session, user: User):
    def get_tasks_summary() -> dict:
        """Retorna as tarefas pendentes do usuário: total em aberto, quais estão atrasadas
        e quais vencem hoje, cada uma com título e prazo."""
        tasks = session.exec(
            select(Task).where(Task.owner_id == user.id, Task.completed == False)  # noqa: E712
        ).all()
        now = datetime.utcnow()
        overdue = [t for t in tasks if t.due_at and t.due_at < now]
        due_today = [t for t in tasks if t.due_at and t.due_at.date() == now.date()]
        return {
            "total_pendentes": len(tasks),
            "atrasadas": [{"titulo": t.title, "prazo": t.due_at.isoformat()} for t in overdue],
            "vencem_hoje": [{"titulo": t.title, "prazo": t.due_at.isoformat()} for t in due_today],
            "todas_pendentes": [t.title for t in tasks],
        }

    def get_finance_summary() -> dict:
        """Retorna o saldo do mês atual, total de entradas, total de saídas, gasto por
        categoria e quais orçamentos (metas mensais por categoria) já estouraram o limite."""
        today = datetime.utcnow().date()
        transactions = session.exec(
            select(Transaction).where(Transaction.owner_id == user.id)
        ).all()
        budgets = session.exec(select(Budget).where(Budget.owner_id == user.id)).all()

        month_txns = [t for t in transactions if t.date.year == today.year and t.date.month == today.month]
        income = sum((t.amount for t in month_txns if t.type == "income"), Decimal("0"))
        expenses = sum((t.amount for t in month_txns if t.type == "expense"), Decimal("0"))
        by_category: dict[str, Decimal] = {}
        for t in month_txns:
            if t.type == "expense":
                by_category[t.category] = by_category.get(t.category, Decimal("0")) + t.amount

        over_budget = []
        for b in budgets:
            spent = by_category.get(b.category, Decimal("0"))
            if spent > b.monthly_limit:
                over_budget.append({"categoria": b.category, "gasto": str(spent), "limite": str(b.monthly_limit)})

        return {
            "saldo_do_mes": str(income - expenses),
            "entradas_do_mes": str(income),
            "saidas_do_mes": str(expenses),
            "gasto_por_categoria": {k: str(v) for k, v in by_category.items()},
            "orcamentos_estourados": over_budget,
        }

    def create_task(title: str, due_at: str = "") -> dict:
        """Cria uma nova tarefa para o usuário. `due_at` é opcional — se informado, deve
        ser uma data/hora ISO 8601 (ex: 2026-07-20T15:00:00); deixe vazio se não houver prazo."""
        parsed_due = None
        if due_at:
            try:
                parsed_due = datetime.fromisoformat(due_at)
            except ValueError:
                return {"criada": False, "erro": "Formato de data inválido, use ISO 8601."}
        task = Task(title=title, owner_id=user.id, due_at=parsed_due)
        session.add(task)
        session.commit()
        session.refresh(task)
        return {"criada": True, "id": task.id, "titulo": task.title}

    def complete_task(title: str) -> dict:
        """Marca como concluída a tarefa pendente do usuário cujo título mais se parece
        com o texto informado. Retorna encontrada=false se nenhuma tarefa pendente combinar."""
        tasks = session.exec(
            select(Task).where(Task.owner_id == user.id, Task.completed == False)  # noqa: E712
        ).all()
        match = next((t for t in tasks if title.lower() in t.title.lower()), None)
        if not match:
            return {"encontrada": False}
        match.completed = True
        session.add(match)
        session.commit()
        return {"encontrada": True, "titulo": match.title}

    return [get_tasks_summary, get_finance_summary, create_task, complete_task]


def ask_prometheus(session: Session, user: User, prompt: str) -> str:
    """Interface principal de comunicação com a IA — reinjeta o histórico recente da
    conversa e (só no Gemini) dá ao modelo ferramentas de leitura/ação sobre tarefas e
    finanças reais. Provedor resolvido por `user.ai_provider_personal`."""
    provider = user.ai_provider_personal or "gemini"
    tools = _make_tools(session, user) if provider == "gemini" else None
    return _generate(session, user, provider, SYSTEM_PROMPT, _load_history(session, user, "pessoal"), prompt, tools=tools)


def _make_business_tools(session: Session, user: User):
    def get_crm_pipeline() -> dict:
        """Retorna quantos contatos (leads) o usuário tem em cada estágio do funil de CRM
        (novo, qualificado, convertido, perdido)."""
        contacts = session.exec(select(Contact).where(Contact.owner_id == user.id)).all()
        counts: dict[str, int] = {}
        for c in contacts:
            counts[c.stage] = counts.get(c.stage, 0) + 1
        return counts

    def get_inbox_summary() -> dict:
        """Retorna quantas conversas de atendimento estão abertas, quantas a IA está
        respondendo automaticamente e quantas foram pausadas manualmente."""
        conversations = session.exec(select(Conversation).where(Conversation.owner_id == user.id)).all()
        return {
            "conversas_abertas": sum(1 for c in conversations if c.status == "open"),
            "ia_respondendo": sum(1 for c in conversations if c.ai_enabled),
            "pausadas_manualmente": sum(1 for c in conversations if not c.ai_enabled),
        }

    return [get_crm_pipeline, get_inbox_summary]


DAILY_BRIEFING_PROMPT = """
Você é o Prometheus. Escreva um parágrafo curto (4-6 frases) de bom dia pro usuário,
como uma "carta do dia" — não uma lista, um texto corrido e caloroso, citando só os
dados reais abaixo que fizerem sentido (não force todos se algum estiver vazio/zerado).
Não invente nada que não esteja nos dados. Sem saudação genérica tipo "Espero que tenha
um ótimo dia" — vá direto ao que importa.
""".strip()


def generate_daily_briefing(session: Session, user: User) -> str:
    """Junta um retrato real do dia (tarefas, rituais, metas, pessoas esfriando, saldo)
    e pede pro provedor pessoal do usuário escrever isso como um parágrafo corrido —
    a 'Carta do Dia' do Painel."""
    today = datetime.utcnow().date()
    tasks = session.exec(select(Task).where(Task.owner_id == user.id, Task.completed == False)).all()  # noqa: E712
    overdue = [t for t in tasks if t.due_at and t.due_at.date() < today]

    rituals = session.exec(select(Ritual).where(Ritual.owner_id == user.id)).all()
    streak_lines = []
    for r in rituals:
        logs = session.exec(select(RitualLog).where(RitualLog.ritual_id == r.id)).all()
        done_dates = {log.date for log in logs if log.completed_steps != "[]"}
        streak = 0
        cursor = today
        while cursor in done_dates:
            streak += 1
            cursor -= timedelta(days=1)
        streak_lines.append(f"{r.name}: streak de {streak} dias")

    goals = session.exec(select(Goal).where(Goal.owner_id == user.id)).all()
    cold_contacts = [
        c.name
        for c in session.exec(select(PersonalContact).where(PersonalContact.owner_id == user.id)).all()
        if c.last_contact_at is None or (datetime.utcnow() - c.last_contact_at).days >= 14
    ]

    month_txns = session.exec(select(Transaction).where(Transaction.owner_id == user.id)).all()
    month_txns = [t for t in month_txns if t.date.year == today.year and t.date.month == today.month]
    income = sum((t.amount for t in month_txns if t.type == "income"), Decimal("0"))
    expenses = sum((t.amount for t in month_txns if t.type == "expense"), Decimal("0"))

    data_summary = f"""
Tarefas pendentes: {len(tasks)} (atrasadas: {len(overdue)}{': ' + ', '.join(t.title for t in overdue[:3]) if overdue else ''})
Rituais: {'; '.join(streak_lines) if streak_lines else 'nenhum ritual cadastrado'}
Metas: {'; '.join(f'{g.title} em {g.progress_percent}%' for g in goals) if goals else 'nenhuma meta cadastrada'}
Pessoas sem contato recente (14+ dias): {', '.join(cold_contacts) if cold_contacts else 'nenhuma'}
Saldo do mês: R$ {income - expenses:.2f}
""".strip()

    provider = user.ai_provider_personal or "gemini"
    return _generate(session, user, provider, DAILY_BRIEFING_PROMPT, [], data_summary)


def ask_business_advisor(session: Session, user: User, prompt: str) -> str:
    """Equivalente a `ask_prometheus`, mas pro lado Empresarial — histórico, tom e
    ferramentas totalmente separados (nunca compartilha contexto com o assistente
    pessoal). Provedor resolvido por `user.ai_provider_business`."""
    provider = user.ai_provider_business or "gemini"
    tools = _make_business_tools(session, user) if provider == "gemini" else None
    return _generate(
        session, user, provider, BUSINESS_ADVISOR_SYSTEM_PROMPT, _load_history(session, user, "empresarial"), prompt, tools=tools
    )


CONVERSATION_SYSTEM_PROMPT = """
Você é o atendente virtual de um negócio, respondendo leads que chegaram por WhatsApp,
Instagram ou Facebook. Seja educado, direto e breve — mensagens de chat, não emails.
Se não souber responder algo com segurança, diga que um atendente humano vai continuar
a conversa, em vez de inventar informação.
""".strip()

CONVERSATION_HISTORY_LIMIT = 20


def _load_conversation_history(session: Session, conversation_id: int) -> list[dict]:
    messages = session.exec(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.id.desc())
        .limit(CONVERSATION_HISTORY_LIMIT)
    ).all()
    messages.reverse()
    return [{"role": "assistant" if m.direction == "outbound" else "user", "content": m.content} for m in messages]


def answer_conversation(session: Session, user: User, conversation: Conversation, incoming_text: str) -> str:
    """Equivalente a `ask_prometheus`, mas pro inbox de atendimento: histórico por
    conversa (não por usuário) e sem as ferramentas de tarefas/finanças pessoais.
    Provedor resolvido por `user.ai_provider_business`."""
    provider = user.ai_provider_business or "gemini"
    history = _load_conversation_history(session, conversation.id)
    return _generate(session, user, provider, CONVERSATION_SYSTEM_PROMPT, history, incoming_text)


JOURNAL_SYSTEM_PROMPT = """
Você é uma presença de apoio que lê entradas de diário pessoal. Não dê conselhos
genéricos nem liste bullet points — responda como alguém que realmente prestou atenção,
em 2-4 frases. Se notar um padrão (cansaço repetido, mesmo estresse voltando), comente
com gentileza, sem soar clínico.
""".strip()


def reflect_on_journal(session: Session, user: User, content: str) -> str:
    """Usada pelo Diário Vivo (ecossistema pessoal) — reaproveita o mesmo dispatcher e a
    preferência de provedor pessoal do usuário."""
    provider = user.ai_provider_personal or "gemini"
    return _generate(session, user, provider, JOURNAL_SYSTEM_PROMPT, [], content)
