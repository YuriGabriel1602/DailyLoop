import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


def _base_url(waba_id: str) -> str:
    return f"https://graph.facebook.com/{settings.meta_graph_api_version}/{waba_id}/message_templates"


def list_templates(waba_id: str, access_token: str) -> list[dict]:
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                _base_url(waba_id),
                params={"fields": "name,status,category,language,components", "access_token": access_token},
            )
        if response.status_code >= 400:
            logger.error("Falha ao listar templates da WABA %s: %s", waba_id, response.text)
            return []
        return response.json().get("data", [])
    except Exception:
        logger.exception("Falha ao listar templates da WABA %s", waba_id)
        return []


def create_template(
    waba_id: str, access_token: str, *, name: str, category: str, language: str, body_text: str
) -> dict | None:
    payload = {
        "name": name,
        "category": category,
        "language": language,
        "components": [{"type": "BODY", "text": body_text}],
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(_base_url(waba_id), params={"access_token": access_token}, json=payload)
        if response.status_code >= 400:
            logger.error("Meta recusou a criação do template '%s' na WABA %s: %s", name, waba_id, response.text)
            return None
        return response.json()
    except Exception:
        logger.exception("Falha ao criar o template '%s' na WABA %s", name, waba_id)
        return None


def delete_template(waba_id: str, access_token: str, name: str) -> bool:
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.delete(_base_url(waba_id), params={"name": name, "access_token": access_token})
        if response.status_code >= 400:
            logger.error("Falha ao apagar o template '%s' da WABA %s: %s", name, waba_id, response.text)
            return False
        return True
    except Exception:
        logger.exception("Falha ao apagar o template '%s' da WABA %s", name, waba_id)
        return False
