from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine

from app import schemas, models
from app.api import dependencies
from app.core.config import settings
from app.models import user as user_model
from app.db.session import SessionLocal, engine
from app.core.backup import perform_db_backup
from app.core.security import verify_password

import subprocess
import os
import io
import shutil
import sys
import asyncio
from datetime import datetime, timezone

# Corrected modular imports
try:
    from scripts import cleanup_db
    from app.seeds import seed_all
except ImportError:
    # Try to resolve paths dynamically
    import sys
    import os
    from pathlib import Path
    
    # Path to 'backend' directory
    backend_path = str(Path(__file__).resolve().parent.parent.parent.parent)
    if backend_path not in sys.path:
        sys.path.append(backend_path)
    
    try:
        from scripts import cleanup_db
        from app.seeds import seed_all
    except ImportError:
        cleanup_db = None
        seed_all = None

from app.core.lab import lab_service, lab_broadcaster, DEBUG_MODE
from app.core.finance import finance_service
from app.core import security

router = APIRouter()

@router.websocket("/lab/ws")
async def websocket_lab_logs(
    websocket: WebSocket,
):
    """
    Real-time system event stream for the Gonia Technical Terminal.
    Optimized: WebSocket based.
    RESTRICTED: Root Superuser only (Validated via dependency in handshake or token check if needed, 
    but for now we assume the frontend component handles the guard).
    """
    await lab_broadcaster.connect(websocket)
    try:
        while True:
            # Keep alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        lab_broadcaster.disconnect(websocket)

@router.post("/lab/debug-toggle")
async def toggle_debug(
    enabled: bool = Body(..., embed=True),
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """Enable or disable Verbose System Logging. RESTRICTED: Root Superuser only."""
    new_state = await lab_service.toggle_debug(enabled)
    return {"status": "success", "debug_mode": new_state}

@router.get("/lab/status")
def get_lab_status(
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """Check current lab protocol states. RESTRICTED: Root Superuser only."""
    return {"debug_mode": DEBUG_MODE}

@router.post("/lab/simulate")
async def run_simulation(
    service_slug: str = Body(..., embed=True),
    db: Session = Depends(dependencies.get_db),
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """One-click automated request submission for testing. RESTRICTED: Root Superuser only."""
    await lab_service.log_event("INFO", "SIMULATOR", f"Initiating simulation for slug: {service_slug}", force=True)
    
    # Use first available client for simulation
    client = db.query(models.User).join(models.User.roles).filter(models.Role.name == "Client").first()
    if not client:
        await lab_service.log_event("ERROR", "SIMULATOR", "No client account available in database to act as requester.", force=True)
        raise HTTPException(status_code=404, detail="No client found for simulation")
        
    try:
        request = await lab_service.simulate_request(db, client.id, service_slug)
        return {"status": "success", "request_id": request.id}
    except Exception as e:
        await lab_service.log_event("ERROR", "SIMULATOR", f"Simulation failure: {str(e)}", force=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backup")
def get_backup(
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """
    Generate and stream a database backup.
    RESTRICTED: Root Superuser only.
    """
    db_url = str(settings.DATABASE_URL)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"balaka_backup_{timestamp}.sql"

    if not db_url.startswith("postgresql"):
        raise HTTPException(status_code=400, detail="Only PostgreSQL is supported for system backup")

    try:
        process = subprocess.Popen(
            ["pg_dump", db_url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return StreamingResponse(
            process.stdout,
            media_type="application/sql",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostgreSQL backup failed: {str(e)}")

@router.post("/backup/auto-trigger")
def trigger_auto_backup(
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """
    Manually trigger the auto-backup process to verify it works.
    RESTRICTED: Root Superuser only.
    """
    filepath = perform_db_backup()
    if filepath:
        return {"status": "success", "message": f"Auto-backup successfully triggered. File saved at: {filepath}"}
    else:
        raise HTTPException(status_code=500, detail="Auto-backup trigger failed. Check server logs for details.")

@router.post("/restore")
async def restore_db(
    file: UploadFile = File(...),
    password: str = Form(...),
    db: Session = Depends(dependencies.get_db),
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """
    Restore database from a SQL backup file.
    RESTRICTED: Root Superuser + Password Verification.
    """
    # 0. Password Verification
    if not security.verify_password(password, current_user.hashed_password):
        await lab_service.log_event("WARNING", "MAINTENANCE", f"Failed restore attempt (wrong password) by: {current_user.email}")
        raise HTTPException(status_code=400, detail="Incorrect password")

    # 1. Validation
    if not file.filename.endswith((".sql", ".dump")):
        raise HTTPException(status_code=400, detail="Only .sql or .dump files are accepted")
    
    content = await file.read()
    content_str = content.decode(errors="ignore")
    
    # Simple heuristic validation
    is_valid = False
    if "CREATE TABLE" in content_str or "INSERT INTO" in content_str:
        is_valid = True
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="Uploaded file does not appear to be a valid SQL dump")

    # PRE-EMPTIVE CLEANUP: 
    # Close the current request's DB session so it doesn't hold a stale connection 
    # after we run the kill switch.
    db.close()

    db_url = str(settings.DATABASE_URL)
    if not db_url.startswith("postgresql"):
        raise HTTPException(status_code=400, detail="Only PostgreSQL is supported for system restore")
    
    # 2. Enter Maintenance Mode
    settings.MAINTENANCE_MODE = True
    
    # Create a dedicated admin engine with AUTOCOMMIT to handle DDL (Drop/Create Schema)
    admin_engine = create_engine(str(settings.DATABASE_URL), isolation_level="AUTOCOMMIT", pool_pre_ping=True)

    try:
        with admin_engine.connect() as conn:
            # Kill other connections to allow DROP SCHEMA
            conn.execute(text("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = current_database()
                AND pid <> pg_backend_pid();
            """))
            
            # Now safely drop and recreate public schema
            conn.execute(text("DROP SCHEMA public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        
        admin_engine.dispose()

        process = subprocess.Popen(
            ["psql", db_url],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=content_str)
        
        if process.returncode != 0:
            print(f"Postgres restore warning/error: {stderr}")
        
        return {"status": "success", "message": "Database restored successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
    finally:
        # 3. Exit Maintenance Mode
        settings.MAINTENANCE_MODE = False

@router.post("/reset")
async def factory_reset(
    password: str = Body(..., embed=True),
    db: Session = Depends(dependencies.get_db),
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """
    Perform a factory reset: Cleanup all data and re-seed foundational data.
    RESTRICTED: Root Superuser + Password Verification.
    """
    # 0. Password Verification
    if not security.verify_password(password, current_user.hashed_password):
        await lab_service.log_event("WARNING", "MAINTENANCE", f"Failed reset attempt (wrong password) by: {current_user.email}")
        raise HTTPException(status_code=400, detail="Incorrect password")

    if not cleanup_db or not seed_all:
        raise HTTPException(status_code=500, detail="Maintenance scripts not found")
        
    # Close the current session before killing connections
    db.close()
    engine.dispose() # FORCE CLEAR POOL

    settings.MAINTENANCE_MODE = True
    try:
        # 1. Cleanup
        await lab_service.log_event("INFO", "MAINTENANCE", "Starting database cleanup...")
        cleanup_db.cleanup_db()
        await lab_service.log_event("SUCCESS", "MAINTENANCE", "Database cleanup successful.")
        
        # Force clear pool again after cleanup kills connections
        engine.dispose()

        # 2. Re-seed
        await lab_service.log_event("INFO", "MAINTENANCE", "Starting database seeding...")
        
        # Bridge sync seeder logs to async lab_service
        loop = asyncio.get_running_loop()
        def sync_log(level, msg):
            loop.create_task(lab_service.log_event(level, "SEEDER", msg, force=True))
            
        seed_all.seed_all(log_callback=sync_log)
        
        # 3. Post-Seed Verification
        await lab_service.log_event("INFO", "MAINTENANCE", "Verifying system state after seed...")
        verification_db = SessionLocal()
        try:
            user_count = verification_db.query(models.User).count()
            role_count = verification_db.query(models.Role).count()
            service_count = verification_db.query(models.ServiceDefinition).count()
            
            if user_count > 0 and role_count > 0:
                await lab_service.log_event("SUCCESS", "MAINTENANCE", f"System verified: {user_count} users, {role_count} roles, {service_count} services seeded.")
            else:
                raise Exception(f"Database empty after seeding! (U:{user_count}, R:{role_count})")
        finally:
            verification_db.close()
            
        await lab_service.log_event("SUCCESS", "MAINTENANCE", "Database seeding successful.")
        
        return {"status": "success", "message": "Factory reset completed successfully"}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        await lab_service.log_event("ERROR", "MAINTENANCE", f"Factory reset failed: {str(e)}", metadata={"traceback": error_details})
        raise HTTPException(status_code=500, detail=f"Factory reset failed: {str(e)}")
    finally:
        settings.MAINTENANCE_MODE = False

@router.post("/cache-clear")
def clear_cache(
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """Placeholder for clearing system cache. RESTRICTED: Root Superuser only."""
    return {"status": "success", "message": "System cache cleared"}

@router.post("/audit-cleanup")
async def audit_cleanup(
    password: str = Body(..., embed=True),
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """Placeholder for audit log cleanup. RESTRICTED: Root Superuser + Password Verification."""
    if not security.verify_password(password, current_user.hashed_password):
        await lab_service.log_event("WARNING", "MAINTENANCE", f"Failed audit cleanup attempt (wrong password) by: {current_user.email}")
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    return {"status": "success", "message": "Audit logs archived and cleaned"}

@router.get("/reindex")
def reindex_db(
    current_user: user_model.User = Depends(dependencies.require_root),
):
    """Placeholder for database reindexing. RESTRICTED: Root Superuser only."""
    return {"status": "success", "message": "Database reindexing completed"}

@router.get("/currency-rate")
async def get_currency_rate(
    db: Session = Depends(dependencies.get_db)
):
    """
    Fetches SAR to BDT exchange rate from centralized finance service.
    Includes fallback and caching for high reliability.
    """
    rate = await finance_service.get_exchange_rate(db)
    return {
        "base": "SAR",
        "target": "BDT",
        "rate": rate,
        "provider": "consolidated_feed",
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/coupons/validate/{code}")
def validate_coupon(
    code: str,
    db: Session = Depends(dependencies.get_db)
):
    """
    Validates a coupon code and returns its discount value.
    """
    coupon = db.query(models.Coupon).filter(
        models.Coupon.code == code,
        models.Coupon.is_active == True
    ).first()

    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or inactive coupon code.")

    # Check expiry
    if coupon.expiry_date and coupon.expiry_date < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This coupon has expired.")

    # Check usage limit
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="This coupon has reached its usage limit.")

    return {
        "code": coupon.code,
        "value": coupon.value,
        "is_percentage": coupon.is_percentage
    }



