from fastapi import APIRouter

from config import settings

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/public-config")
def public_config():
    """Config não-secreta que o frontend precisa pra montar fluxos Meta (App ID e Configuration
    ID pro JS SDK do Embedded Signup) — nunca inclui o App Secret."""
    return {
        "app_id": settings.meta_app_id,
        "whatsapp_embedded_signup_config_id": settings.whatsapp_embedded_signup_config_id,
    }
