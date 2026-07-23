from fastapi import WebSocket


class HiveManager:
    """Broadcast pra todo mundo conectado no The Hive — diferente do ConnectionManager
    do Inbox, que é escopado por owner_id, aqui é uma comunidade única e compartilhada."""

    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._connections.append(websocket)
        await self.broadcast({"type": "presence", "online_count": self.count()})

    async def disconnect(self, websocket: WebSocket):
        if websocket in self._connections:
            self._connections.remove(websocket)
        await self.broadcast({"type": "presence", "online_count": self.count()})

    async def broadcast(self, event: dict):
        for websocket in list(self._connections):
            try:
                await websocket.send_json(event)
            except Exception:
                if websocket in self._connections:
                    self._connections.remove(websocket)

    def count(self) -> int:
        return len(self._connections)


manager = HiveManager()
