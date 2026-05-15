from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal

def drop_all_tables():
    db: Session = SessionLocal()
    try:
        print("Dropping all tables in public schema...")
        # Postgres-specific block to drop all tables
        db.execute(text("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """))
        
        db.commit()
        print("All tables dropped.")
    except Exception as e:
        print(f"Error dropping tables: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    drop_all_tables()

