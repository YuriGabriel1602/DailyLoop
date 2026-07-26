import asyncio

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}
        self._main_loop: asyncio.AbstractEventLoop | None = None

    def bind_main_loop(self, loop: asyncio.AbstractEventLoop):
        """Guarda o loop principal do uvicorn (chamado 1x no startup) — necessário pra
        `broadcast_to_user_from_thread` poder empurrar eventos em WebSockets a partir de
        threads fora dele (ex: job do APScheduler), já que um WebSocket só pode ser
        usado com segurança a partir do loop onde foi aceito (`connect`)."""
        self._main_loop = loop

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        conns = self._connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and user_id in self._connections:
            del self._connections[user_id]

    async def broadcast_to_user(self, user_id: int, event: dict):
        for websocket in list(self._connections.get(user_id, [])):
            try:
                await websocket.send_json(event)
            except Exception:
                self.disconnect(user_id, websocket)

    def broadcast_to_user_from_thread(self, user_id: int, event: dict):
        """Equivalente a `broadcast_to_user`, mas chamável de uma thread diferente da que
        roda o loop principal (ex: `services/instagram_sync_service.py`, disparado pelo
        APScheduler numa thread própria)."""
        if not self._main_loop or not self._connections.get(user_id):
            return
        future = asyncio.run_coroutine_threadsafe(self.broadcast_to_user(user_id, event), self._main_loop)
        try:
            future.result(timeout=5)
        except Exception:
            pass


manager = ConnectionManager()
