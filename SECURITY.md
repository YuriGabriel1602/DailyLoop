# Security Notes

DailyLoop is a local-first desktop experiment with a FastAPI backend. Keep these rules in place before sharing builds or making the repository private/public again.

## Secrets

- Never commit `.env`, `backend/.env`, API keys, tokens, SQLite databases, or generated caches.
- Keys that were already committed must be considered exposed. Rotate Gemini, YouTube, Spotify, and any other credentials before using them again.
- Frontend variables prefixed with `VITE_` are public at runtime. Keep AI and provider secrets in the backend only.

## Local API

- The backend only allows configured local origins by default.
- If you expose the API beyond localhost, add real authentication before using chat, finance, notes, or mission endpoints.
- Keep `src-tauri/tauri.conf.json` CSP enabled and update it deliberately when adding new external services.

## Data

- `dailyloop_brain.db` is local user data and should stay out of Git.
- Use backups or encrypted sync for personal data instead of committing databases.
