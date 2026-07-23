from cryptography.fernet import Fernet, InvalidToken

from config import settings

_fernet = Fernet(settings.credential_encryption_key) if settings.credential_encryption_key else None


def encrypt(value: str) -> str:
    if not _fernet:
        raise RuntimeError("CREDENTIAL_ENCRYPTION_KEY não configurada no .env")
    return _fernet.encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    if not _fernet:
        raise RuntimeError("CREDENTIAL_ENCRYPTION_KEY não configurada no .env")
    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        raise RuntimeError("Token de credencial inválido ou corrompido")
