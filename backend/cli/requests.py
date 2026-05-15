from app.db.session import SessionLocal
from app import models
from sqlalchemy.orm import joinedload

def list_requests(status: str = None, limit: int = 20):
    """
    CLI Tool to audit service requests.
    """
    db = SessionLocal()
    try:
        query = db.query(models.ServiceRequest).options(
            joinedload(models.ServiceRequest.user),
            joinedload(models.ServiceRequest.service_definition)
        ).order_by(models.ServiceRequest.created_at.desc())
        
        if status:
            query = query.filter(models.ServiceRequest.status == status)
            
        requests = query.limit(limit).all()

        print(f"\n{'ID':<5} | {'CUSTOMER':<20} | {'SERVICE':<25} | {'STATUS':<20} | {'PRICE'}")
        print("-" * 90)
        for r in requests:
            cust = r.user.full_name if r.user else "N/A"
            serv = r.service_definition.name if r.service_definition else "N/A"
            print(f"{r.id:<5} | {cust[:20]:<20} | {serv[:25]:<25} | {r.status:<20} | ${r.selling_price:8.2f}")
        print("-" * 90)
        print(f"Showing last {len(requests)} requests.\n")
    finally:
        db.close()

