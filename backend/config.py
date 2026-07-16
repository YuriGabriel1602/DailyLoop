import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(ROOT_DIR / ".env")


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'dailyloop_brain.db'}"
    )
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://127.0.0.1:1420").split(",")
        if origin.strip()
    ]
    log_file: Path = BACKEND_DIR / "logs" / "app.log"


settings = Settings()
