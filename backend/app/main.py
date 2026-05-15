# Balaka MIS API v1.1.0 (Reload Trigger)
import os
import logging
import time
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.datastructures import MutableHeaders
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.api.api import api_router
from app.core.backup import perform_db_backup
from app.core.maintenance import cleanup_completed_requests_files, cleanup_temp_service_images
from app.core.rate_limiter import limiter
from app.core.lab import lab_logging_handler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Set up logging for the main app
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Attach Lab Technical Stream
logging.getLogger().addHandler(lab_logging_handler)

# Silence APScheduler execution logs (only show warnings/errors)
logging.getLogger("apscheduler").setLevel(logging.WARNING)

class NoCacheStaticFiles(StaticFiles):
    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the scheduler for automatic backups
    # Configure scheduler with Bangladesh timezone by default
    bd_tz = ZoneInfo("Asia/Dhaka")
    scheduler = BackgroundScheduler(timezone=bd_tz)
    
    # 1. Schedule Data Privacy & Temp Assets Cleanup (3 AM BD Time)
    cleanup_trigger = CronTrigger(hour=3, minute=0, timezone=bd_tz)
    cleanup_job = scheduler.add_job(
        cleanup_completed_requests_files,
        cleanup_trigger,
        id="privacy_cleanup",
        name="Automated System Maintenance & Privacy Cleanup",
        replace_existing=True,
        misfire_grace_time=3600
    )

    # 2. Schedule backup at 4 AM Bangladesh Time (UTC+6)
    trigger = CronTrigger(hour=4, minute=0, timezone=bd_tz)
    backup_job = scheduler.add_job(
        perform_db_backup, 
        trigger, 
        id="daily_backup", 
        name="Daily Database Backup",
        replace_existing=True,
        misfire_grace_time=3600  # Allow running up to 1 hour late if server was down
    )

    # Listener to log the next schedule after a successful run
    def job_listener(event):
        if event.job_id == "daily_backup" and not event.exception:
            job = scheduler.get_job("daily_backup")
            if job:
                # ANSI Cyan for scheduling info
                logger.info(f"\033[96mNext automated backup scheduled for: {job.next_run_time}\033[0m")
        
        if event.job_id == "privacy_cleanup" and not event.exception:
            job = scheduler.get_job("privacy_cleanup")
            if job:
                logger.info(f"\033[96mNext system maintenance scheduled for: {job.next_run_time}\033[0m")

    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED)
    scheduler.start()
    
    # ANSI Cyan for scheduling info
    backup_next = backup_job.next_run_time if hasattr(backup_job, 'next_run_time') else "Calculating..."
    cleanup_next = cleanup_job.next_run_time if hasattr(cleanup_job, 'next_run_time') else "Calculating..."
    
    logger.info(f"\033[96mDaily backup scheduled for: {backup_next}\033[0m")
    logger.info(f"\033[96mSystem maintenance scheduled for: {cleanup_next}\033[0m")
    
    yield
    
    # Shutdown: Stop the scheduler
    scheduler.shutdown()

app = FastAPI(title="Balaka MIS API", lifespan=lifespan, redirect_slashes=True)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Maintenance Cache to reduce DB load
_maintenance_state = {"active": settings.MAINTENANCE_MODE, "last_check": 0}

# Maintenance Middleware (Dynamic check from DB)
class MaintenanceMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method")
        path = scope.get("path", "")
        
        # 1. ALWAYS ALLOW preflight OPTIONS requests
        if method == "OPTIONS":
            response = JSONResponse(status_code=204, content=None)
            await response(scope, receive, send)
            return

        # 2. ALWAYS ALLOW system, support tickets, login and root to avoid total lockout
        if (path.startswith("/api/v1/system") or 
            path.startswith("/api/v1/tickets") or 
            path.startswith("/api/v1/login") or 
            path == "/"):
            await self.app(scope, receive, send)
            return

        # Check cache (30 second TTL)
        global _maintenance_state
        import time
        now = time.time()
        
        if now - _maintenance_state["last_check"] > 30:
            maintenance_active = settings.MAINTENANCE_MODE
            try:
                from app.db.session import SessionLocal
                from app.models.system import SystemSetting
                
                db = SessionLocal()
                try:
                    db_setting = db.query(SystemSetting).filter(SystemSetting.key == "maintenance_mode").first()
                    if db_setting:
                        maintenance_active = db_setting.value_bool
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Maintenance check bypassed due to DB load: {str(e)}")
                maintenance_active = False
            
            _maintenance_state["active"] = maintenance_active
            _maintenance_state["last_check"] = now
        
        maintenance_active = _maintenance_state["active"]

        if maintenance_active:
            # IF NOT ADMIN (or strictly blocking all for now to be safe)
            if not path.startswith("/api/v1/login"):
                response = JSONResponse(
                    status_code=503,
                    content={"detail": "System is under maintenance. Please try again later."}
                )
                await response(scope, receive, send)
                return
            
        await self.app(scope, receive, send)

app.add_middleware(MaintenanceMiddleware)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log a concise single-line error for better readability in logs
    err = exc.errors()[0]
    msg = err.get("msg", "Invalid input").replace("Value error, ", "")
    logger.error(f"Validation Error: {msg}")
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder({"detail": exc.errors(), "body": exc.body}),
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler to capture unhandled exceptions,
    log them securely, and return a generic error message to the client.
    """
    logger.error(f"Global Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please contact support."},
    )

# Set all CORS enabled origins
# Simplified logic to handle "*" correctly
cors_origins = settings.BACKEND_CORS_ORIGINS
if isinstance(cors_origins, str):
    if cors_origins.startswith("["):
        try:
            cors_origins = json.loads(cors_origins)
        except:
            cors_origins = [cors_origins]
    else:
        cors_origins = [o.strip() for o in cors_origins.split(",") if o.strip()]

if "*" in cors_origins:
    allow_origins = ["*"]
    allow_credentials = False
else:
    base_origins = [str(origin).rstrip("/") for origin in cors_origins]
    dev_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ]
    allow_origins = list(set(base_origins + dev_origins))
    allow_credentials = True

# Security Headers Middleware
class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") == "OPTIONS":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware (MUST BE LAST to run FIRST)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REMOVED: app.mount("/static", ...) to prevent public access to uploads/backups.
# Files are now served securely via /api/v1/files/secure/{filename} and system endpoints.

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "ok"}
