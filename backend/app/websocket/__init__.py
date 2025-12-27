"""WebSocket module for real-time collaboration."""

from app.websocket.connection_manager import ConnectionManager
from app.websocket.drawing_ws import router as drawing_ws_router

__all__ = ["ConnectionManager", "drawing_ws_router"]
