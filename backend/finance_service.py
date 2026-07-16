from datetime import datetime, timedelta
import random
from typing import List, Dict

# Tenta importar o cérebro de IA para categorização inteligente
try:
    from ai_logic import train_categorizer, categorize_transactions
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("⚠️ Módulo de IA (ai_logic) não encontrado. Usando categorização simples.")

# Simulação de Transações Reais (Padrão Open Banking)
RAW_TRANSACTIONS = [
    {"desc": "UBER *TRIP", "base_amount": 24.90, "type": "debit"},
    {"desc": "SPOTIFY PREMIUM", "base_amount": 21.90, "type": "subscription"},
    {"desc": "IFOOD *MC DONALDS", "base_amount": 45.50, "type": "debit"},
    {"desc": "PAGAMENTO SALARIO", "base_amount": 8500.00, "type": "credit"},
    {"desc": "AWS SERVICES", "base_amount": 150.00, "type": "subscription"},
    {"desc": "STARBUCKS COFFEE", "base_amount": 18.00, "type": "debit"},
    {"desc": "POSTO IPIRANGA", "base_amount": 120.00, "type": "debit"},
    {"desc": "NETFLIX.COM", "base_amount": 39.90, "type": "subscription"},
    {"desc": "APPLE SERVICES", "base_amount": 10.90, "type": "subscription"},
    {"desc": "PAG*GUILHERME", "base_amount": 50.00, "type": "transfer"},
    {"desc": "SMARTFIT ACADEMIA", "base_amount": 119.90, "type": "subscription"},
    {"desc": "LIVRARIA CULTURA", "base_amount": 89.90, "type": "debit"},
    {"desc": "CINEMARK INGRESSO", "base_amount": 45.00, "type": "debit"},
]

# Cache do modelo de IA para não treinar toda vez
_ai_model = None

def _get_model():
    """Recupera ou treina o modelo de categorização."""
    global _ai_model
    if AI_AVAILABLE and _ai_model is None:
        print("🧠 Treinando modelo neural financeiro...")
        _ai_model = train_categorizer()
    return _ai_model

def generate_mock_extract(days=30):
    """Gera um extrato bancário realista e categorizado por IA."""
    transactions = []
    current_date = datetime.now()
    
    # 1. Gera transações brutas
    for i in range(days):
        day = current_date - timedelta(days=i)
        
        # 30% de chance de ter transações num dia
        if random.random() > 0.3:
            num_trans = random.randint(1, 4)
            for _ in range(num_trans):
                raw = random.choice(RAW_TRANSACTIONS)
                # Variação de valor para parecer real (+- 10%)
                amount = raw["base_amount"] * random.uniform(0.9, 1.1)
                
                transactions.append({
                    "id": f"txn_{i}_{random.randint(1000,9999)}",
                    "description": raw["desc"],
                    "amount": round(amount, 2),
                    "type": raw["type"],
                    "date": day.strftime("%Y-%m-%d"),
                    "raw_desc": raw["desc"] # Guarda para passar na IA
                })
    
    # 2. Aplica a Mágica da IA (Categorização em Lote)
    if transactions and AI_AVAILABLE:
        descriptions = [t["raw_desc"] for t in transactions]
        model = _get_model()
        categories = categorize_transactions(descriptions, model)
        
        # Atualiza as transações com as categorias previstas
        for i, t in enumerate(transactions):
            t["category"] = categories[i]
    else:
        # Fallback se IA falhar
        for t in transactions:
            t["category"] = _simple_categorize(t["raw_desc"])

    # 3. Limpeza e Ordenação
    for t in transactions:
        del t["raw_desc"] # Remove campo temporário
        
    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions

def _simple_categorize(desc):
    """Categorizador rápido (fallback se a IA falhar)."""
    desc = desc.lower()
    if "uber" in desc or "posto" in desc: return "Transporte"
    if "ifood" in desc or "starbucks" in desc: return "Alimentação"
    if "spotify" in desc or "netflix" in desc: return "Assinaturas"
    if "salario" in desc: return "Renda"
    if "aws" in desc: return "Infraestrutura"
    return "Geral"

def calculate_metrics(transactions):
    """Calcula metadados financeiros avançados (Burn Rate, Cashflow)."""
    total_balance = 0
    income = 0
    expenses = 0
    spending_history = {} # Para o gráfico

    for t in transactions:
        amount = t["amount"]
        date = t["date"]
        
        # Gráfico (agrupado por dia)
        if date not in spending_history: spending_history[date] = 0
        
        if t["type"] == "credit":
            total_balance += amount
            income += amount
        else:
            total_balance -= amount
            expenses += amount
            spending_history[date] += amount

    # Prepara dados para o gráfico (últimos 7 dias)
    chart_data = []
    sorted_dates = sorted(spending_history.keys())[-7:]
    for d in sorted_dates:
        # Formata data DD/MM
        formatted_date = datetime.strptime(d, "%Y-%m-%d").strftime("%d/%m")
        chart_data.append({"label": formatted_date, "value": round(spending_history[d], 2)})

    return {
        "balance": round(total_balance, 2),
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "burn_rate": round(expenses / 30, 2), # Gasto diário médio
        "chart_data": chart_data,
        "recent_transactions": transactions[:10]
    }