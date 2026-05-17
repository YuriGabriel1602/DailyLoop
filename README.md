# DailyLoop

DailyLoop is a local-first productivity cockpit built with Tauri, React, TypeScript, FastAPI, SQLite, and AI-assisted workflows through the Prometheus assistant.

## What is in this branch

This reconstruction branch focuses on a safer DailyLoop v2 base:

- secrets removed from version control
- backend configuration moved to local `.env` files
- frontend AI calls routed through the backend
- tighter local CORS defaults
- Tauri branding and CSP prepared for a desktop build
- cleaner setup notes for rebuilding the lost local version

## Setup

```bash
npm install
```

Create local environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Fill `backend/.env` with your real Gemini, YouTube, and Spotify keys.

Run the backend:

```bash
cd backend
uvicorn main:app --reload
```

Run the frontend:

```bash
npm run dev
```

Run the desktop shell:

```bash
npm run tauri dev
```

## Security reset

The previous repository state included environment files and a SQLite database. Treat every committed key as exposed and rotate credentials before continuing.
