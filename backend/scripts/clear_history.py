
from app.db.session import SessionLocal
from app.models.service_request import ServiceRequest
from app.models.status_history import StatusHistory
from app.models.transaction import Transaction
from app.models.vendor import Vendor, VendorTransaction
from app.models.ticket import SupportTicket, TicketMessage
from app.models.notification import Notification
from sqlalchemy import text

def clear_history():
    db = SessionLocal()
    try:
        print("Clearing Transaction records...")
        db.query(Transaction).delete()
        
        print("Clearing VendorTransaction records...")
        db.query(VendorTransaction).delete()
        
        print("Clearing TicketMessage records...")
        db.query(TicketMessage).delete()
        
        print("Clearing SupportTicket records...")
        db.query(SupportTicket).delete()
        
        print("Clearing StatusHistory records...")
        db.query(StatusHistory).delete()
        
        print("Clearing ServiceRequest records...")
        db.query(ServiceRequest).delete()
        
        print("Clearing Notification records...")
        db.query(Notification).delete()
        
        print("Resetting Vendor balances...")
        db.query(Vendor).update({Vendor.current_balance: 0.0})
        
        db.commit()
        print("Successfully cleared all financial and service history.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing history: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_history()
