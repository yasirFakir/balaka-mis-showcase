import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set, Any, Dict, Optional, List
from sqlalchemy.orm import Session
from app import models, schemas
from fastapi import WebSocket

# Global Lab State
DEBUG_MODE = False

class LogBroadcaster:
    """
    WebSocket-based Log Broadcaster for Gonia Terminal.
    Replaces the generator-based SSE broadcaster.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, level: str, module: str, message: str, metadata: Optional[Dict] = None):
        if not self.active_connections:
            return
            
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "module": module,
            "message": message,
            "metadata": metadata or {}
        }
        
        # Standardize format for frontend: {event: "log", data: entry}
        payload = json.dumps({
            "event": "log",
            "data": log_entry
        })
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.append(connection)
        
        for dead in disconnected:
            self.disconnect(dead)

class LabLoggingHandler(logging.Handler):
    """
    Custom logging handler that broadcasts logs to the Gonia Terminal.
    """
    def emit(self, record):
        global DEBUG_MODE
        if not DEBUG_MODE:
            return
            
        try:
            # We must use the running event loop to broadcast
            loop = asyncio.get_running_loop()
            metadata = {}
            if record.exc_info:
                metadata["exception"] = self.formatException(record.exc_info)
                
            # Avoid infinite loops if broadcaster itself logs
            if record.name == "app.core.lab":
                return

            loop.create_task(lab_broadcaster.broadcast(
                level=record.levelname,
                module=record.name,
                message=record.getMessage(),
                metadata=metadata
            ))
        except RuntimeError:
            # No running event loop (likely starting up or shutting down)
            pass

# Singleton Broadcaster
lab_broadcaster = LogBroadcaster()
lab_logging_handler = LabLoggingHandler()
lab_logging_handler.setLevel(logging.INFO)

class GoniaLabService:
    @staticmethod
    async def log_event(level: str, module: str, message: str, metadata: Optional[Dict] = None, force: bool = False):
        """
        Captured system events for the Gonia Technical Terminal.
        """
        global DEBUG_MODE
        if not DEBUG_MODE and not force:
            return

        # Scrub potentially sensitive metadata keys
        if metadata:
            sensitive_keys = {"password", "token", "hashed_password", "secret"}
            metadata = {k: ("***" if k.lower() in sensitive_keys else v) for k, v in metadata.items()}
            
        await lab_broadcaster.broadcast(level, module, message, metadata)

    @staticmethod
    async def toggle_debug(enabled: bool):
        global DEBUG_MODE
        DEBUG_MODE = enabled
        
        # Immediate feedback in terminal (forced)
        await GoniaLabService.log_event(
            "INFO", "LAB", 
            f"SYSTEM DEBUGGING {'ENABLED' if enabled else 'DISABLED'}: Logs are now {'online' if enabled else 'offline'}.", 
            force=True
        )
        return DEBUG_MODE

    @staticmethod
    async def simulate_request(db: Session, user_id: int, service_slug: str):
        """
        Automated request simulator for rapid debugging.
        """
        # 1. Get Service
        service = db.query(models.ServiceDefinition).filter(models.ServiceDefinition.slug == service_slug).first()
        if not service:
            raise Exception(f"Service {service_slug} not found")

        # 2. Generate Realistic Dummy Data based on schema
        dummy_form = {}
        if service.form_schema:
            # Handle both flat list and section-based schemas
            fields = []
            if isinstance(service.form_schema, list):
                fields = service.form_schema
            elif isinstance(service.form_schema, dict) and "sections" in service.form_schema:
                for section in service.form_schema["sections"]:
                    fields.extend(section.get("fields", []))
            
            for field in fields:
                key = field.get("key")
                f_type = field.get("type")
                if not key: continue
                
                if f_type in ["text", "textarea", "passport", "nid"]: 
                    dummy_form[key] = f"SIM_{key.upper()}"
                elif f_type == "number": 
                    dummy_form[key] = 100
                elif f_type == "phone":
                    dummy_form[key] = "+966500000000"
                elif f_type == "date":
                    dummy_form[key] = datetime.now().strftime("%Y-%m-%d")
                elif f_type == "select": 
                    options = field.get("options", ["DEFAULT"])
                    dummy_form[key] = options[0]
                elif f_type == "file":
                    dummy_form[key] = "https://placehold.co/400x400?text=Simulated+Document"
                elif f_type == "checkbox_group":
                    options = field.get("options", ["DEFAULT"])
                    dummy_form[key] = [options[0]]
                else:
                    dummy_form[key] = "SIMULATED_DATA"
        
        # 3. Handle Variants
        variant_id = None
        selling_price = service.base_price or 0.0
        
        # Load variants if relationship is defined
        # For simulation, just pick the first variant if it exists
        variants = getattr(service, "variants", [])
        if variants:
            variant = variants[0]
            variant_id = variant.id
            selling_price = variant.default_price

        # 4. Create Request
        from app.crud.service_request import service_request
        obj_in = schemas.ServiceRequestCreate(
            service_def_id=service.id,
            form_data=dummy_form,
            quantity=1,
            variant_id=variant_id
        )
        
        request = service_request.create_with_user(
            db, 
            obj_in=obj_in, 
            user_id=user_id,
            selling_price=selling_price,
            variant_id=variant_id
        )
        
        await GoniaLabService.log_event(
            "SUCCESS", "SIMULATOR", 
            f"Atomic simulation successful: Created Request #{request.id} for {service.name}",
            metadata={"user_id": user_id, "service": service_slug, "price": selling_price},
            force=True
        )
        return request

lab_service = GoniaLabService()