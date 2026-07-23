import re
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# Extratos de Pix/transferência têm boilerplate (CPF/CNPJ, "Agência: X Conta: Y", código do
# banco) que não diz nada sobre a categoria do gasto — e pior, "conta" colide com os exemplos
# de treino de Moradia ("conta de luz"/"conta de água"), fazendo qualquer Pix cair lá. Remove
# esse ruído antes de classificar.
_NOISE_PATTERNS = [
    re.compile(r"\d{3}\.\d{3}\.\d{3}-\d{2}"),  # CPF
    re.compile(r"\*{3}\.\d{3}\.\d{3}-\*{2}"),  # CPF mascarado
    re.compile(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"),  # CNPJ
    re.compile(r"ag[êe]ncia:?\s*\d+", re.IGNORECASE),
    re.compile(r"conta:?\s*[\d-]+", re.IGNORECASE),
    re.compile(r"\(\d{4}\)"),  # código do banco entre parênteses, ex: (0341)
]


def _strip_noise(description: str) -> str:
    cleaned = description
    for pattern in _NOISE_PATTERNS:
        cleaned = pattern.sub(" ", cleaned)
    return " ".join(cleaned.split())

# Dados de treino do categorizador de gastos.
TRAINING_DATA = [
    # Alimentação
    ("café padaria manha lanche", "Alimentação"),
    ("almoço restaurante quilo prato", "Alimentação"),
    ("jantar pizza hamburguer pedido ifood", "Alimentação"),
    ("supermercado compras mercado feira açougue", "Alimentação"),
    # Transporte
    ("uber 99 transporte carro aplicativo corrida", "Transporte"),
    ("passagem onibus metro bilhete unico trem", "Transporte"),
    ("gasolina posto combustivel etanol diesel shell ipiranga", "Transporte"),
    ("estacionamento zona azul", "Transporte"),
    # Moradia
    ("aluguel condominio imobiliaria", "Moradia"),
    ("conta de luz energia eletropaulo enel", "Moradia"),
    ("conta de agua saneamento sabesp", "Moradia"),
    ("internet vivo net claro fibra wifi", "Moradia"),
    ("faxina limpeza materiais casa", "Moradia"),
    # Lazer
    ("cinema filme ingresso cinepolis outback", "Lazer"),
    ("streaming netflix spotify prime hbo disney", "Lazer"),
    ("viagem hotel passagem aérea turismo", "Lazer"),
    ("show rock ingresso livepass evento", "Lazer"),
    ("jogos steam psn xbox game", "Lazer"),
    # Saúde
    ("farmacia remedio dorflex drogaria", "Saúde"),
    ("dentista consulta exame hospital médico", "Saúde"),
    ("academia mensalidade suplemento", "Saúde"),
    # Educação
    ("livro livraria amazon", "Educação"),
    ("curso faculdade udemy mensalidade escola", "Educação"),
    # Trabalho/Renda
    ("salario pagamento deposito", "Renda"),
    ("freela projeto pagamento recebido", "Renda"),
]


@lru_cache(maxsize=1)
def get_model():
    """Treina (uma única vez, cacheado) o modelo de classificação de texto."""
    descriptions, categories = zip(*TRAINING_DATA)
    model = make_pipeline(TfidfVectorizer(), MultinomialNB())
    model.fit(descriptions, categories)
    return model


def _has_known_vocabulary(cleaned_descriptions: list[str]) -> list[bool]:
    """Transferências pessoa-a-pessoa (Pix) não têm nenhuma palavra do vocabulário
    treinado — nesse caso o modelo não tem sinal nenhum e forçar uma categoria (o
    argmax sempre escolhe alguma) só produz um chute com cara de certeza."""
    vectorizer = get_model().named_steps["tfidfvectorizer"]
    matrix = vectorizer.transform(cleaned_descriptions)
    return [matrix.getrow(i).nnz > 0 for i in range(matrix.shape[0])]


def predict_category(description: str) -> str:
    """Prediz a categoria para uma única descrição de gasto."""
    try:
        cleaned = _strip_noise(description.lower())
        if not _has_known_vocabulary([cleaned])[0]:
            return "Outros"
        return get_model().predict([cleaned])[0]
    except Exception:
        return "Outros"


def categorize_transactions(descriptions: list[str]) -> list[str]:
    """Prediz a categoria para um lote de descrições (usado no import de extrato)."""
    if not descriptions:
        return []
    try:
        cleaned = [_strip_noise(d.lower()) for d in descriptions]
        known = _has_known_vocabulary(cleaned)
        predictions = list(get_model().predict(cleaned))
        return [pred if has_signal else "Outros" for pred, has_signal in zip(predictions, known)]
    except Exception:
        return ["Outros" for _ in descriptions]
