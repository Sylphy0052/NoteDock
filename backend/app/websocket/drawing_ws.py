"""WebSocket endpoint for real-time drawing collaboration."""

import json
import secrets
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.drawing_service import DrawingService
from app.websocket.connection_manager import manager

router = APIRouter()

# Color palette for collaborators
COLLABORATOR_COLORS = [
    "#FF6B6B",  # Red
    "#4ECDC4",  # Teal
    "#45B7D1",  # Blue
    "#96CEB4",  # Green
    "#FFEAA7",  # Yellow
    "#DDA0DD",  # Plum
    "#98D8C8",  # Mint
    "#F7DC6F",  # Gold
    "#BB8FCE",  # Purple
    "#85C1E9",  # Light Blue
]


def get_random_color() -> str:
    """Get a random collaborator color."""
    return secrets.choice(COLLABORATOR_COLORS)


@router.websocket("/ws/drawing/{drawing_id}")
async def drawing_websocket(
    websocket: WebSocket,
    drawing_id: str,
    user_name: str = Query(default="Anonymous"),
    token: Optional[str] = Query(default=None),
):
    """
    WebSocket endpoint for real-time drawing collaboration.

    Message types:
    - cursor_move: Update cursor position
    - shape_add: Add a new shape
    - shape_update: Update an existing shape
    - shape_delete: Delete shape(s)
    - shapes_sync: Full sync of all shapes
    - chat: Chat message
    """
    user_id = secrets.token_hex(8)
    user_color = get_random_color()

    # Connect to room
    collaborator = await manager.connect(
        websocket=websocket,
        drawing_id=drawing_id,
        user_id=user_id,
        user_name=user_name,
        user_color=user_color,
    )

    # Send initial state to connected user
    await manager.send_to_user(
        websocket,
        {
            "type": "connected",
            "data": {
                "user_id": user_id,
                "user_name": user_name,
                "user_color": user_color,
                "drawing_id": drawing_id,
            },
            "collaborators": manager.get_room_collaborators(drawing_id),
        },
    )

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "cursor_move":
                # Update cursor position
                x = data.get("x", 0)
                y = data.get("y", 0)
                manager.update_cursor(websocket, x, y)

                # Broadcast cursor position to others
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "cursor_move",
                        "data": {
                            "user_id": user_id,
                            "user_name": user_name,
                            "user_color": user_color,
                            "x": x,
                            "y": y,
                        },
                    },
                    exclude=websocket,
                )

            elif message_type == "shape_add":
                # Broadcast new shape to others
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "shape_add",
                        "data": {
                            "shape": data.get("shape"),
                            "user_id": user_id,
                            "user_name": user_name,
                        },
                    },
                    exclude=websocket,
                )

            elif message_type == "shape_update":
                # Broadcast shape update to others
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "shape_update",
                        "data": {
                            "shape_id": data.get("shape_id"),
                            "changes": data.get("changes"),
                            "user_id": user_id,
                            "user_name": user_name,
                        },
                    },
                    exclude=websocket,
                )

            elif message_type == "shape_delete":
                # Broadcast shape deletion to others
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "shape_delete",
                        "data": {
                            "shape_ids": data.get("shape_ids", []),
                            "user_id": user_id,
                            "user_name": user_name,
                        },
                    },
                    exclude=websocket,
                )

            elif message_type == "shapes_sync":
                # Full sync - broadcast all shapes
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "shapes_sync",
                        "data": {
                            "shapes": data.get("shapes", []),
                            "user_id": user_id,
                            "user_name": user_name,
                        },
                    },
                    exclude=websocket,
                )

            elif message_type == "selection_change":
                # Broadcast selection change
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "selection_change",
                        "data": {
                            "selected_ids": data.get("selected_ids", []),
                            "user_id": user_id,
                            "user_name": user_name,
                            "user_color": user_color,
                        },
                    },
                    exclude=websocket,
                )

            elif message_type == "chat":
                # Broadcast chat message to all including sender
                await manager.broadcast_to_room(
                    drawing_id,
                    {
                        "type": "chat",
                        "data": {
                            "message": data.get("message", ""),
                            "user_id": user_id,
                            "user_name": user_name,
                            "user_color": user_color,
                        },
                    },
                )

            elif message_type == "ping":
                # Respond to ping
                await manager.send_to_user(
                    websocket,
                    {"type": "pong"},
                )

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)
