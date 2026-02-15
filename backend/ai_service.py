# Importação atualizada para evitar o Warning de depreciação
import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path

# Carrega as variáveis de ambiente do ficheiro .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Tenta capturar a chave de diferentes variáveis comuns
api_key = os.getenv("API_KEY_GEMINI") or os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ AVISO: Chave API do Gemini não encontrada no .env.")
else:
    genai.configure(api_key=api_key)
    print(f"✅ Chave API Carregada: {api_key[:5]}...")

# Definição da Personalidade do PROMETHEUS
SYSTEM_PROMPT = """
Você é o PROMETHEUS, o núcleo de inteligência do DailyLoop OS.
SUA MISSÃO: Atuar como um Co-Piloto de Alta Performance (Nível Executivo/Estratégico).

DIRETRIZES DE PERSONALIDADE:
1. Sofisticado e Direto: Não use gírias, mas não seja robótico. Fale como um especialista.
2. Proativo: Não apenas responda, sugira o próximo passo lógico.
3. Sem "Roleplay" de Máquina: Fale naturalmente como uma extensão da mente do usuário.
4. Formatação Visual: Use Markdown (negrito, listas, tabelas) para clareza extrema.

OBJETIVO: Ajudar o usuário a atingir 100% de produtividade e clareza mental.
"""

# Função RENOMEADA para coincidir com o que o main.py espera
def ask_prometheus(prompt: str) -> str:
    """
    Interface principal de comunicação com a IA.
    Envia o prompt do usuário junto com as diretrizes do sistema.
    """
    if not api_key:
        return "Erro: Chave API ausente no servidor backend."
    
    try:
        # Usando o modelo gemini-2.5-flash para velocidade e eficiência
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        full_prompt = f"{SYSTEM_PROMPT}\n\nUsuário: {prompt}"
        response = model.generate_content(full_prompt)
        
        return response.text.strip()
        
    except Exception as e:
        print(f"🔴 ERRO NA COMUNICAÇÃO COM GEMINI: {e}")
        return "O núcleo de IA está processando em modo offline. Tente novamente em breve."