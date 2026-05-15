
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.permission import Permission

def list_perms():
    db = SessionLocal()
    perms = db.query(Permission).all()
    print(f"Total Permissions: {len(perms)}")
    for p in perms:
        print(f"{p.id}: {p.slug} - {p.description}")
    db.close()

if __name__ == "__main__":
    list_perms()
