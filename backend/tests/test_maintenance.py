import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app import models
from app.core.maintenance import cleanup_completed_requests_files
from app.core.config import settings

def test_automated_file_cleanup(db: Session):
    # 0. Setup: Create a user
    user = models.User(
        email="test_maintenance@example.com",
        hashed_password="hashed",
        full_name="Maintenance Test User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. Setup: Create a service with file fields
    service = models.ServiceDefinition(
        name="Test Cleanup Service",
        slug="test-cleanup",
        form_schema={
            "sections": [
                {
                    "fields": [
                        {"key": "passport_copy", "type": "file", "label": "Passport"}
                    ]
                }
            ]
        }
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    # 2. Create a dummy file in UPLOAD_DIR
    filename = "test_cleanup_file.pdf"
    file_path = settings.UPLOAD_DIR / filename
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w") as f:
        f.write("dummy content")

    # 3. Create a ServiceRequest
    # A. One that is Completed BUT RECENT (should NOT be cleaned)
    req_recent = models.ServiceRequest(
        user_id=user.id,
        service_def_id=service.id,
        status="Completed",
        form_data={"passport_copy": f"/api/v1/files/secure/{filename}"},
        updated_at=datetime.now(timezone.utc)
    )
    db.add(req_recent)
    
    # B. One that is Completed AND OLD (should BE cleaned)
    # We need to manually set updated_at which might be tricky if onupdate is active
    # But for testing we can try
    old_date = datetime.now(timezone.utc) - timedelta(days=10)
    req_old = models.ServiceRequest(
        user_id=user.id,
        service_def_id=service.id,
        status="Completed",
        form_data={"passport_copy": f"/api/v1/files/secure/{filename}"},
        updated_at=old_date
    )
    db.add(req_old)
    
    # C. One that is PROCESSING and OLD (should NOT be cleaned)
    req_processing = models.ServiceRequest(
        user_id=user.id,
        service_def_id=service.id,
        status="Processing",
        form_data={"passport_copy": f"/api/v1/files/secure/{filename}"},
        updated_at=old_date
    )
    db.add(req_processing)
    
    db.commit()
    
    # Force updated_at for testing (since onupdate might have overwritten it)
    db.query(models.ServiceRequest).filter(models.ServiceRequest.id == req_old.id).update({"updated_at": old_date})
    db.query(models.ServiceRequest).filter(models.ServiceRequest.id == req_processing.id).update({"updated_at": old_date})
    db.commit()
    
    # 4. Run cleanup
    cleanup_completed_requests_files()
    
    # 5. Verify
    db.refresh(req_recent)
    db.refresh(req_old)
    db.refresh(req_processing)
    
    # Recent should still have the link
    assert "/api/v1/files/secure/" in req_recent.form_data["passport_copy"]
    
    # Old should be cleaned
    assert "[File Deleted" in req_old.form_data["passport_copy"]
    
    # Processing should NOT be cleaned even if old
    assert "/api/v1/files/secure/" in req_processing.form_data["passport_copy"]
    
    # The file should be deleted (since req_old was cleaned)
    # Wait, in this test they all point to the SAME file.
    # If one is cleaned, the file is deleted, which might affect others if they point to it.
    # But usually each request has its own file.
    assert not file_path.exists()
    
    # Clean up
    if file_path.exists():
        os.remove(file_path)
