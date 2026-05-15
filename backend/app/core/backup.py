import subprocess
import os
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

def perform_db_backup():
    """
    Generate a database backup and save it to static/backups.
    Returns the path to the backup file if successful, None otherwise.
    """
    db_url = str(settings.DATABASE_URL)
    # Get the absolute path to the backend directory
    # This file is in backend/app/core/backup.py, so .parent.parent.parent is backend/
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Use BD time (UTC+6) for filename if possible, but system time is safer for unique filenames
    # We'll just use ISO format for the timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    
    # Ensure backups directory exists
    backup_dir = os.path.join(backend_dir, "static", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = f"balaka_backup_{timestamp}.sql"
    filepath = os.path.join(backup_dir, filename)

    if not db_url.startswith("postgresql"):
        logger.error("Backup failed: Only PostgreSQL is supported")
        return None

    try:
        # Use pg_dump to create the backup
        # Pass the password via environment variable for security and reliability
        env = os.environ.copy()
        if settings.POSTGRES_PASSWORD:
            env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

        with open(filepath, "wb") as f:
            process = subprocess.run(
                ["pg_dump", db_url],
                stdout=f,
                stderr=subprocess.PIPE,
                check=True,
                env=env
            )
        
        # ANSI Green for success message
        logger.info(f"\033[92mDatabase backup created successfully: {filepath}\033[0m")
        return filepath
    except subprocess.CalledProcessError as e:
        logger.error(f"PostgreSQL backup failed: {e.stderr.decode()}")
        # Clean up partial file if it exists
        if os.path.exists(filepath):
            os.remove(filepath)
        return None
    except Exception as e:
        logger.error(f"Backup failed with unexpected error: {str(e)}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return None
