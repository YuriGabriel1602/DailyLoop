from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}

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


manager = ConnectionManager()
