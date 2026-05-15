import shutil
import re
import os
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from app.core.config import settings
from app.api import dependencies
from app.models import user as user_model
from PIL import Image
import io

router = APIRouter()

# Robust absolute path resolution for uploads
# Use centralized path from settings
UPLOAD_DIR = settings.UPLOAD_DIR
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Strict Allowlist for File Uploads
ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "webp",  # Images
    "pdf", "docx", "doc", "txt"    # Documents
}

def sanitize_filename_part(part: str) -> str:
    """Remove special characters from filename parts and replace hyphens with underscores."""
    # First replace hyphens with underscores
    part = part.replace("-", "_")
    # Then remove anything that isn't alphanumeric, @, or _ (Removed dot to prevent traversal)
    return re.sub(r'[^a-zA-Z0-9@_]', '_', part)

def get_media_type(filename: str) -> str:
    """Helper to determine the media type of a file based on its extension."""
    import mimetypes
    # Explicitly handle common types we use to be safe
    if filename.lower().endswith(".webp"):
        return "image/webp"
    if filename.lower().endswith(".pdf"):
        return "application/pdf"
    if filename.lower().endswith(".png"):
        return "image/png"
    if filename.lower().endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    
    # Fallback to mimetypes
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"

@router.get("/secure/{filename}")
def get_secure_file(
    filename: str,
    current_user: Optional[user_model.User] = Depends(dependencies.get_current_user_flexible),
    guest_session_id: Optional[str] = Query(None),
):
    """
    Serve a file securely. Requires the user to be authenticated or have a valid guest session
    for support files.
    """
    # 1. Sanitize filename to prevent directory traversal
    safe_filename = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    # Get correct media type for the response
    media_type = get_media_type(safe_filename)

    # 2. Access Control
    # If it's a support file, allow if the identifier matches the user or guest session
    if safe_filename.startswith("support__"):
        parts = safe_filename.split("__")
        if len(parts) >= 2:
            file_identifier = parts[1]
            
            # Check if identifier matches current user
            if current_user and str(current_user.id) == file_identifier:
                return FileResponse(file_path, media_type=media_type)
            
            # Check if identifier matches guest session
            if guest_session_id and sanitize_filename_part(guest_session_id) == file_identifier:
                return FileResponse(file_path, media_type=media_type)
                
            # If user is admin/staff, they should be able to see all support files
            if current_user and (current_user.is_superuser or any(r.name == "Admin" for r in current_user.roles)):
                return FileResponse(file_path, media_type=media_type)

    # For other secure files, require active authentication
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to access this file")
    
    return FileResponse(file_path, media_type=media_type)

@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    current_user: Optional[user_model.User] = Depends(dependencies.get_current_user_flexible),
    user: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    service_id: Optional[str] = Query(None),
    field_name: Optional[str] = Query(None),
    service_slug: Optional[str] = Query(None),
    context: Optional[str] = Query(None) # e.g. "support_chat"
):
    """
    Upload a file. Auto-optimizes images (resizes to max 1600x1600 and converts to WebP).
    Supports context-aware naming: user_service_name_service_id_field_name.webp
    
    If 'service_slug' is provided, it saves to the frontend assets directory for public access.
    """
    # 1. SECURITY CHECKS
    if context == "support_chat":
        # Support chat uploads allow guests, but must be checked for bans/spam
        from app.core import support_security
        if current_user:
            support_security.check_support_ban(current_user)
        # We don't have ticket_id here to check is_spamming accurately, 
        # but the create_reply endpoint will check it when the URL is actually used.
        # However, we should still require a session or user.
        if not current_user and not user: # For guests, 'user' query param is session_id
             raise HTTPException(status_code=401, detail="Authentication or Guest Session required")
    else:
        # Other contexts require active authentication
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")

    # 5MB Limit Check
    MAX_SIZE = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
    await file.seek(0) # Reset stream for reading later

    # ALLOWLIST CHECK
    filename = file.filename or ""
    original_ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    if original_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type '{original_ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    try:
        # Determine destination and filename
        if service_slug:
            # (Existing service slug logic...)
            assets_dir = settings.PROJECT_ROOT / "frontend" / "packages" / "assets" / "images" / "services"
            assets_dir.mkdir(parents=True, exist_ok=True)
            
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Only images are allowed for service thumbnails.")

            safe_slug = re.sub(r'[^a-z0-9-]', '', service_slug.lower())
            filename = f"svc-{safe_slug}-tmp.webp"
            file_path = assets_dir / filename
            
            import time
            timestamp = int(time.time() * 1000)
            file_url = f"/shared/images/services/{filename}?t={timestamp}"
            
            try:
                content = await file.read()
                image = Image.open(io.BytesIO(content))
                image.thumbnail((1600, 1600))
                image.save(file_path, "WEBP", quality=90, method=6)
            except Exception as e:
                print(f"Service image processing error: {e}")
                file.file.seek(0)
                with file_path.open("wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                    
            return {"url": file_url, "filename": filename}

        # Default Logic (Secure Uploads)
        if context == "support_chat":
             # support__{session_id/user_id}__{timestamp}_{uuid}
             identifier = user if user else str(current_user.id)
             import time
             base_name = f"support__{sanitize_filename_part(identifier)}__{int(time.time())}_{str(uuid4())[:8]}"
        elif all([user, service_name, service_id, field_name]):
            # Use requested naming convention
            s_user = sanitize_filename_part(user)
            s_svc = sanitize_filename_part(service_name)
            s_id = sanitize_filename_part(str(service_id))
            s_field = sanitize_filename_part(field_name)
            base_name = f"{s_user}_{s_svc}_{s_id}_{s_field}"
            
            try:
                for existing_file in UPLOAD_DIR.glob(f"{base_name}.*"):
                    existing_file.unlink(missing_ok=True)
            except Exception as e:
                print(f"Cleanup error during upload: {e}")
        else:
            base_name = str(uuid4())

        # Check if it's an image that we should optimize
        is_image = original_ext in ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "gif"]
        
        if is_image:
            # For images, we always save as .webp
            filename = f"{base_name}.webp"
            file_path = UPLOAD_DIR / filename
            try:
                # Optimization Logic: Convert all images to WebP
                content = await file.read()
                image = Image.open(io.BytesIO(content))
                
                # Resize if too large
                image.thumbnail((1600, 1600))
                
                # Save as WebP
                image.save(file_path, "WEBP", quality=80, method=6)
            except Exception as e:
                print(f"Image processing error: {e}")
                # Fallback to original save if image processing fails
                file.file.seek(0)
                file_path = UPLOAD_DIR / f"{base_name}.{original_ext}"
                filename = f"{base_name}.{original_ext}"
                with file_path.open("wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
        else:
            # Regular save for all other major formats (PDF, DOCX, etc)
            filename = f"{base_name}.{original_ext}"
            file_path = UPLOAD_DIR / filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
        # Return the secure endpoint URL instead of the static path
        file_url = f"/api/v1/files/secure/{filename}"
        
        return {"url": file_url, "filename": file.filename}
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")
