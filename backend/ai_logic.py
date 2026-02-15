from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# DADOS DE TREINO EXPANDIDOS: Mais inteligência para o Prometheus
training_data = [
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
    ("freela projeto pagamento recebido", "Renda")
]

def train_categorizer():
    """Treina o modelo de classificação de texto."""
    try:
        X, y = zip(*training_data)
        # O pipeline automatiza o processo de vetorização e classificação
        model = make_pipeline(TfidfVectorizer(), MultinomialNB())
        model.fit(X, y)
        print("✅ IA Financeira: Treinamento tático concluído.")
        return model
    except Exception as e:
        print(f"⚠️ Erro ao treinar IA Financeira: {e}")
        return None

def predict_category(model, description: str) -> str:
    """Prediz a categoria para uma única descrição de gasto."""
    if not model:
        return "Outros"
    try:
        # A IA converte o texto para minúsculas e prevê a categoria
        return model.predict([description.lower()])[0]
    except:
        return "Outros"