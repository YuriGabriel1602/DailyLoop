import logging

import google.generativeai as genai

from config import settings

logger = logging.getLogger(__name__)

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

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


def ask_prometheus(prompt: str) -> str:
    """Interface principal de comunicação com a IA."""
    if not settings.gemini_api_key:
        return "Erro: Chave API ausente no servidor backend."

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        full_prompt = f"{SYSTEM_PROMPT}\n\nUsuário: {prompt}"
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception:
        logger.exception("Falha ao chamar a API do Gemini")
        return "O núcleo de IA está processando em modo offline. Tente novamente em breve."
