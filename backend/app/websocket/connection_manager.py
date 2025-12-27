"""WebSocket Connection Manager for real-time collaboration."""

import json
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from fastapi import WebSocket


@dataclass
class Collaborator:
    """Represents a collaborator in a drawing session."""

    websocket: WebSocket
    user_id: str
    user_name: str
    user_color: str
    cursor_x: Optional[float] = None
    cursor_y: Optional[float] = None
    connected_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)


class ConnectionManager:
    """Manages WebSocket connections for real-time collaboration."""

    def __init__(self) -> None:
        # drawing_id -> list of collaborators
        self._rooms: Dict[str, List[Collaborator]] = {}
        # websocket -> (drawing_id, collaborator)
        self._connections: Dict[WebSocket, tuple[str, Collaborator]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        drawing_id: str,
        user_id: str,
        user_name: str,
        user_color: str,
    ) -> Collaborator:
        """Connect a user to a drawing room."""
        await websocket.accept()

        collaborator = Collaborator(
            websocket=websocket,
            user_id=user_id,
            user_name=user_name,
            user_color=user_color,
        )

        # Add to room
        if drawing_id not in self._rooms:
            self._rooms[drawing_id] = []
        self._rooms[drawing_id].append(collaborator)

        # Track connection
        self._connections[websocket] = (drawing_id, collaborator)

        # Notify others about new collaborator
        await self._broadcast_user_joined(drawing_id, collaborator)

        return collaborator

    async def disconnect(self, websocket: WebSocket) -> None:
        """Disconnect a user from their drawing room."""
        if websocket not in self._connections:
            return

        drawing_id, collaborator = self._connections[websocket]

        # Remove from room
        if drawing_id in self._rooms:
            self._rooms[drawing_id] = [
                c for c in self._rooms[drawing_id] if c.websocket != websocket
            ]
            # Clean up empty rooms
            if not self._rooms[drawing_id]:
                del self._rooms[drawing_id]

        # Remove connection tracking
        del self._connections[websocket]

        # Notify others about user leaving
        await self._broadcast_user_left(drawing_id, collaborator)

    async def broadcast_to_room(
        self,
        drawing_id: str,
        message: dict,
        exclude: Optional[WebSocket] = None,
    ) -> None:
        """Broadcast a message to all users in a room."""
        if drawing_id not in self._rooms:
            return

        disconnected = []
        for collaborator in self._rooms[drawing_id]:
            if exclude and collaborator.websocket == exclude:
                continue
            try:
                await collaborator.websocket.send_json(message)
            except Exception:
                disconnected.append(collaborator.websocket)

        # Clean up disconnected clients
        for ws in disconnected:
            await self.disconnect(ws)

    async def send_to_user(self, websocket: WebSocket, message: dict) -> None:
        """Send a message to a specific user."""
        try:
            await websocket.send_json(message)
        except Exception:
            await self.disconnect(websocket)

    def get_room_collaborators(self, drawing_id: str) -> List[dict]:
        """Get list of collaborators in a room."""
        if drawing_id not in self._rooms:
            return []

        return [
            {
                "user_id": c.user_id,
                "user_name": c.user_name,
                "user_color": c.user_color,
                "cursor_x": c.cursor_x,
                "cursor_y": c.cursor_y,
            }
            for c in self._rooms[drawing_id]
        ]

    def get_room_count(self, drawing_id: str) -> int:
        """Get number of users in a room."""
        return len(self._rooms.get(drawing_id, []))

    def update_cursor(
        self,
        websocket: WebSocket,
        x: float,
        y: float,
    ) -> Optional[Collaborator]:
        """Update a user's cursor position."""
        if websocket not in self._connections:
            return None

        _, collaborator = self._connections[websocket]
        collaborator.cursor_x = x
        collaborator.cursor_y = y
        collaborator.last_activity = datetime.now()
        return collaborator

    async def _broadcast_user_joined(
        self,
        drawing_id: str,
        collaborator: Collaborator,
    ) -> None:
        """Broadcast that a user joined."""
        message = {
            "type": "user_joined",
            "data": {
                "user_id": collaborator.user_id,
                "user_name": collaborator.user_name,
                "user_color": collaborator.user_color,
            },
            "collaborators": self.get_room_collaborators(drawing_id),
        }
        await self.broadcast_to_room(
            drawing_id, message, exclude=collaborator.websocket
        )

    async def _broadcast_user_left(
        self,
        drawing_id: str,
        collaborator: Collaborator,
    ) -> None:
        """Broadcast that a user left."""
        message = {
            "type": "user_left",
            "data": {
                "user_id": collaborator.user_id,
                "user_name": collaborator.user_name,
            },
            "collaborators": self.get_room_collaborators(drawing_id),
        }
        await self.broadcast_to_room(drawing_id, message)


# Global connection manager instance
manager = ConnectionManager()
