"""Shape dos eventos que o whatsapp-sidecar (Node/Baileys) manda pro backend —
compartilhado entre `routers/whatsapp_personal.py` (slot "personal") e
`routers/whatsapp_business.py` (slot "business"), já que os dois falam o mesmo
protocolo com o sidecar."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SidecarMessage(BaseModel):
    jid: str
    direction: str  # inbound, outbound
    message_type: str = "text"
    content: str = ""
    media_base64: Optional[str] = None
    media_mime: Optional[str] = None
    external_message_id: str = ""
    push_name: Optional[str] = None
    timestamp: Optional[int] = None  # epoch em segundos


class SidecarChat(BaseModel):
    jid: str
    name: str = ""
    archived: bool = False
    unread_count: int = 0


class SidecarEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    owner_id: int
    type: str  # "qr" | "connected" | "disconnected" | "message" | "history_sync" | "contacts" | "chat_meta"
    qr_data_url: Optional[str] = None
    jid: Optional[str] = None
    phone_number: Optional[str] = None
    archived: Optional[bool] = None  # só usado por "chat_meta"
    message: Optional[SidecarMessage] = None
    history_chats: list[SidecarChat] = []
    history_messages: list[SidecarMessage] = []


def ts_to_dt(timestamp: Optional[int]) -> Optional[datetime]:
    if not timestamp:
        return None
    return datetime.utcfromtimestamp(timestamp)
