import logging
import os
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app import models
from app.core.config import settings

logger = logging.getLogger(__name__)

def cleanup_completed_requests_files():
    """
    Background task to delete personal files from ServiceRequests 
    that were completed more than 7 days ago.
    """
    db: Session = SessionLocal()
    try:
        # 1. Calculate cutoff date (7 days ago)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
        
        # 2. Find completed requests updated before cutoff
        # We use updated_at because that's when the status changed to Completed
        requests = db.query(models.ServiceRequest).filter(
            models.ServiceRequest.status == "Completed",
            models.ServiceRequest.updated_at <= cutoff_date
        ).all()
        
        cleaned_count = 0
        file_deleted_count = 0
        
        for request in requests:
            if not request.service_definition or not request.form_data:
                continue

            schema = request.service_definition.form_schema or {}
            sections = schema.get("sections", [])
            
            file_fields = []
            for section in sections:
                for field in section.get("fields", []):
                    if field.get("type") == "file":
                        file_fields.append(field.get("key"))

            if not file_fields:
                continue

            modified_form_data = dict(request.form_data)
            changed = False

            for key in file_fields:
                file_url = modified_form_data.get(key)
                # Skip if already deleted or not a string
                if not file_url or not isinstance(file_url, str) or "[File Deleted" in file_url:
                    continue
                
                # Example URL: /api/v1/files/secure/filename.webp
                if "/api/v1/files/secure/" in file_url:
                    filename = file_url.split("/api/v1/files/secure/")[-1]
                    filename = filename.split("?")[0]
                    
                    file_path = settings.UPLOAD_DIR / filename
                    if file_path.exists() and file_path.is_file():
                        try:
                            os.remove(file_path)
                            file_deleted_count += 1
                        except Exception as e:
                            logger.error(f"MAINTENANCE: Could not delete {file_path}: {e}")
                    
                    modified_form_data[key] = "[File Deleted for Privacy / ব্যক্তিগত ফাইল মুছে ফেলা হয়েছে]"
                    changed = True

            if changed:
                request.form_data = modified_form_data
                db.add(request)
                cleaned_count += 1

        if cleaned_count > 0:
            db.commit()
            logger.info(f"\033[92mMAINTENANCE: Cleaned {cleaned_count} requests, deleted {file_deleted_count} files.\033[0m")
        
        # Also clean up temporary service images
        cleanup_temp_service_images()
        
    except Exception as e:
        logger.error(f"MAINTENANCE ERROR: {e}")
    finally:
        db.close()

def cleanup_temp_service_images():
    """
    Delete temporary service images (-tmp.webp) that are older than 24 hours.
    These are created when an admin uploads a thumbnail but doesn't save the service.
    """
    try:
        # Maintenance.py is in backend/app/core/maintenance.py
        # Project root is .parent.parent.parent.parent (up to balaka-mis/)
        project_root = Path(__file__).resolve().parent.parent.parent.parent
        assets_dir = project_root / "frontend" / "packages" / "assets" / "images" / "services"
        
        if not assets_dir.exists():
            return

        cutoff_time = time.time() - (24 * 3600) # 24 hours ago
        deleted_count = 0
        
        for file_path in assets_dir.glob("*-tmp.webp"):
            if file_path.is_file():
                if file_path.stat().st_mtime < cutoff_time:
                    try:
                        file_path.unlink()
                        deleted_count += 1
                    except Exception as e:
                        logger.error(f"MAINTENANCE: Could not delete temp image {file_path}: {e}")
        
        if deleted_count > 0:
            logger.info(f"\033[92mMAINTENANCE: Cleaned {deleted_count} temporary service images.\033[0m")
    except Exception as e:
        logger.error(f"MAINTENANCE ERROR (Temp Images): {e}")
