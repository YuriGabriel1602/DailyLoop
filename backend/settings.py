import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")


def _split_csv(value: str | None, fallback: tuple[str, ...]) -> tuple[str, ...]:
    if not value:
        return fallback
    items = tuple(item.strip() for item in value.split(",") if item.strip())
    return items or fallback


def _float_env(name: str, fallback: float) -> float:
    try:
        return float(os.getenv(name, str(fallback)))
    except ValueError:
        return fallback


@dataclass(frozen=True)
class Settings:
    allowed_origins: tuple[str, ...]
    database_url: str
    gemini_api_key: str | None
    gemini_model: str
    youtube_api_key: str | None
    spotify_client_id: str | None
    spotify_client_secret: str | None
    weather_lat: float
    weather_lon: float
    weather_timezone: str


settings = Settings(
    allowed_origins=_split_csv(
        os.getenv("DAILYLOOP_ALLOWED_ORIGINS"),
        (
            "http://localhost:1420",
            "http://127.0.0.1:1420",
            "tauri://localhost",
            "http://tauri.localhost",
        ),
    ),
    database_url=os.getenv("DAILYLOOP_DATABASE_URL", "sqlite:///./dailyloop_brain.db"),
    gemini_api_key=os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY_GEMINI"),
    gemini_model=os.getenv("DAILYLOOP_GEMINI_MODEL", "gemini-2.5-flash"),
    youtube_api_key=os.getenv("YOUTUBE_API_KEY"),
    spotify_client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    spotify_client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    weather_lat=_float_env("DAILYLOOP_WEATHER_LAT", -30.0346),
    weather_lon=_float_env("DAILYLOOP_WEATHER_LON", -51.2177),
    weather_timezone=os.getenv("DAILYLOOP_WEATHER_TIMEZONE", "America/Sao_Paulo"),
)
