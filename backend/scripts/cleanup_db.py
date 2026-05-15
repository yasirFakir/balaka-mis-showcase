from sqlalchemy import create_engine, text
import os
import sys

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def cleanup_db():
    engine = create_engine(settings.DATABASE_URL, isolation_level="AUTOCOMMIT", pool_pre_ping=True)
    
    with engine.connect() as connection:
        print("🚀 [CRITICAL] Starting PostgreSQL Database Wipe...")
        try:
            # 1. Kill other connections to release locks
            print("⚠️  Terminating other connections...")
            connection.execute(text("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = current_database()
                AND pid <> pg_backend_pid();
            """))
            
            # 2. Perform Truncate
            tables = [
                "status_history", 
                "ticket_message", 
                "support_ticket", 
                "transaction", 
                "vendor_transactions", 
                "service_request", 
                "service_variants", 
                "user_services", 
                "service_definition", 
                "vendors", 
                "user_roles", 
                "role_permissions", 
                "permission", 
                "role", 
                "\"user\""
            ]
            
            table_str = ", ".join(tables)
            connection.execute(text(f"TRUNCATE TABLE {table_str} RESTART IDENTITY CASCADE;"))
            
            print("✅ Database wiped successfully in under 1 second.")
        except Exception as e:
            print(f"❌ Cleanup failed: {e}")
            raise e

if __name__ == "__main__":
    cleanup_db()
