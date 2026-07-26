import logging

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"


def send_instagram_text(access_token: str, recipient_id: str, body: str) -> bool:
    """Envia DM via API direta do Instagram (graph.instagram.com) — diferente do antigo
    fluxo mediado por Página do Facebook (`meta_messaging_service.send_meta_text`, que
    ainda serve o Messenger). Token vem do login direto do Instagram (ver
    `services/instagram_oauth_service.py`), não é mais um token de Página."""
    if not access_token or not recipient_id:
        logger.warning("Instagram sem token/destinatário — mensagem não enviada.")
        return False

    url = f"https://graph.instagram.com/{GRAPH_API_VERSION}/me/messages"
    payload = {"recipient": {"id": recipient_id}, "message": {"text": body}}
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            logger.error("Instagram recusou a mensagem para %s: %s", recipient_id, response.text)
            return False
        return True
    except Exception:
        logger.exception("Falha ao enviar mensagem via Instagram para %s", recipient_id)
        return False


def list_conversations(access_token: str, limit: int = 50) -> list[dict]:
    """Lista as conversas de DM da conta Instagram Profissional dona do token
    (Conversations API, graph.instagram.com) — usado pro poll periódico em
    `services/instagram_sync_service.py`, já que webhook exige o app publicado na Meta."""
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(
                f"https://graph.instagram.com/{GRAPH_API_VERSION}/me/conversations",
                params={"fields": "id,updated_time,participants", "limit": limit, "access_token": access_token},
            )
        if response.status_code >= 400:
            logger.error("Falha ao listar conversas do Instagram: %s", response.text)
            return []
        return response.json().get("data", [])
    except Exception:
        logger.exception("Falha ao listar conversas do Instagram")
        return []


def get_conversation_messages(access_token: str, conversation_id: str, limit: int = 50) -> list[dict]:
    """Mensagens de uma conversa (mais recentes primeiro, ordem da API) — quem chama
    decide se precisa reordenar."""
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(
                f"https://graph.instagram.com/{GRAPH_API_VERSION}/{conversation_id}",
                params={
                    "fields": f"messages.limit({limit}){{id,created_time,from,to,message}}",
                    "access_token": access_token,
                },
            )
        if response.status_code >= 400:
            logger.error("Falha ao buscar mensagens da conversa %s do Instagram: %s", conversation_id, response.text)
            return []
        return response.json().get("messages", {}).get("data", [])
    except Exception:
        logger.exception("Falha ao buscar mensagens da conversa %s do Instagram", conversation_id)
        return []
