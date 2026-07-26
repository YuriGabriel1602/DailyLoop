"""Armazenamento local de mídia recebida/enviada em chats de WhatsApp (Pessoal e
Empresarial via QR) — uma pasta por owner_id dentro do diretório do canal, servida de
volta só por endpoint autenticado (nunca como StaticFiles público)."""

import base64
import uuid
from pathlib import Path
from typing import Optional

# Sanidade contra um payload absurdamente grande (bug no cliente, ou alguém anexando
# vídeo com content-type de imagem) consumir disco/memória sem limite — 20MB cobre
# folgado qualquer foto de celular real.
MAX_MEDIA_BYTES = 20 * 1024 * 1024


def sanitize_ext(mime: str) -> str:
    ext = (mime or "").split("/")[-1].split(";")[0]
    ext = "".join(c for c in ext if c.isalnum())[:10]
    return ext or "jpg"


def save_media(media_root: Path, owner_id: int, media_base64: str, mime: str) -> str:
    """Grava o base64 decodificado em `media_root/{owner_id}/{uuid}.{ext}` e devolve o
    caminho relativo (usado como `media_path` na mensagem)."""
    data = base64.b64decode(media_base64)
    if len(data) > MAX_MEDIA_BYTES:
        raise ValueError(f"Mídia maior que o limite de {MAX_MEDIA_BYTES // (1024 * 1024)}MB.")
    directory = media_root / str(owner_id)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{sanitize_ext(mime)}"
    (directory / filename).write_bytes(data)
    return f"{owner_id}/{filename}"


def resolve_media_path(media_root: Path, media_path: str) -> Optional[Path]:
    path = media_root / media_path
    return path if path.is_file() else None
