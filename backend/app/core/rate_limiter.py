from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from jose import jwt
import os

def get_rate_limit_key(request: Request):
    """
    Returns a rate limit key. 
    Prioritizes User ID from JWT if available, otherwise falls back to IP.
    This ensures shared IP environments (offices) don't face collateral blocks.
    """
    # 1. Try to extract User ID from Authorization Header
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            # We use a fast, unsafe decode if we just want the 'sub' for rate limiting
            # or a safe one if we have the secret. We'll use the secret for safety.
            from app.core.config import settings
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            # Token might be invalid or expired, fall back to IP
            pass

    # 2. Fallback: IP Detection
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return get_remote_address(request)

# Initialize the Limiter
limiter = Limiter(key_func=get_rate_limit_key)