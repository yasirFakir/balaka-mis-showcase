import asyncio
import json
import logging
from typing import List, Dict, Any, Union, Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages active WebSocket connections.
    Replaces the old SSE EventBroadcaster.
    """
    def __init__(self):
        # We store connections as a list of WebSockets.
        # Future optimization: Dict[int, List[WebSocket]] for user-targeted broadcasting.
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, data: Any, event: str = None):
        """
        Broadcasts a message to all connected clients.
        Maintains backward compatibility with the old SSE method signature.
        """
        if not self.active_connections:
            return

        # Prepare the payload (standardized JSON structure)
        payload = self._prepare_payload(data, event)
        
        # Log (same format as before for consistency)
        event_name = payload.get("event", "message")
        msg_str = json.dumps(payload)
        logger.info(f"\033[94mWS BROADCAST: '{event_name}' to {len(self.active_connections)} clients.\033[0m")

        # Broadcast loop
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_str)
            except Exception as e:
                logger.error(f"Error sending to WS: {e}")
                disconnected.append(connection)

        # Cleanup dead connections
        for dead in disconnected:
            self.disconnect(dead)

    def _prepare_payload(self, data: Any, event: str = None) -> Dict[str, Any]:
        """Helper to normalize data into {event: str, data: any}"""
        payload = data
        
        # 1. Handle stringified JSON input
        if isinstance(data, str) and data.strip().startswith("{"):
            try:
                parsed = json.loads(data)
                if isinstance(parsed, dict) and "event" in parsed:
                    payload = parsed
            except (json.JSONDecodeError, TypeError):
                pass

        # 2. Wrap structure
        if event:
            payload = {
                "event": event,
                "data": payload
            }
        elif not isinstance(payload, dict) or "event" not in payload:
            payload = {
                "event": "message",
                "data": payload
            }
            
        return payload

# Global Instance (Renamed internally, but exported as 'event_broadcaster' for compatibility)
manager = ConnectionManager()
event_broadcaster = manager