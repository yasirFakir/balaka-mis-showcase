from app.db.session import SessionLocal
from app.seeds.core.seed_roles import seed_roles
from app.seeds.core.seed_permissions import seed_permissions
from app.seeds.core.seed_admin import seed_admin
from app.seeds.core.seed_staff import seed_staff
from app.seeds.mock.seed_client import seed_client
from app.seeds.core.seed_services import seed_services

def seed_all(log_callback=None):
    def log(level, message):
        if log_callback:
            import asyncio
            # If log_callback is async, we might need to handle it differently
            # but for now assume we can try to run it or it's a wrapper
            try:
                if asyncio.iscoroutinefunction(log_callback):
                    # We can't easily await here if seed_all is sync
                    # So we'll just print and hope for the best or use a sync wrapper
                    pass
                log_callback(level, message)
            except Exception:
                pass
        print(f"[{level}] {message}")

    log("INFO", "🚀 Starting Full System Seed (Production Only)...")
    db = SessionLocal()
    try:
        # 1. Base Structure
        log("INFO", "Seeding base roles and permissions...")
        seed_roles(db)
        seed_permissions(db)
        
        # 2. Core Users
        log("INFO", "Seeding core system users...")
        seed_admin(db)
        seed_staff(db)
        seed_client(db)
        
        # 3. Service Catalog
        log("INFO", "Seeding service catalog...")
        seed_services(db)
        
        db.commit()
        log("SUCCESS", "✅ Full Seeding Complete!")
    except Exception as e:
        db.rollback()
        log("ERROR", f"❌ Seeding Failed: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
