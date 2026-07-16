import logging
import logging.handlers
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_db_and_tables
from routers import admin, auth, chat, finance, meta, notes, tasks


def _configure_logging():
    root_logger = logging.getLogger()
    if root_logger.handlers:
        # Evita registrar os handlers 2x: `python main.py` importa este módulo como
        # __main__ e o uvicorn.run("main:app", ...) reimporta como "main" no mesmo processo.
        return

    settings.log_dir.mkdir(parents=True, exist_ok=True)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    file_handler = logging.handlers.RotatingFileHandler(
        settings.log_file, maxBytes=1_000_000, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)


_configure_logging()

app = FastAPI(title="DailyLoop OS Core v3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(notes.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(finance.router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    logging.getLogger(__name__).info("DailyLoop Backend: Sistemas Online.")


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
