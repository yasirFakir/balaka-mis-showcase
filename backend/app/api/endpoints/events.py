from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.events import manager
import logging
import asyncio

router = APIRouter()

logger = logging.getLogger(__name__)

@router.websocket("/ws")
@router.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None) # Future: Use this for auth
):
    """
    Main WebSocket Event Stream.
    Replaces the old SSE endpoint.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive.
            # We don't expect client messages, but we need to await something
            # to keep the socket open and handle disconnects.
            # We can also implement a Ping/Pong here if needed.
            data = await websocket.receive_text()
            
            # Optional: Handle client-side "ping"
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket)
