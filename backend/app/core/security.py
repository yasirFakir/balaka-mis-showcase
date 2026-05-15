from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64
import hashlib

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"])

def _get_fernet_key() -> bytes:
    # Derive a 32-byte key from SECRET_KEY
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)

def encrypt_message(message: str) -> str:
    f = Fernet(_get_fernet_key())
    return f.encrypt(message.encode()).decode()

def decrypt_message(encrypted_message: str) -> str:
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(encrypted_message.encode()).decode()
    except Exception:
        # Fallback for legacy plain text messages
        return encrypted_message

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

import secrets
import string

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_transaction_id(prefix: str = "TXN", id: Optional[int] = None) -> str:
    """
    Generates a high-entropy, unique transaction ID.
    Format 1 (With ID): PREFIX-SERIAL-4CHAR_HEX (e.g., TXN-000123-A1B2)
    Format 2 (No ID): PREFIX-YYYYMMDD-8CHAR_HEX (e.g., TXN-20260114-B4F2A9C1)
    """
    if id is not None:
        # Serial Number + Unique Identifier
        random_hex = secrets.token_hex(2).upper()
        return f"{prefix}-{id:06d}-{random_hex}"
    
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")
    random_hex = secrets.token_hex(4).upper()
    return f"{prefix}-{date_str}-{random_hex}"

def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_MINUTES / 60)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt

def verify_password_reset_token(token: str) -> Optional[str]:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return decoded_token["sub"]
    except jwt.JWTError:
        return None
