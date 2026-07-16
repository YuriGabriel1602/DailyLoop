import csv
import io
import logging
from calendar import monthrange
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select

from database import Budget, Transaction, User, get_session
from services.auth_service import get_current_user
from services.finance_categorizer import categorize_transactions, predict_category

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/finance", tags=["finance"])


# ==============================================================================
# Transações (CRUD manual)
# ==============================================================================
class TransactionCreate(BaseModel):
    description: str
    amount: Decimal
    type: str = "expense"
    category: Optional[str] = None
    date: Optional[date_type] = None

    @field_validator("amount", mode="before")
    @classmethod
    def _normalize_amount(cls, value):
        # Aceita tanto "45.90" quanto formato brasileiro "45,90" / "1.234,56".
        if isinstance(value, str):
            return _parse_amount(value)
        return value


@router.get("/transactions")
def list_transactions(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    statement = (
        select(Transaction)
        .where(Transaction.owner_id == current_user.id)
        .order_by(Transaction.date.desc())
    )
    return session.exec(statement).all()


@router.post("/transactions")
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if payload.category:
        category = payload.category
    elif payload.type == "income":
        category = "Renda"
    else:
        category = predict_category(payload.description)
    db_txn = Transaction(
        description=payload.description,
        amount=abs(payload.amount),
        type=payload.type,
        category=category,
        date=payload.date or date_type.today(),
        owner_id=current_user.id,
    )
    session.add(db_txn)
    session.commit()
    session.refresh(db_txn)
    return db_txn


@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_txn = session.get(Transaction, transaction_id)
    if not db_txn or db_txn.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    session.delete(db_txn)
    session.commit()
    return {"status": "deleted"}


# ==============================================================================
# Importação de extrato (CSV / OFX)
# ==============================================================================
def _parse_amount(raw: str) -> Decimal:
    s = raw.strip().replace("R$", "").strip()
    negative = s.startswith("(") and s.endswith(")")
    s = s.strip("()").lstrip("+")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    value = Decimal(s)
    return -value if negative else value


def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV vazio ou sem cabeçalho")

    columns = {name.strip().lower(): name for name in reader.fieldnames}

    def pick(*candidates):
        for c in candidates:
            if c in columns:
                return columns[c]
        return None

    date_col = pick("date", "data")
    desc_col = pick("description", "descricao", "descrição", "desc", "historico", "histórico")
    amount_col = pick("amount", "valor")
    type_col = pick("type", "tipo")

    if not date_col or not desc_col or not amount_col:
        raise HTTPException(
            status_code=400,
            detail="CSV precisa ter colunas de data, descrição e valor "
            "(ex: date/data, description/descricao, amount/valor).",
        )

    rows = []
    for row in reader:
        try:
            raw_amount = _parse_amount(row[amount_col])
        except (InvalidOperation, KeyError):
            continue
        raw_date = row[date_col].strip()
        parsed_date = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                parsed_date = datetime.strptime(raw_date, fmt).date()
                break
            except ValueError:
                continue
        if parsed_date is None:
            continue

        raw_type = (row.get(type_col, "") or "").strip().lower() if type_col else ""
        if raw_type in ("income", "credito", "crédito", "credit"):
            txn_type = "income"
        elif raw_type in ("expense", "debito", "débito", "debit"):
            txn_type = "expense"
        elif raw_amount < 0:
            # Sinal negativo explícito no valor é um sinal confiável de despesa.
            txn_type = "expense"
        else:
            # Sem coluna de tipo e sem sinal (a maioria dos extratos simples): assume
            # despesa por padrão, já que é o caso mais comum numa fatura/extrato — evita
            # inflar "renda" silenciosamente. Recomendar coluna type/tipo pra extratos com
            # entradas e saídas misturadas sem sinal.
            txn_type = "expense"

        rows.append(
            {
                "date": parsed_date,
                "description": row[desc_col].strip(),
                "amount": abs(raw_amount),
                "type": txn_type,
            }
        )
    return rows


def _parse_ofx(content: bytes) -> list[dict]:
    try:
        from ofxparse import OfxParser
    except ImportError as exc:
        raise HTTPException(
            status_code=500, detail="Suporte a OFX não está instalado no servidor."
        ) from exc

    try:
        ofx = OfxParser.parse(io.BytesIO(content))
    except Exception as exc:
        logger.exception("Falha ao fazer parse do OFX")
        raise HTTPException(status_code=400, detail="Não foi possível ler o arquivo OFX") from exc

    rows = []
    for account in ofx.accounts:
        for txn in account.statement.transactions:
            amount = Decimal(str(txn.amount))
            rows.append(
                {
                    "date": txn.date.date() if hasattr(txn.date, "date") else txn.date,
                    "description": (txn.payee or txn.memo or "Sem descrição").strip(),
                    "amount": abs(amount),
                    "type": "income" if amount >= 0 else "expense",
                }
            )
    return rows


@router.post("/import")
async def import_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    filename = (file.filename or "").lower()
    content = await file.read()

    if filename.endswith(".csv"):
        rows = _parse_csv(content)
    elif filename.endswith(".ofx") or filename.endswith(".qfx"):
        rows = _parse_ofx(content)
    else:
        raise HTTPException(
            status_code=400, detail="Formato não suportado — envie um arquivo .csv ou .ofx"
        )

    if not rows:
        return {"imported": 0, "skipped_duplicates": 0}

    expense_indices = [i for i, r in enumerate(rows) if r["type"] != "income"]
    expense_categories = categorize_transactions([rows[i]["description"] for i in expense_indices])
    categories = ["Renda"] * len(rows)
    for idx, category in zip(expense_indices, expense_categories):
        categories[idx] = category

    imported = 0
    skipped = 0
    for row, category in zip(rows, categories):
        existing = session.exec(
            select(Transaction).where(
                Transaction.owner_id == current_user.id,
                Transaction.date == row["date"],
                Transaction.amount == row["amount"],
                Transaction.description == row["description"],
            )
        ).first()
        if existing:
            skipped += 1
            continue
        session.add(
            Transaction(
                description=row["description"],
                amount=row["amount"],
                type=row["type"],
                category=category,
                date=row["date"],
                owner_id=current_user.id,
            )
        )
        imported += 1
    session.commit()
    return {"imported": imported, "skipped_duplicates": skipped}


# ==============================================================================
# Orçamentos (metas por categoria)
# ==============================================================================
class BudgetUpsert(BaseModel):
    category: str
    monthly_limit: Decimal

    @field_validator("monthly_limit", mode="before")
    @classmethod
    def _normalize_monthly_limit(cls, value):
        if isinstance(value, str):
            return _parse_amount(value)
        return value


@router.get("/budgets")
def list_budgets(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return session.exec(select(Budget).where(Budget.owner_id == current_user.id)).all()


@router.put("/budgets")
def upsert_budget(
    payload: BudgetUpsert,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(Budget).where(
            Budget.owner_id == current_user.id, Budget.category == payload.category
        )
    ).first()
    if existing:
        existing.monthly_limit = payload.monthly_limit
        session.add(existing)
    else:
        existing = Budget(
            category=payload.category,
            monthly_limit=payload.monthly_limit,
            owner_id=current_user.id,
        )
        session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    db_budget = session.get(Budget, budget_id)
    if not db_budget or db_budget.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    session.delete(db_budget)
    session.commit()
    return {"status": "deleted"}


# ==============================================================================
# Estatísticas
# ==============================================================================
@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    transactions = session.exec(
        select(Transaction).where(Transaction.owner_id == current_user.id)
    ).all()
    budgets = session.exec(select(Budget).where(Budget.owner_id == current_user.id)).all()

    today = date_type.today()
    current_month_key = (today.year, today.month)
    if today.month == 1:
        previous_month_key = (today.year - 1, 12)
    else:
        previous_month_key = (today.year, today.month - 1)

    income = Decimal("0")
    expenses = Decimal("0")
    by_category: dict[str, Decimal] = {}
    current_month_by_category: dict[str, Decimal] = {}
    previous_month_by_category: dict[str, Decimal] = {}
    current_month_total = Decimal("0")
    previous_month_total = Decimal("0")
    spent_so_far_this_month = Decimal("0")

    for t in transactions:
        month_key = (t.date.year, t.date.month)
        if t.type == "income":
            income += t.amount
        else:
            expenses += t.amount
            by_category[t.category] = by_category.get(t.category, Decimal("0")) + t.amount
            if month_key == current_month_key:
                current_month_by_category[t.category] = (
                    current_month_by_category.get(t.category, Decimal("0")) + t.amount
                )
                current_month_total += t.amount
                spent_so_far_this_month += t.amount
            elif month_key == previous_month_key:
                previous_month_by_category[t.category] = (
                    previous_month_by_category.get(t.category, Decimal("0")) + t.amount
                )
                previous_month_total += t.amount

    def percent_change(current: Decimal, previous: Decimal) -> Optional[float]:
        if previous == 0:
            return None if current == 0 else 100.0
        return float((current - previous) / previous * 100)

    by_category_change = {
        category: percent_change(
            current_month_by_category.get(category, Decimal("0")),
            previous_month_by_category.get(category, Decimal("0")),
        )
        for category in set(current_month_by_category) | set(previous_month_by_category)
    }

    days_in_month = monthrange(today.year, today.month)[1]
    days_elapsed = today.day
    projected_total = (
        (spent_so_far_this_month / days_elapsed * days_in_month)
        if days_elapsed
        else Decimal("0")
    )

    budget_status = []
    for b in budgets:
        spent = current_month_by_category.get(b.category, Decimal("0"))
        percent_used = float(spent / b.monthly_limit * 100) if b.monthly_limit else 0.0
        budget_status.append(
            {
                "category": b.category,
                "monthly_limit": b.monthly_limit,
                "spent_this_month": spent,
                "percent_used": round(percent_used, 1),
                "over_budget": spent > b.monthly_limit,
            }
        )

    return {
        "balance": income - expenses,
        "income": income,
        "expenses": expenses,
        "by_category": by_category,
        "month_over_month": {
            "current_month": f"{current_month_key[0]}-{current_month_key[1]:02d}",
            "previous_month": f"{previous_month_key[0]}-{previous_month_key[1]:02d}",
            "total_change_percent": percent_change(current_month_total, previous_month_total),
            "by_category_change_percent": by_category_change,
        },
        "projection": {
            "spent_so_far": spent_so_far_this_month,
            "days_elapsed": days_elapsed,
            "days_in_month": days_in_month,
            "projected_total": round(projected_total, 2),
        },
        "budgets": budget_status,
    }
