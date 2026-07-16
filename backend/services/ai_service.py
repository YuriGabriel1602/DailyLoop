import logging
from datetime import datetime
from decimal import Decimal

import google.generativeai as genai
from sqlmodel import Session, select

from config import settings
from database import Budget, Message, Task, Transaction, User

logger = logging.getLogger(__name__)

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = """
Você é o Prometheus, o assistente pessoal do DailyLoop.

Você tem ferramentas que consultam as tarefas e as finanças reais do usuário — use-as
sempre que a pergunta depender desses dados, em vez de adivinhar ou responder de forma
genérica. Também pode criar uma tarefa nova ou marcar uma tarefa existente como concluída
quando o usuário pedir isso na conversa.

Seja direto e específico, como alguém que realmente olhou os dados — não como um chatbot
genérico. Use Markdown (negrito, listas) quando ajudar a clareza, sem exagerar.
""".strip()

HISTORY_LIMIT = 20


def _load_history(session: Session, user: User) -> list[dict]:
    messages = session.exec(
        select(Message)
        .where(Message.owner_id == user.id)
        .order_by(Message.id.desc())
        .limit(HISTORY_LIMIT)
    ).all()
    messages.reverse()
    return [{"role": "model" if m.role == "assistant" else "user", "parts": [m.content]} for m in messages]


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
    conversa e dá ao modelo ferramentas de leitura/ação sobre tarefas e finanças reais."""
    if not settings.gemini_api_key:
        return "Erro: Chave API ausente no servidor backend."

    try:
        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
            tools=_make_tools(session, user),
        )
        chat = model.start_chat(history=_load_history(session, user), enable_automatic_function_calling=True)
        response = chat.send_message(prompt)
        return response.text.strip()
    except Exception:
        logger.exception("Falha ao chamar a API do Gemini")
        return "O núcleo de IA está processando em modo offline. Tente novamente em breve."
