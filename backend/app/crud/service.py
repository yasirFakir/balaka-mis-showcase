from typing import Any, Dict, Optional, Union, List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.service import ServiceDefinition, ServiceVariant
from app.schemas.service import ServiceDefinitionCreate, ServiceDefinitionUpdate

class CRUDService(CRUDBase[ServiceDefinition, ServiceDefinitionCreate, ServiceDefinitionUpdate]):
    def get_by_slug(self, db: Session, *, slug: str) -> Optional[ServiceDefinition]:
        return db.query(ServiceDefinition).filter(ServiceDefinition.slug == slug).first()

    def create(self, db: Session, *, obj_in: ServiceDefinitionCreate, created_by_id: Optional[int] = None) -> ServiceDefinition:
        from app.models.vendor import Vendor
        
        # Separate related data
        obj_in_data = obj_in.model_dump()
        variants_data = obj_in_data.pop("variants", [])
        vendor_ids = obj_in_data.pop("vendor_ids", [])
        
        db_obj = ServiceDefinition(**obj_in_data, created_by_id=created_by_id)
        
        # Add vendors
        if vendor_ids:
            vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
            db_obj.vendors = vendors
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Create variants
        for variant_in in variants_data:
            # Check if variant_in is a dict or model
            if hasattr(variant_in, 'model_dump'):
                var_data = variant_in.model_dump()
            else:
                var_data = variant_in
            
            # Remove id if present in create
            if "id" in var_data:
                del var_data["id"]
                
            variant = ServiceVariant(**var_data, service_def_id=db_obj.id)
            db.add(variant)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ServiceDefinition,
        obj_in: Union[ServiceDefinitionUpdate, Dict[str, Any]],
        updated_by_id: Optional[int] = None
    ) -> ServiceDefinition:
        obj_data = obj_in.model_dump(exclude_unset=True) if isinstance(obj_in, ServiceDefinitionUpdate) else obj_in
        variants_data = obj_data.pop("variants", None)
        staff_ids = obj_data.pop("assigned_staff_ids", None)
        vendor_ids = obj_data.pop("vendor_ids", None)
        
        # Update standard fields
        for field in obj_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_data[field])
        
        if updated_by_id and hasattr(db_obj, "updated_by_id"):
            db_obj.updated_by_id = updated_by_id

        # Update Assigned Staff if provided
        if staff_ids is not None:
            from app.models.user import User
            staff = db.query(User).filter(User.id.in_(staff_ids)).all()
            db_obj.assigned_staff = staff
            
        # Update Assigned Vendors if provided
        if vendor_ids is not None:
            from app.models.vendor import Vendor
            vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
            db_obj.vendors = vendors

        db.add(db_obj)
        
        # Update variants if provided (Smart Update)
        if variants_data is not None:
            # 1. Map existing variants
            existing_variants = {v.id: v for v in db_obj.variants}
            processed_ids = []
            
            for variant_in in variants_data:
                if hasattr(variant_in, 'model_dump'):
                    var_data = variant_in.model_dump()
                else:
                    var_data = variant_in
                
                v_id = var_data.get("id")
                
                if v_id and v_id in existing_variants:
                    # Update Existing
                    existing_var = existing_variants[v_id]
                    for key, value in var_data.items():
                        if hasattr(existing_var, key) and key != "id":
                            setattr(existing_var, key, value)
                    
                    # Ensure it's re-activated if it was archived
                    existing_var.is_active = True
                    db.add(existing_var)
                    processed_ids.append(v_id)
                else:
                    # Create New
                    if "id" in var_data:
                        del var_data["id"]
                    
                    variant = ServiceVariant(**var_data, service_def_id=db_obj.id)
                    db.add(variant)
            
            # 3. Archive removed variants
            for v_id, existing_var in existing_variants.items():
                if v_id not in processed_ids:
                    # Soft delete (Archive) instead of hard delete to preserve history
                    existing_var.is_active = False
                    db.add(existing_var)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

service = CRUDService(ServiceDefinition)