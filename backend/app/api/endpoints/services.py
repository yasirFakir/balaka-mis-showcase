import re
import time
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from app.api import dependencies
from app.crud.service import service as service_crud

router = APIRouter()

# Resolve paths for asset management
backend_root = Path(__file__).resolve().parent.parent.parent.parent
ASSETS_DIR = backend_root.parent / "frontend" / "packages" / "assets" / "images" / "services"

@router.get("", response_model=schemas.ListResponse[schemas.ServiceDefinition])
@router.get("/", response_model=schemas.ListResponse[schemas.ServiceDefinition])
def read_services(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    include_private: bool = False,
    all: bool = False,
    current_user: models.User = Depends(dependencies.get_current_user_optional),
):
    """
    Retrieve services. Public services only by default.
    Staff/Admin can see private services if include_private=True.
    Use all=True (Admin/Staff only) to fetch everything (including inactive/discontinued).
    """
    query = db.query(models.ServiceDefinition)
    
    # 1. Filter by Availability (Public only sees available)
    is_staff = current_user and (current_user.is_superuser or any(r.name in ["Admin", "Manager", "Staff"] for r in current_user.roles))
    
    if not is_staff:
        # Public view: Must be available AND public
        query = query.filter(models.ServiceDefinition.is_available == True)
        query = query.filter(models.ServiceDefinition.is_public == True)
    else:
        if all:
            # Fetch EVERYTHING (for exports/admin lists)
            pass
        else:
            # Admin view: Filter by private flag if requested, but see unavailable services too
            if not include_private:
                query = query.filter(models.ServiceDefinition.is_public == True)

    total = query.count()
    services = query.order_by(models.ServiceDefinition.id.asc()).offset(skip).limit(limit).all()
    
    return {
        "items": services,
        "total": total
    }

@router.post("/", response_model=schemas.ServiceDefinition)
def create_service(
    *,
    db: Session = Depends(dependencies.get_db),
    service_in: schemas.ServiceDefinitionCreate,
    current_user: models.User = Depends(dependencies.require_permission("services.manage_catalog")),
):
    """
    Create new service definition. Admin only.
    """
    service = service_crud.get_by_slug(db, slug=service_in.slug)
    if service:
        raise HTTPException(
            status_code=400,
            detail="The service with this slug already exists in the system.",
        )
    service = service_crud.create(db, obj_in=service_in, created_by_id=current_user.id)
    return service

@router.put("/{service_id}", response_model=schemas.ServiceDefinition)
def update_service(
    *,
    db: Session = Depends(dependencies.get_db),
    service_id: int,
    service_in: schemas.ServiceDefinitionUpdate,
    current_user: models.User = Depends(dependencies.require_permission("services.manage_catalog")),
):
    """
    Update a service definition. Admin only.
    """
    service = service_crud.get(db, id=service_id)
    if not service:
        raise HTTPException(
            status_code=404,
            detail="The service with this id does not exist in the system",
        )
    
    # Finalize Image if it's a new upload or Handle Deletion
    if service_in.image_url and "-tmp.webp" in service_in.image_url:
        try:
            # 1. Extract the filename from the URL (ignore query params)
            # URL format: /shared/images/services/svc-slug-tmp.webp?t=123
            url_path = service_in.image_url.split("?")[0]
            filename = url_path.split("/")[-1]
            
            if filename.endswith("-tmp.webp"):
                tmp_file_path = ASSETS_DIR / filename
                final_filename = filename.replace("-tmp.webp", ".webp")
                final_file_path = ASSETS_DIR / final_filename
                
                if tmp_file_path.exists():
                    # Rename (overwrite if exists)
                    tmp_file_path.replace(final_file_path)
                    
                    # Update the URL in the input schema to the final clean URL with cache-buster
                    timestamp = int(time.time() * 1000)
                    service_in.image_url = f"/shared/images/services/{final_filename}?t={timestamp}"
        except Exception as e:
            print(f"Error finalizing service image: {e}")
            # Continue with update even if image finalization fails
    elif service_in.image_url is None or service_in.image_url == "":
        # If image_url is explicitly removed, delete the physical files if they exist
        try:
            for ext in [".webp", "-tmp.webp"]:
                file_path = ASSETS_DIR / f"svc-{service.slug}{ext}"
                if file_path.exists():
                    file_path.unlink()
        except Exception as e:
            print(f"Error deleting service image files: {e}")
    
    service = service_crud.update(db, db_obj=service, obj_in=service_in, updated_by_id=current_user.id)
    return service

@router.get("/{service_id}", response_model=schemas.ServiceDefinition)
def read_service(
    *,
    db: Session = Depends(dependencies.get_db),
    service_id: int,
):
    """
    Get service by ID. Public.
    """
    service = service_crud.get(db, id=service_id)
    if not service:
        raise HTTPException(
            status_code=404,
            detail="The service with this id does not exist in the system",
        )
    return service

@router.get("/{service_id}/staff", response_model=List[schemas.User])
def read_service_staff(
    *,
    db: Session = Depends(dependencies.get_db),
    service_id: int,
    current_user: models.User = Depends(dependencies.require_permission("users.view")),
):
    """
    Get staff members associated with a specific service.
    """
    service = service_crud.get(db, id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Find users who have this service in their allowed_services
    staff = (
        db.query(models.User)
        .join(models.User.allowed_services)
        .filter(models.ServiceDefinition.id == service_id)
        .filter(models.User.is_active == True)
        .all()
    )
    return staff

@router.delete("/{service_id}", response_model=schemas.ServiceDefinition)
def delete_service(
    service_id: int,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_superuser),
):
    """
    Delete a service definition. Restricted to Superusers.
    """
    service = service_crud.get(db, id=service_id)
    if not service:
        raise HTTPException(
            status_code=404,
            detail="The service with this id does not exist in the system",
        )
    service = service_crud.remove(db, id=service_id)
    return service
