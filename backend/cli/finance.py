from app.db.session import SessionLocal
from app.core.finance import finance_service

def run_finance_diagnostics(verbose: bool = False):
    """
    Executes financial diagnostics via CLI.
    """
    db = SessionLocal()
    try:
        print(finance_service.run_diagnostics(db))
        if verbose:
            print("\n" + "="*50)
            print("REVENUE BY CATEGORY (VERIFIED)")
            print("="*50)
            categories = finance_service.get_revenue_by_category(db)
            if not categories:
                print("No category data available.")
            for cat in categories:
                print(f"{cat['name']:.<35} ${cat['value']:12.2f}")
            print("="*50)
    finally:
        db.close()
