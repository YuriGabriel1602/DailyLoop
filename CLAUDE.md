# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

DailyLoop OS ("Prometheus") is a personal productivity desktop app: a Tauri (Rust) shell wrapping a
React + TypeScript frontend, paired with a separate Python/FastAPI backend that hosts an SQLite
database and a Gemini-powered AI assistant. The two halves run as independent processes and talk
over plain HTTP on `localhost` — there is no shared build step or IPC beyond fetch calls.

Project docs and most in-code comments/UI copy are written in Portuguese (pt-BR).

## Commands

### Frontend / Tauri (run from repo root)
- `npm run dev` — Vite dev server only, fixed at `http://127.0.0.1:1420` (port is `strictPort`, so it
  fails instead of picking another port if 1420 is busy).
- `npm run tauri dev` — launches the Tauri desktop shell, which runs `npm run dev` as its
  `beforeDevCommand` (see `src-tauri/tauri.conf.json`). This is the normal way to run the app.
- `npm run build` — `tsc` typecheck followed by `vite build`.
- `npm run tauri build` — production desktop bundle.
- There is no test runner or linter configured in `package.json`; `tsc` (via `npm run build`) is the
  only automated check for the frontend.

### Backend (run from `backend/`)
- A venv already exists at `backend/venv`. Activate it (`backend\venv\Scripts\activate` on
  Windows) or use its `python.exe` directly.
- `pip install -r requirements.txt` — install/refresh deps.
- `python main.py` (or `uvicorn main:app --reload --host 127.0.0.1 --port 8000`) — starts the API on
  port 8000. On startup it creates `backend/dailyloop_brain.db` (SQLite) if missing and trains the
  finance-categorizer model in-process (see below).
- No test suite exists for the backend either.

### Running the full app
The frontend expects the backend to already be reachable at `http://127.0.0.1:8000` (hardcoded, see
below) — start the Python server first, then `npm run tauri dev`. The dashboard polls `GET /` every
15s and shows an Online/Offline indicator; most write actions (notes, chat) silently degrade to an
error state if the backend isn't up rather than blocking the UI.

## Architecture

### Backend is smaller than it looks
`backend/main.py` only wires up three things: `database.py` (SQLModel/SQLite), `ai_service.py`
(`ask_prometheus`, the Gemini chat function), and `ai_logic.py` (`train_categorizer`, a
TF-IDF/Naive-Bayes model trained once at startup on hardcoded pt-BR sample data). Live endpoints are
just `GET /`, `GET /api/config`, `POST /api/notes` (proxies to the Notion API), `POST /api/chat`, and
`GET /api/chat/history`.

`finance_service.py`, `spotify_engine.py`, `content_engine.py` (YouTube), and `weather_service.py`
are **not imported anywhere** — they're standalone modules from an earlier iteration, not reachable
from any route. Don't assume they're live; check `main.py`'s imports before wiring new work through
them, or wire them in yourself if the task calls for it.

`database.py` defines `User`, `Mission`, `Transaction`, `Note`, `Message`, `Event` tables, but only
`Note` and `Message` are actually read/written by the current API. The rest exist for future use.

### Frontend is one big component, not a router
`src/App.tsx` gates everything behind `NeuralHandshake` (a login/intro animation); once
`onComplete` fires it mounts `src/components/Dashboard.tsx` and never unmounts it again — there's no
router. `Dashboard.tsx` (~1000 lines) is the entire live application: it defines all five views
(Home, Tasks, Finance, Hive/social feed, Settings) plus the `PrometheusDrawer` chat panel as
functions inside the same file, switched by a local `activeTab` string, and makes its own `fetch`
calls directly (no API client module, no data layer).

Most other files under `src/components/` — `CommandMenu.tsx`, `Dock.tsx`, `HoloTile.tsx`,
`PrometheusVoice.tsx`, `WindowOverlay.tsx`, everything in `components/modules/` and
`components/widgets/` — and `src/store/useStore.ts` (a Zustand store with `persist`) are **not
imported by `App.tsx` or `Dashboard.tsx`**. They're leftover scaffolding from an earlier design and
currently dead code. Before extending one of them, verify with a grep for its import — don't assume
UI changes there will be visible.

### Two independent, non-overlapping AI chat paths exist
- `POST /api/chat` → `ai_service.ask_prometheus` (Python `google-generativeai` SDK, system prompt in
  `ai_logic`-adjacent `ai_service.py`, model `gemini-2.5-flash`). This is what `Dashboard.tsx`'s
  `PrometheusDrawer` actually calls, and it persists history to the `Message` SQLite table.
- `src/components/modules/PrometheusTerminal.tsx` calls the Gemini REST API **directly from the
  frontend** using `VITE_GEMINI_API_KEY` and defines its own function-calling tools
  (`change_session`, `toggle_focus`) against the Zustand store. This component is currently unmounted
  (see above) — treat it as a design reference for a "tool-calling AI controls the UI" pattern, not
  as running code.

If asked to change "the AI"/"Prometheus", clarify or default to the backend path
(`ai_service.py` + `POST /api/chat`), since that's the one actually wired into the live UI.

### Ports, config, and secrets are split across two `.env` files
- `backend/.env` — loaded by `main.py` at startup (falls back to a repo-root `.env` if the
  backend-local one is missing). Keys: `API_KEY_GEMINI`, `API_KEY_YOUTUBE`, `SPOTIFY_CLIENT_ID`,
  `SPOTIFY_CLIENT_SECRET`, `OPENWEATHER_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`.
- `frontend/.env` — read by Vite at build time (`VITE_`-prefixed keys only): `VITE_GEMINI_API_KEY`,
  `VITE_YOUTUBE_API_KEY`, `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_CLIENT_SECRET`,
  `VITE_OPENWEATHER_API_KEY`, plus duplicated `NOTION_API_KEY`/`NOTION_DATABASE_ID`.
- `GET /api/config` bridges the two: it reads `VITE_SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_ID` and
  `VITE_YOUTUBE_API_KEY` from the *backend* process env and hands them to the frontend, which then
  calls Spotify (PKCE flow) and the YouTube Data API **directly from the browser** — the backend
  never proxies those two services despite exposing their credentials.
- All `http://127.0.0.1:8000` URLs in `Dashboard.tsx` are hardcoded string literals; there's no env
  var or Vite proxy for the backend base URL, and no CORS restriction on the backend
  (`allow_origins=["*"]`).

### Progress tracking
`PROGRESSO.md` is a Mermaid roadmap (in Portuguese) tracking project phases; per its "current" phase
marker, the project is mid-way through "Fase 3: O Despertar do Prometheus" (Gemini integration,
adaptive personality prompt, persistent chat memory) with widgets (agenda, finance charts, bio-sync)
still marked pending/future.
