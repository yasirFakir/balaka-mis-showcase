from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    str(settings.DATABASE_URL), 
    pool_pre_ping=True,
    pool_size=20,          # Allow up to 20 connections
    max_overflow=10        # Allow 10 extra during bursts
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
