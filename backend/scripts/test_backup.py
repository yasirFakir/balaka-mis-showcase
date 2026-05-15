import sys
import os

# Add the backend directory to the Python path
backend_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_path)

from app.core.backup import perform_db_backup
from app.core.config import settings
import logging

# Configure logging to see errors from perform_db_backup
logging.basicConfig(level=logging.INFO)

def test():
    print("--- Starting Backup Test ---")
    print(f"Database URL: {settings.DATABASE_URL}")
    
    try:
        filepath = perform_db_backup()
        if filepath and os.path.exists(filepath):
            print(f"SUCCESS: Backup file created at {filepath}")
            print(f"File size: {os.path.getsize(filepath)} bytes")
            return True
        else:
            print("FAILURE: Backup function returned None or file does not exist")
            return False
    except Exception as e:
        print(f"ERROR during test execution: {str(e)}")
        return False

if __name__ == "__main__":
    success = test()
    sys.exit(0 if success else 1)
