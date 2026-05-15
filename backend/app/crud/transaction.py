from typing import List, Optional, Tuple, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String, func
from datetime import datetime, timezone
from app.crud.base import CRUDBase
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate
from app.core import security

from app.models.service_request import ServiceRequest

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionCreate]): # Update schema same as create for now
    def create_with_user(
        self, db: Session, *, obj_in: TransactionCreate, user_id: int, service: ServiceRequest
    ) -> Transaction:
        now = datetime.now(timezone.utc)
        
        # 0. Deduplication Check: Prevent identical transactions within 10 seconds
        from datetime import timedelta
        ten_seconds_ago = now - timedelta(seconds=10)
        
        # We check RAW amount and currency to catch exact duplicates before conversion logic
        duplicate = db.query(Transaction).filter(
            Transaction.service_request_id == obj_in.service_request_id,
            Transaction.claimed_amount == obj_in.amount,
            Transaction.claimed_currency == obj_in.claimed_currency,
            Transaction.payment_method == obj_in.payment_method,
            Transaction.client_reference_id == obj_in.client_reference_id,
            Transaction.created_at >= ten_seconds_ago
        ).first()
        
        if duplicate:
            return duplicate

        # Temp ID for constraint satisfaction during flush
        temp_txn_id = security.generate_transaction_id("TXN")

        # 1. Store the RAW data
        raw_amount = obj_in.amount
        currency = obj_in.claimed_currency
        rate = obj_in.exchange_rate

        # 2. Convert to Base Currency (SAR)
        # If input is BDT, divide by rate. If SAR, rate should be 1.0
        if currency == "BDT":
            sar_amount = raw_amount / rate
        else:
            sar_amount = raw_amount
            rate = 1.0 # Force 1.0 for SAR to SAR

        # Logic Update: Use provided amount if available, otherwise fallback to service base price
        if sar_amount > 0:
            base_price = sar_amount # The base for this transaction is the converted amount
            final_amount = base_price - obj_in.discount
        else:
            # Fallback for legacy calls
            base_price = service.service_definition.base_price
            final_amount = base_price - obj_in.discount

        if final_amount < 0:
            final_amount = 0

        db_obj = Transaction(
            transaction_id=temp_txn_id,
            service_request_id=obj_in.service_request_id,
            user_id=service.user_id,
            base_price=base_price,
            discount=obj_in.discount,
            amount=final_amount,
            claimed_amount=raw_amount,
            claimed_currency=currency,
            exchange_rate=rate,
            payment_method=obj_in.payment_method,
            notes=obj_in.notes,
            client_reference_id=obj_in.client_reference_id,
            coupon_code=obj_in.coupon_code,
            created_by_id=user_id,
            status="Pending",
            created_at=now
        )
        db.add(db_obj)
        db.flush() # Populate ID

        # Generate Final Serial-Based ID
        db_obj.transaction_id = security.generate_transaction_id("TXN", db_obj.id)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_request(self, db: Session, *, service_request_id: int) -> List[Transaction]:
        return db.query(Transaction).filter(Transaction.service_request_id == service_request_id).all()

    def get_multi_with_count(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        search_query: Optional[str] = None,
        status_filter: Optional[Union[str, List[str]]] = None,
        min_amount: Optional[float] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        service_def_id: Optional[int] = None,
        category_filter: Optional[str] = None,
        is_public_filter: Optional[bool] = None,
        payment_method: Optional[str] = None
    ) -> Tuple[List[Transaction], int]:
        from app.models.service import ServiceDefinition
        
        # Use outerjoin to ensure we don't drop transactions with missing relations
        query = db.query(Transaction).outerjoin(Transaction.user).outerjoin(Transaction.service_request)
        
        # Join ServiceDefinition if needed for category or is_public filtering
        if category_filter or is_public_filter is not None:
            query = query.join(ServiceRequest.service_definition)

        # Financial filtering
        if min_amount is not None:
            query = query.filter(Transaction.amount >= min_amount)
            
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
            
        if start_date:
            query = query.filter(Transaction.created_at >= start_date)
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                from datetime import timedelta
                query = query.filter(Transaction.created_at < end_date + timedelta(days=1))
            else:
                query = query.filter(Transaction.created_at <= end_date)

        if service_def_id:
            query = query.filter(ServiceRequest.service_def_id == service_def_id)
        
        if category_filter:
            query = query.filter(ServiceDefinition.category == category_filter)
            
        if is_public_filter is not None:
            query = query.filter(ServiceDefinition.is_public == is_public_filter)
            
        if payment_method:
            query = query.filter(Transaction.payment_method == payment_method)

        # Tokenized Search Logic (Intersection of Unions)
        if search_query:
            tokens = search_query.split()
            for token in tokens:
                search_term = f"%{token}%"
                
                # Note: client_reference_id and internal_reference_id are ENCRYPTED.
                # We cannot search them with ILIKE.
                token_conditions = [
                    Transaction.transaction_id.ilike(search_term),
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                    Transaction.claimed_currency.ilike(search_term),
                    Transaction.payment_method.ilike(search_term)
                ]

                # Smart Technical Key Parsing
                # 1. Transaction ID match (TXN-...)
                clean_txn = token.replace("TXN-", "").replace("#", "")
                if clean_txn.isalnum():
                    token_conditions.append(Transaction.transaction_id.ilike(f"%{clean_txn}%"))

                # 2. Request ID match (REQ-...)
                clean_req = token.replace("REQ-", "").replace("#", "").lstrip("0")
                if clean_req.isdigit():
                    token_conditions.append(Transaction.service_request_id == int(clean_req))
                
                # 3. Numeric Amount Match
                try:
                    import re
                    clean_num = re.sub(r'[^\d.]', '', token)
                    if clean_num:
                        val = float(clean_num)
                        token_conditions.append(Transaction.amount == val)
                        token_conditions.append(Transaction.claimed_amount == val)
                except ValueError: pass

                # Apply token group with AND
                query = query.filter(or_(*token_conditions))

        total = query.count()
        
        items = query.options(
            joinedload(Transaction.user),
            joinedload(Transaction.created_by),
            joinedload(Transaction.updated_by),
            joinedload(Transaction.verified_by),
            joinedload(Transaction.service_request).joinedload(ServiceRequest.service_definition),
            joinedload(Transaction.service_request).joinedload(ServiceRequest.user)
        ).order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
        
        return items, total

    def get_filtered_summary(
        self,
        db: Session,
        *,
        search_query: Optional[str] = None,
        status_filter: Optional[Union[str, List[str]]] = None,
        min_amount: Optional[float] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        service_def_id: Optional[int] = None,
        category_filter: Optional[str] = None,
        is_public_filter: Optional[bool] = None,
        payment_method: Optional[str] = None
    ) -> dict:
        from app.models.service import ServiceDefinition
        query = db.query(Transaction).outerjoin(Transaction.user).outerjoin(Transaction.service_request)
        
        # Apply filters
        if category_filter or is_public_filter is not None:
            query = query.join(ServiceRequest.service_definition)
            
        if category_filter:
            query = query.filter(ServiceDefinition.category == category_filter)
        if is_public_filter is not None:
            query = query.filter(ServiceDefinition.is_public == is_public_filter)

        if min_amount is not None:
            query = query.filter(Transaction.amount >= min_amount)
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        if start_date:
            query = query.filter(Transaction.created_at >= start_date)
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                from datetime import timedelta
                query = query.filter(Transaction.created_at < end_date + timedelta(days=1))
            else:
                query = query.filter(Transaction.created_at <= end_date)
        if service_def_id:
            query = query.filter(ServiceRequest.service_def_id == service_def_id)
        if payment_method:
            query = query.filter(Transaction.payment_method == payment_method)
        if search_query:
            search_term = f"%{search_query}%"
            conditions = [
                Transaction.transaction_id.ilike(search_term),
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
                cast(Transaction.service_request_id, String).ilike(search_term),
                Transaction.claimed_currency.ilike(search_term)
            ]
            try:
                import re
                clean_q = re.sub(r'[^\d.]', '', search_query)
                if clean_q:
                    numeric_val = float(clean_q)
                    conditions.append(Transaction.amount == numeric_val)
                    conditions.append(Transaction.claimed_amount == numeric_val)
            except ValueError: pass
            
            # Partial amount string matches
            conditions.append(cast(Transaction.amount, String).ilike(search_term))
            conditions.append(cast(Transaction.claimed_amount, String).ilike(search_term))
            
            query = query.filter(or_(*conditions))
        if status_filter:
            if isinstance(status_filter, list):
                query = query.filter(Transaction.status.in_(status_filter))
            else:
                query = query.filter(Transaction.status == status_filter)

        # Calculate totals
        verified_total = db.query(func.sum(Transaction.amount)).filter(
            Transaction.id.in_(query.with_entities(Transaction.id)),
            Transaction.status == "Verified",
            Transaction.amount > 0
        ).scalar() or 0.0

        pending_total = db.query(func.sum(Transaction.amount)).filter(
            Transaction.id.in_(query.with_entities(Transaction.id)),
            Transaction.status == "Pending",
            Transaction.amount > 0
        ).scalar() or 0.0

        refund_total = db.query(func.sum(Transaction.amount)).filter(
            Transaction.id.in_(query.with_entities(Transaction.id)),
            Transaction.status == "Verified",
            Transaction.amount < 0
        ).scalar() or 0.0

        return {
            "verified_total": float(verified_total),
            "pending_total": float(pending_total),
            "refund_total": abs(float(refund_total))
        }

    def get_status_counts(
        self, 
        db: Session,
        category_filter: Optional[str] = None,
        is_public_filter: Optional[bool] = None
    ) -> dict:
        from app.models.service import ServiceDefinition
        query = db.query(Transaction.status, func.count(Transaction.id)).outerjoin(Transaction.service_request)
        
        if category_filter or is_public_filter is not None:
            query = query.join(ServiceRequest.service_definition)
            
        if category_filter:
            query = query.filter(ServiceDefinition.category == category_filter)
        if is_public_filter is not None:
            query = query.filter(ServiceDefinition.is_public == is_public_filter)
            
        result = query.group_by(Transaction.status).all()
        return dict(result)

transaction = CRUDTransaction(Transaction)
