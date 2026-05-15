from typing import List, Optional, Tuple, Union
from datetime import datetime
from sqlalchemy import or_, cast, String, func
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.service_request import ServiceRequest
from app.models.user import User
from app.schemas.service_request import ServiceRequestCreate, ServiceRequestUpdate

class CRUDServiceRequest(CRUDBase[ServiceRequest, ServiceRequestCreate, ServiceRequestUpdate]):
    def get_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[ServiceRequest]:
        return (
            db.query(ServiceRequest)
            .filter(ServiceRequest.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create_with_user(
        self, 
        db: Session, 
        *, 
        obj_in: ServiceRequestCreate, 
        user_id: int,
        selling_price: float = 0.0,
        cost_price: float = 0.0,
        vendor_id: Optional[int] = None,
        variant_id: Optional[int] = None,
        quantity: int = 1,
        created_by_id: Optional[int] = None,
        currency: str = "SAR",
        exchange_rate: float = 1.0
    ) -> ServiceRequest:
        from app.models.service import ServiceDefinition
        
        # Convert breakdown items to dicts for JSON storage
        breakdown = []
        if obj_in.financial_breakdown:
            breakdown = [item.model_dump() if hasattr(item, 'model_dump') else item for item in obj_in.financial_breakdown]

        db_obj = ServiceRequest(
            service_def_id=obj_in.service_def_id,
            form_data=obj_in.form_data,
            user_id=user_id,
            status="Pending",
            selling_price=selling_price,
            cost_price=cost_price,
            profit=round(selling_price - cost_price, 2),
            financial_breakdown=breakdown,
            vendor_id=vendor_id,
            variant_id=variant_id,
            quantity=quantity,
            created_by_id=created_by_id or user_id,
            currency=currency,
            exchange_rate=exchange_rate
        )
        db.add(db_obj)
        db.flush() # Get ID for prefixing
        
        # Generate Readable ID
        svc_def = db.query(ServiceDefinition).filter(ServiceDefinition.id == obj_in.service_def_id).first()
        prefix = "REQ"
        if svc_def:
            if not svc_def.is_public:
                prefix = "OPS" # Internal/Private
            else:
                mapping = {
                    "Ticket Service": "TKT",
                    "Cargo Service": "CRG",
                    "Hajj & Umrah": "HAJ",
                    "General Service": "GEN"
                }
                prefix = mapping.get(svc_def.category, "REQ")
        
        db_obj.readable_id = f"{prefix}-{db_obj.id:04d}"
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, user: Optional[User] = None, filter_user_id: Optional[int] = None
    ) -> List[ServiceRequest]:
        from sqlalchemy.orm import joinedload
        query = db.query(ServiceRequest).options(
            joinedload(ServiceRequest.service_definition),
            joinedload(ServiceRequest.user),
            joinedload(ServiceRequest.created_by),
            joinedload(ServiceRequest.updated_by)
        )
        
        # 1. Filter by specific client (if requested by Admin)
        if filter_user_id:
            query = query.filter(ServiceRequest.user_id == filter_user_id)

        # 2. Scope Logic (ABAC)
        is_privileged = user.is_superuser or any(r.name == "Admin" for r in user.roles)
        if user and not is_privileged:
            # Check for role-based blanket access (e.g. Admin role)
            # If we rely purely on PBAC, 'requests.view' allows entering this function.
            # But here we filter DATA.
            # Logic: If user has 'allowed_services' assigned, restrict to those.
            if user.allowed_services:
                allowed_ids = [s.id for s in user.allowed_services]
                query = query.filter(ServiceRequest.service_def_id.in_(allowed_ids))
        
        return query.order_by(ServiceRequest.created_at.desc()).offset(skip).limit(limit).all()

    def get_multi_with_count(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        user: Optional[User] = None, 
        filter_user_id: Optional[int] = None,
        search_query: Optional[str] = None,
        status_filter: Optional[Union[str, List[str]]] = None,
        category_filter: Optional[str] = None,
        has_financials: bool = False,
        vendor_id: Optional[int] = None,
        service_def_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        is_public_filter: Optional[bool] = None
    ) -> Tuple[List[ServiceRequest], int]:
        from app.models.service import ServiceDefinition
        
        # Use outerjoin to prevent dropping records with missing relations
        query = db.query(ServiceRequest).outerjoin(ServiceRequest.user).outerjoin(ServiceRequest.service_definition)
        
        # Ensure join if definition filtering is needed
        if search_query or category_filter or is_public_filter is not None:
            query = query.join(ServiceRequest.service_definition)

        if has_financials:
            query = query.filter(or_(ServiceRequest.selling_price > 0, ServiceRequest.cost_price > 0))
        
        if vendor_id:
            query = query.filter(ServiceRequest.vendor_id == vendor_id)
            
        if service_def_id:
            query = query.filter(ServiceRequest.service_def_id == service_def_id)
            
        if start_date:
            query = query.filter(ServiceRequest.created_at >= start_date)
        if end_date:
            # Ensure end of day is included if only date is provided
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                from datetime import timedelta
                query = query.filter(ServiceRequest.created_at < end_date + timedelta(days=1))
            else:
                query = query.filter(ServiceRequest.created_at <= end_date)

        if is_public_filter is not None:
            query = query.filter(ServiceDefinition.is_public == is_public_filter)

        # Joins for search filtering
        if search_query:
            query = query.join(ServiceRequest.user)
        
        if filter_user_id:
            query = query.filter(ServiceRequest.user_id == filter_user_id)

        is_privileged = user.is_superuser or any(r.name == "Admin" for r in user.roles)
        if user and not is_privileged:
            if user.allowed_services:
                allowed_ids = [s.id for s in user.allowed_services]
                query = query.filter(ServiceRequest.service_def_id.in_(allowed_ids))
        
        if status_filter:
            if isinstance(status_filter, list):
                query = query.filter(ServiceRequest.status.in_(status_filter))
            else:
                query = query.filter(ServiceRequest.status == status_filter)

        if category_filter:
            term = f"%{category_filter}%"
            query = query.filter(
                or_(
                    ServiceDefinition.name.ilike(term),
                    ServiceDefinition.category.ilike(term)
                )
            )

        if search_query:
            # Tokenized Search Logic: Split by whitespace and ensure ALL tokens match SOME column (Intersection of Unions)
            tokens = search_query.split()
            for token in tokens:
                search_term = f"%{token}%"
                
                # Conditions for THIS specific token
                token_conditions = [
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                    ServiceDefinition.name.ilike(search_term),
                    ServiceDefinition.category.ilike(search_term)
                ]
                
                # Smart ID Parsing: REQ-0001 or #1 or 1
                clean_token = token.replace("REQ-", "").replace("#", "").lstrip("0")
                if clean_token.isdigit():
                    token_conditions.append(ServiceRequest.id == int(clean_token))
                
                # Apply token group with AND (Narrow down)
                query = query.filter(or_(*token_conditions))
        
        total = query.count()
        items = query.options(
            joinedload(ServiceRequest.service_definition),
            joinedload(ServiceRequest.user),
            joinedload(ServiceRequest.created_by),
            joinedload(ServiceRequest.updated_by),
            joinedload(ServiceRequest.transactions)
        ).order_by(ServiceRequest.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_filtered_summary(
        self,
        db: Session,
        *,
        user: Optional[User] = None,
        filter_user_id: Optional[int] = None,
        search_query: Optional[str] = None,
        status_filter: Optional[Union[str, List[str]]] = None,
        category_filter: Optional[str] = None,
        has_financials: bool = False,
        vendor_id: Optional[int] = None,
        service_def_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        is_public_filter: Optional[bool] = None
    ) -> dict:
        from app.models.service import ServiceDefinition
        
        query = db.query(ServiceRequest).outerjoin(ServiceRequest.user).outerjoin(ServiceRequest.service_definition)
        
        # Apply same filters
        if is_public_filter is not None:
            query = query.filter(ServiceDefinition.is_public == is_public_filter)
        if has_financials:
            query = query.filter(or_(ServiceRequest.selling_price > 0, ServiceRequest.cost_price > 0))
        if vendor_id:
            query = query.filter(ServiceRequest.vendor_id == vendor_id)
        if service_def_id:
            query = query.filter(ServiceRequest.service_def_id == service_def_id)
        if start_date:
            query = query.filter(ServiceRequest.created_at >= start_date)
        if end_date:
            # Ensure end of day is included if only date is provided
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                from datetime import timedelta
                query = query.filter(ServiceRequest.created_at < end_date + timedelta(days=1))
            else:
                query = query.filter(ServiceRequest.created_at <= end_date)
        if filter_user_id:
            query = query.filter(ServiceRequest.user_id == filter_user_id)
        is_privileged = user.is_superuser or any(r.name == "Admin" for r in user.roles)
        if user and not is_privileged:
            if user.allowed_services:
                allowed_ids = [s.id for s in user.allowed_services]
                query = query.filter(ServiceRequest.service_def_id.in_(allowed_ids))
        if status_filter:
            if isinstance(status_filter, list):
                query = query.filter(ServiceRequest.status.in_(status_filter))
            else:
                query = query.filter(ServiceRequest.status == status_filter)
        if category_filter:
            term = f"%{category_filter}%"
            query = query.filter(or_(ServiceDefinition.name.ilike(term), ServiceDefinition.category.ilike(term)))
        if search_query:
            search_term = f"%{search_query}%"
            conditions = [User.full_name.ilike(search_term), User.email.ilike(search_term), ServiceDefinition.name.ilike(search_term)]
            try:
                numeric_id = int(search_query.replace("#", ""))
                conditions.append(ServiceRequest.id == numeric_id)
            except ValueError: pass
            query = query.filter(or_(*conditions))

        total_profit = db.query(func.sum(ServiceRequest.profit)).filter(
            ServiceRequest.id.in_(query.with_entities(ServiceRequest.id))
        ).scalar() or 0.0

        return {
            "total_profit": float(total_profit)
        }

    def get_status_counts(
        self, 
        db: Session, 
        user: Optional[User] = None,
        category_filter: Optional[str] = None,
        is_public_filter: Optional[bool] = None
    ) -> dict:
        from app.models.service import ServiceDefinition
        query = db.query(ServiceRequest.status, func.count(ServiceRequest.id)).outerjoin(ServiceRequest.service_definition)
        
        if category_filter:
            query = query.filter(ServiceDefinition.category == category_filter)
        if is_public_filter is not None:
            query = query.filter(ServiceDefinition.is_public == is_public_filter)

        is_privileged = user.is_superuser or any(r.name == "Admin" for r in user.roles)
        if user and not is_privileged:
            if user.allowed_services:
                allowed_ids = [s.id for s in user.allowed_services]
                query = query.filter(ServiceRequest.service_def_id.in_(allowed_ids))
                
        result = query.group_by(ServiceRequest.status).all()
        return dict(result)

service_request = CRUDServiceRequest(ServiceRequest)