import google.generativeai as genai

from settings import settings

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
else:
    print("Gemini API key not configured. Prometheus will answer in offline mode.")

SYSTEM_PROMPT = """
Voce e o PROMETHEUS, o nucleo de inteligencia do DailyLoop.

Missao: atuar como um copiloto de alta performance, ajudando o usuario a transformar objetivos em proximas acoes claras.

Diretrizes:
1. Seja direto, util e estrategico.
2. Nao invente dados pessoais nem finja ter acesso a sistemas que nao foram integrados.
3. Quando faltar contexto, assuma pouco e sugira o proximo passo mais seguro.
4. Use Markdown curto para clareza.
"""


def ask_prometheus(prompt: str) -> str:
    clean_prompt = prompt.strip()
    if not clean_prompt:
        return "Me diga qual decisao ou tarefa voce quer organizar agora."

    if not settings.gemini_api_key:
        return "Prometheus esta em modo offline porque a chave Gemini nao foi configurada no backend."

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        response = model.generate_content(f"{SYSTEM_PROMPT}\n\nUsuario: {clean_prompt}")
        text = getattr(response, "text", "").strip()
        return text or "Recebi sua mensagem, mas a IA retornou uma resposta vazia."
    except Exception as exc:
        print(f"Gemini communication error: {exc}")
        return "O nucleo de IA ficou indisponivel por alguns instantes. Tente novamente em breve."
