import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import User, get_session
from services import google_oauth_service
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gmail", tags=["gmail"])

# Heurística simples de "isso parece exigir uma ação" — não é um classificador
# treinado, só uma varredura de palavras-chave no assunto/snippet.
ACTION_KEYWORDS = ["vencimento", "vence", "renovação", "renovar", "confirmação", "confirmar", "boleto", "fatura"]


def _looks_actionable(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in ACTION_KEYWORDS)


@router.get("/recent")
def list_recent(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    token = google_oauth_service.get_valid_access_token(session, current_user)
    if not token:
        raise HTTPException(status_code=400, detail="Gmail não conectado (conecte o Google em Integrações).")

    headers = {"Authorization": f"Bearer {token}"}
    try:
        with httpx.Client(timeout=10.0, headers=headers) as client:
            list_response = client.get(
                "https://www.googleapis.com/gmail/v1/users/me/messages", params={"maxResults": 10}
            )
            if list_response.status_code >= 400:
                logger.error("Gmail recusou a listagem: %s", list_response.text)
                return []

            results = []
            for item in list_response.json().get("messages", []):
                msg_response = client.get(
                    f"https://www.googleapis.com/gmail/v1/users/me/messages/{item['id']}",
                    params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                )
                if msg_response.status_code >= 400:
                    continue
                msg = msg_response.json()
                headers_by_name = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                subject = headers_by_name.get("Subject", "(sem assunto)")
                snippet = msg.get("snippet", "")
                results.append(
                    {
                        "id": item["id"],
                        "subject": subject,
                        "from": headers_by_name.get("From", ""),
                        "date": headers_by_name.get("Date", ""),
                        "snippet": snippet,
                        "actionable": _looks_actionable(f"{subject} {snippet}"),
                    }
                )
            return results
    except Exception:
        logger.exception("Falha ao listar emails do Gmail")
        return []
