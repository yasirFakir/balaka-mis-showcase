from typing import List, Optional
from sqlalchemy import or_, cast, String, func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from app.crud.base import CRUDBase
from app.models.vendor import Vendor, VendorTransaction
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorTransactionCreate
from app.core import security

class CRUDVendor(CRUDBase[Vendor, VendorCreate, VendorUpdate]):
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, service_id: Optional[int] = None
    ) -> List[Vendor]:
        query = db.query(Vendor)
        if service_id:
            from app.models.service import service_vendors
            query = query.join(service_vendors).filter(service_vendors.c.service_id == service_id)
        return query.offset(skip).limit(limit).all()

    def create_with_owner(
        self, db: Session, *, obj_in: VendorCreate
    ) -> Vendor:
        db_obj = Vendor(
            name=obj_in.name,
            contact_person=obj_in.contact_person,
            phone=obj_in.phone,
            email=obj_in.email,
            address=obj_in.address,
            current_balance=0.0
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def record_transaction(
        self, db: Session, *, obj_in: VendorTransactionCreate, user_id: int
    ) -> VendorTransaction:
        # 1. Deduplication Check: Prevent identical transactions within 10 seconds
        from datetime import timedelta, timezone
        now = datetime.now(timezone.utc)
        ten_seconds_ago = now - timedelta(seconds=10)
        
        duplicate = db.query(VendorTransaction).filter(
            VendorTransaction.vendor_id == obj_in.vendor_id,
            VendorTransaction.amount == obj_in.amount,
            VendorTransaction.notes == obj_in.notes,
            VendorTransaction.transaction_type == obj_in.transaction_type,
            VendorTransaction.created_at >= ten_seconds_ago
        ).first()
        
        if duplicate:
            return duplicate

        # 2. Generate VND Transaction ID (Temp for constraint satisfaction)
        temp_txn_id = security.generate_transaction_id("VND")

        # 3. Currency Normalization (Requirement #195)
        # We store the amount in the system's base currency (SAR) for balance consistency.
        # If paying in BDT, SAR_Amount = BDT_Amount / Exchange_Rate
        base_amount = obj_in.amount
        if obj_in.currency != "SAR" and obj_in.exchange_rate > 0:
            base_amount = obj_in.amount / obj_in.exchange_rate

        db_obj = VendorTransaction(
            transaction_id=temp_txn_id,
            vendor_id=obj_in.vendor_id,
            amount=base_amount,
            claimed_amount=obj_in.amount, # The original amount entered
            transaction_type=obj_in.transaction_type,
            reference_id=obj_in.reference_id,
            currency=obj_in.currency,
            exchange_rate=obj_in.exchange_rate,
            proof_url=obj_in.proof_url,
            notes=obj_in.notes,
            created_by_id=user_id,
            created_at=now
        )
        db.add(db_obj)
        db.flush() # Populate ID

        # Generate Final Serial-Based ID
        db_obj.transaction_id = security.generate_transaction_id("VND", db_obj.id)
        
        # Update Vendor Balance
        vendor = db.query(Vendor).filter(Vendor.id == obj_in.vendor_id).first()
        if vendor:
            if obj_in.transaction_type == "PURCHASE":
                vendor.current_balance += base_amount
            elif obj_in.transaction_type == "PAYMENT":
                vendor.current_balance -= base_amount
            db.add(vendor)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_all_transactions(self, db: Session, skip: int = 0, limit: int = 100) -> List[VendorTransaction]:
        return db.query(VendorTransaction).offset(skip).limit(limit).all()

class CRUDVendorTransaction(CRUDBase[VendorTransaction, VendorTransactionCreate, VendorTransactionCreate]):
    def get_multi_with_count(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        search_query: Optional[str] = None,
        vendor_id: Optional[int] = None,
        vendor_type: Optional[str] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        filters: dict = None,
        order_by: any = None
    ):
        query = db.query(VendorTransaction).outerjoin(VendorTransaction.vendor)
        
        if vendor_id:
            query = query.filter(VendorTransaction.vendor_id == vendor_id)
            
        if vendor_type:
            query = query.filter(Vendor.type == vendor_type)

        if transaction_type:
            query = query.filter(VendorTransaction.transaction_type == transaction_type)
            
        if start_date:
            query = query.filter(VendorTransaction.created_at >= start_date)
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                from datetime import timedelta
                query = query.filter(VendorTransaction.created_at < end_date + timedelta(days=1))
            else:
                query = query.filter(VendorTransaction.created_at <= end_date)

        if search_query:
            tokens = search_query.split()
            for token in tokens:
                search_term = f"%{token}%"
                token_conditions = [
                    VendorTransaction.transaction_id.ilike(search_term),
                    VendorTransaction.reference_id.ilike(search_term),
                    VendorTransaction.notes.ilike(search_term),
                    Vendor.name.ilike(search_term)
                ]
                
                # Numeric amount match for this token
                try:
                    clean_num = token.replace(",", "").strip()
                    numeric_val = float(clean_num)
                    token_conditions.append(VendorTransaction.amount == numeric_val)
                    token_conditions.append(VendorTransaction.claimed_amount == numeric_val)
                except ValueError: pass
                
                query = query.filter(or_(*token_conditions))

        if filters:
            for field, value in filters.items():
                if hasattr(VendorTransaction, field) and value is not None:
                    query = query.filter(getattr(VendorTransaction, field) == value)
        
        total = query.count()
        
        if order_by is not None:
            query = query.order_by(order_by)
        else:
            query = query.order_by(VendorTransaction.created_at.desc())
            
        items = query.options(
            joinedload(VendorTransaction.created_by), 
            joinedload(VendorTransaction.vendor)
        ).offset(skip).limit(limit).all()
        
        return items, total

    def get_filtered_summary(
        self,
        db: Session,
        *,
        search_query: Optional[str] = None,
        vendor_id: Optional[int] = None,
        vendor_type: Optional[str] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        
        query = db.query(VendorTransaction).outerjoin(VendorTransaction.vendor)
        
        # Apply same filters
        if vendor_id:
            query = query.filter(VendorTransaction.vendor_id == vendor_id)
        if vendor_type:
            query = query.filter(Vendor.type == vendor_type)
        if transaction_type:
            query = query.filter(VendorTransaction.transaction_type == transaction_type)
        if start_date:
            query = query.filter(VendorTransaction.created_at >= start_date)
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                from datetime import timedelta
                query = query.filter(VendorTransaction.created_at < end_date + timedelta(days=1))
            else:
                query = query.filter(VendorTransaction.created_at <= end_date)
        if search_query:
            search_term = f"%{search_query}%"
            conditions = [
                VendorTransaction.transaction_id.ilike(search_term),
                Vendor.name.ilike(search_term),
                VendorTransaction.notes.ilike(search_term)
            ]
            try:
                clean_q = search_query.replace("#", "").replace(",", "").strip()
                numeric_val = float(clean_q)
                conditions.append(VendorTransaction.amount == numeric_val)
                conditions.append(VendorTransaction.claimed_amount == numeric_val)
            except ValueError: pass
            
            # Partial matches
            conditions.append(cast(VendorTransaction.amount, String).ilike(search_term))
            conditions.append(cast(VendorTransaction.claimed_amount, String).ilike(search_term))
            
            query = query.filter(or_(*conditions))

        # Calculate totals
        total_purchase = db.query(func.sum(VendorTransaction.amount)).filter(
            VendorTransaction.id.in_(query.with_entities(VendorTransaction.id)),
            VendorTransaction.transaction_type == "PURCHASE"
        ).scalar() or 0.0

        total_payment = db.query(func.sum(VendorTransaction.amount)).filter(
            VendorTransaction.id.in_(query.with_entities(VendorTransaction.id)),
            VendorTransaction.transaction_type == "PAYMENT"
        ).scalar() or 0.0

        return {
            "total_purchase": float(total_purchase),
            "total_payment": float(total_payment),
            "net_liability": float(total_purchase - total_payment)
        }

vendor = CRUDVendor(Vendor)
vendor_transaction = CRUDVendorTransaction(VendorTransaction)

    