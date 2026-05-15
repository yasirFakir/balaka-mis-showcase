from pathlib import Path
from typing import List, Optional, Any
from pydantic import field_validator, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

# Build an absolute path to the project root directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    PROJECT_ROOT: Path = PROJECT_ROOT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"
    BACKEND_CORS_ORIGINS: List[str] = []

    MAINTENANCE_MODE: bool = False
    ROOT_EMAIL: Optional[str] = None

    # Email (Zoho SMTP)
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = 587
    SMTP_HOST: Optional[str] = "smtp.zoho.com"
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = "Balaka Travel & Logistics"

    # Frontend URL for Activation and Password Reset links
    # Default to production, overridden by .env for local dev
    FRONTEND_HOST: str = "https://airbalakatravel.com"
    ADMIN_FRONTEND_HOST: str = "https://admin.airbalakatravel.com"

    # Storage
    UPLOAD_DIR: Path = PROJECT_ROOT / "backend" / "static" / "uploads"

    # Database
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], values: Any) -> Any:
        if isinstance(v, str) and v:
            return v
        
        # Ensure all required postgres settings are present
        if all(
            values.data.get(key)
            for key in ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_SERVER", "POSTGRES_DB"]
        ):
            # Correctly format the path without a leading slash, Pydantic handles the separator
            return str(
                PostgresDsn.build(
                    scheme="postgresql",
                    username=values.data.get("POSTGRES_USER"),
                    password=values.data.get("POSTGRES_PASSWORD"),
                    host=values.data.get("POSTGRES_SERVER"),
                    path=f"{values.data.get('POSTGRES_DB') or ''}",
                )
            )
        raise ValueError("DATABASE_URL or all POSTGRES_* settings must be provided.")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=PROJECT_ROOT / ".env",
        extra="ignore"
    )

settings = Settings()
