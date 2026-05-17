# DailyLoop v2 Reconstruction

## Done in this branch

- Removed committed `.env` files, SQLite database, and Python cache files.
- Added safe environment examples for frontend and backend.
- Centralized backend configuration in `backend/settings.py`.
- Restricted CORS to local development/Tauri origins.
- Restored Tauri CSP instead of leaving it disabled.
- Moved frontend chat calls to the local FastAPI backend.
- Rebranded package, app title, Tauri product name, and Rust package metadata.
- Rebuilt the main React shell into a smaller cockpit with focus, tasks, finance, stream, and Prometheus views.

## Next priorities

1. Rotate every API key that was ever committed.
2. Clone this branch into a writable local folder outside the broken OneDrive placeholder.
3. Run `npm install`, `npm run typecheck`, and `npm run build`.
4. Connect Tasks and Finance views to the FastAPI routes instead of local React state.
5. Add real authentication before exposing the backend beyond localhost.
6. Add tests for backend routes and frontend data flows.
