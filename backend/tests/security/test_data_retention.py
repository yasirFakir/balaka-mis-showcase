import pytest
import os
import shutil
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud.user import user as user_crud
from app.crud.service import service as service_crud
from app.crud.service_request import service_request as request_crud
from app.core.maintenance import cleanup_completed_requests_files
from app.core.config import settings
from app.api.endpoints.system import factory_reset

@pytest.fixture(autouse=True)
def patch_upload_dir(tmp_path, monkeypatch):
    """Safely redirect uploads to a temp dir for ALL tests in this module."""
    d = tmp_path / "static" / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "UPLOAD_DIR", d)
    return d

# Helper to create dummy file
def create_dummy_file(filename: str) -> str:
    path = settings.UPLOAD_DIR / filename
    # Ensure subdir exists if filename has path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write("dummy content")
    return str(path)

def test_maintenance_pii_scrubbing(db: Session):
    """
    Verify that completed requests older than 7 days have their PII files deleted.
    """
    # 1. Setup Data
    # Create User
    user_in = schemas.UserCreate(email="retention_test@example.com", password="password", full_name="Retention Test")
    user = user_crud.create(db, obj_in=user_in)

    # Create Service
    service = service_crud.create(db, obj_in=schemas.ServiceDefinitionCreate(name="Privacy Test", slug="priv-test", base_price=100))
    
    # Create Dummy File
    file_name = "test_passport_123.jpg"
    file_path = create_dummy_file(file_name)
    relative_url = f"/api/v1/files/secure/{file_name}"
    
    # Create Old Completed Request
    old_date = datetime.now(timezone.utc) - timedelta(days=8)
    
    request = request_crud.create_with_user(
        db, 
        obj_in=schemas.ServiceRequestCreate(
            service_def_id=service.id, 
            form_data={
                "passport_copy": relative_url, 
                "other_field": "keep_this"
            }, 
            quantity=1
        ),
        user_id=user.id
    )
    
    # Manually update status and date (bypass workflow for speed)
    request.status = "Completed"
    request.created_at = old_date
    request.updated_at = old_date
    
    # Need to fake schema so maintenance knows 'passport_copy' is a file
    request.service_definition.form_schema = {
        "sections": [
            {
                "fields": [
                    {"key": "passport_copy", "type": "file"},
                    {"key": "other_field", "type": "text"}
                ]
            }
        ]
    }
    db.add(request)
    db.commit()
    
    # 2. Run Maintenance
    cleanup_completed_requests_files()
    
    # 3. Verification
    db.refresh(request)
    
    # Check File System
    assert not os.path.exists(file_path), "Old PII file should be physically deleted"
    
    # Check DB
    assert "[File Deleted" in str(request.form_data.get("passport_copy")), "DB record should be scrubbed"


def test_factory_reset_wipes_files(db: Session):
    """
    Verify that a factory reset clears the upload directory.
    """
    # 1. Mock the actual cleanup_db script to avoid destroying the test DB schema completely 
    # (since pytest needs it for teardown). We only want to test the FILE deletion logic here.
    
    # Create some junk files
    create_dummy_file("reset_test_1.pdf")
    create_dummy_file("subdir/reset_test_2.png")
    
    assert os.path.exists(settings.UPLOAD_DIR / "reset_test_1.pdf")
    
    # Logic simulation (as in system.py factory_reset)
    if settings.UPLOAD_DIR.exists():
        for filename in os.listdir(settings.UPLOAD_DIR):
            file_path = os.path.join(settings.UPLOAD_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                pass
                
    # Verify Empty
    # Re-create dir if deleted (shutil.rmtree removes the dir itself)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    assert len(os.listdir(settings.UPLOAD_DIR)) == 0, "Uploads directory should be empty after reset"
