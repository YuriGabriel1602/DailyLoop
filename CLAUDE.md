# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

DailyLoop OS ("Prometheus") is a personal productivity app: a Tauri (Rust) shell wrapping a React +
TypeScript frontend, paired with a separate Python/FastAPI backend that hosts a SQLite database (via
SQLModel) and a Gemini-powered AI assistant. The two halves run as independent processes and talk over
plain HTTP on `localhost` — there is no shared build step or IPC beyond `fetch` calls.

It's multi-user now: JWT auth, roles (`user`/`admin`), and every table is scoped by `owner_id`. Modules
cover tasks, a real finance tracker (transactions, budgets, CSV/OFX statement import, auto-categorization),
notes, and optional email/WhatsApp notifications on top of the AI chat.

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
  port 8000. On startup it creates `backend/dailyloop_brain.db` (SQLite) if missing, runs a couple of
  hand-rolled lightweight column migrations (see `database.py`), and starts the APScheduler background
  jobs (daily briefing + task reminders).
- No test suite exists for the backend either.

### Running the full app
The frontend expects the backend to already be reachable at `http://127.0.0.1:8000` (hardcoded default
in `src/lib/api.ts`, overridable via `VITE_API_BASE_URL`) — start the Python server first, then
`npm run tauri dev`. `GET /` is a plain health check; there's no polling/online-indicator on the
dashboard itself, but every write action goes through `src/lib/api.ts`'s `fetch` wrapper and surfaces
errors via `sonner` toasts rather than blocking the UI.

## Architecture

### Backend: routers + services, no dead modules
`backend/main.py` wires up `database.py` (SQLModel/SQLite) and mounts one router per domain, all
prefixed `/api/...` except `meta` (`GET /`):

- `routers/auth.py` — register/login (first user ever created becomes `admin`), JWT issuance, `GET/PATCH
  /api/auth/me`, forgot/reset-password, and an **optional** phone-verification flow
  (`/phone/request-code`, `/phone/verify-code`) used to opt a user into WhatsApp notifications. Phone
  verification is **not** required at registration — that requirement was tried and reverted (see git
  history around "standby do WhatsApp").
- `routers/admin.py` — admin-only (`require_admin` dependency on the whole router): list/patch/deactivate
  users, force a password reset, tail the log file.
- `routers/tasks.py`, `routers/notes.py` — straightforward CRUD, owner-scoped.
- `routers/finance.py` (the biggest router) — transactions, budgets (monthly limit per category, with
  an alert fired via `notification_service` the moment a category crosses its limit), CSV/OFX bank
  statement import (`POST /api/finance/import`, via `ofxparse` for OFX and a hand-rolled parser for CSV),
  and `/api/finance/stats` (month-over-month totals and per-category breakdown for the charts).
- `routers/notifications.py` — per-category (`password_reset`, `task_reminder`, `daily_briefing`,
  `budget_alert`) email/WhatsApp toggle preferences.
- `routers/chat.py` — `POST /api/chat`, `GET /api/chat/history`; the only AI chat path (see below).

Services: `auth_service.py` (hashing, JWT, `get_current_user`/`require_admin` deps), `ai_service.py`
(Gemini chat), `finance_categorizer.py` (TF-IDF/Naive-Bayes, trained in-process on hardcoded pt-BR
sample data, used both to auto-categorize CSV/OFX imports and to suggest a category live), `
email_service.py` (SMTP; degrades to logging the content instead of sending if unconfigured),
`whatsapp_service.py` (Meta WhatsApp Business Cloud API; same degrade-to-log behavior if unconfigured),
`notification_service.py` (the shared `notify()` used by budget alerts / reminders / briefings — checks
the user's per-category preference, then fans out to email and/or WhatsApp), `scheduler_service.py`
(APScheduler jobs: daily briefing at a configurable hour, task-reminder sweep on a configurable
interval).

There is no leftover dead code from the earlier Gemini/GPT/Codex iterations anymore — `finance_service.py`,
`spotify_engine.py`, `content_engine.py`, and `weather_service.py` (previously unwired standalone
modules) are gone. `database.py` models (`User`, `Task`, `Transaction`, `Budget`, `Note`, `Message`,
`NotificationPreference`, `PasswordResetToken`, `PhoneVerificationCode`) are all actually read/written by
the current API — none are speculative/future-use anymore.

### Frontend: router-based, `Dashboard.tsx` monolith is gone
`src/App.tsx` is a `react-router-dom` `BrowserRouter` with real routes: public (`/welcome` landing,
`/login`, `/register`, `/forgot-password`, `/reset-password/:token`) and authenticated (wrapped in
`RequireAuth`, sharing `src/components/Layout.tsx`): `/` (Home), `/tasks`, `/finance`, `/notes`, `/hive`,
`/settings`, and `/admin` (further gated by `RequireAdmin`, role-checked from the Zustand store).

`Layout.tsx` owns the sidebar/mobile-dock navigation and the `PrometheusSheet` slide-over chat panel.
Each route is its own file under `src/pages/`. `src/lib/api.ts` is a real API client (bearer token from
the Zustand-persisted store, a shared `ApiError`, a 401 → logout-and-redirect hook) — no more ad hoc
`fetch` calls scattered through components. `src/store/useStore.ts` (Zustand + `persist`) now holds only
auth state (`user`, `token`) and is actively used.

The earlier dead scaffolding (`CommandMenu.tsx`, `Dock.tsx`, `HoloTile.tsx`, `PrometheusVoice.tsx`,
`WindowOverlay.tsx`, `components/modules/`, `components/widgets/`) has been removed along with the old
sci-fi/`NeuralHandshake` intro. The UI now uses shadcn/ui primitives (`src/components/ui/`) with a
sober, dashboard-style look, per the "Linear/Notion, not cyberpunk" direction from `refatoracao.md`.

**`/hive` ("The Hive") is UI-only mock data** — `HivePage.tsx` seeds a `useState` array of fake posts and
a hardcoded "1.284 pessoas ativas" stat; there is no backend router for it and nothing persists. Treat it
as a placeholder screen, not a real feature, until/unless it's wired to an actual backend.

### One AI chat path (the frontend-direct one is gone)
Only `POST /api/chat` → `ai_service.ask_prometheus` exists now. It uses the new `google-genai` SDK
(`google.genai.Client`, model `gemini-flash-latest`), reinjects the last `HISTORY_LIMIT` (20) messages
from the `Message` table as chat history, and gives the model four Python-function tools bound to the
current session/user: `get_tasks_summary`, `get_finance_summary`, `create_task`, `complete_task` (plain
functions passed as `tools=`, so the SDK's automatic function-calling handles the round-trip). The
frontend's `PrometheusSheet` (in `Layout.tsx`) is the only caller. The old frontend-direct-to-Gemini path
(`PrometheusTerminal.tsx`, `VITE_GEMINI_API_KEY`, Zustand tool-calling over `change_session`/
`toggle_focus`) no longer exists in the codebase — don't reintroduce a second path without a reason.

Note: the configured Gemini API key's free tier currently returns 429/404 for `gemini-2.0-flash` and all
`gemini-2.5-*` models (quota/deprecation for new keys) — only the `-latest`/`-lite-latest` model aliases
work on it. If chat calls start failing, check that before assuming the code broke.

### Auth, ports, config, and secrets — single `.env` now
- One `.env` at the repo root (not split frontend/backend anymore). `backend/config.py` loads it via
  `load_dotenv(ROOT_DIR / ".env")` and reads plain (non-`VITE_`) keys: `GEMINI_API_KEY`,
  `JWT_SECRET_KEY` (required — generate with `python -c "import secrets; print(secrets.token_hex(32))"`),
  `JWT_EXPIRE_MINUTES`, `CORS_ORIGINS`, `DATABASE_URL`, SMTP settings, WhatsApp Business Cloud API
  settings (`WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_BUSINESS_ACCOUNT_ID` + template
  names), scheduler timing knobs. See `.env.example` for the full annotated list.
- `VITE_API_BASE_URL` (optional, defaults to `http://127.0.0.1:8000`) is the only frontend-side env var
  that matters now — no more per-service `VITE_*` API keys on the frontend; Spotify/YouTube/weather
  integrations and their `GET /api/config` bridge are gone along with the dead service modules.
- CORS is still `allow_origins` driven by `CORS_ORIGINS` (defaults to `http://127.0.0.1:1420`), not a
  wildcard anymore.

### Progress tracking
See `PROGRESSO.md` for the current phase. It was substantially rewritten because the old roadmap (stuck
at "Fase 3: Gemini integration") no longer matched reality — auth, finance, notes, notifications, and
tool-calling AI were all already done.
