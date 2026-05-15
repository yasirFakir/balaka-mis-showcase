import pytest
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud.service import service as service_crud
from app.crud.service_request import service_request as service_request_crud
from app.crud.vendor import vendor as vendor_crud

def test_financial_schema_to_request_sync(db: Session):
    # 0. Create Users
    from app.models.user import User
    from app.core.security import get_password_hash
    
    admin_user = db.query(User).filter(User.email == "admin_sync@test.com").first()
    if not admin_user:
        admin_user = User(
            email="admin_sync@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Sync Admin",
            is_active=True,
            is_superuser=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    client_user = db.query(User).filter(User.email == "client_sync@test.com").first()
    if not client_user:
        client_user = User(
            email="client_sync@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Sync Client",
            is_active=True
        )
        db.add(client_user)
        db.commit()
        db.refresh(client_user)

    # 1. Create Vendors (Internal and External)
    v_internal = vendor_crud.create_with_owner(db, obj_in=schemas.VendorCreate(
        name="Internal Account",
        type="INTERNAL"
    ))
    v_external = vendor_crud.create_with_owner(db, obj_in=schemas.VendorCreate(
        name="External Supplier",
        type="EXTERNAL"
    ))

    # 2. Create Service Definition with Financial Schema
    financial_schema = [
        {
            "label": "Base Price",
            "type": "INCOME",
            "source": "CLIENT",
            "amount": 1000
        },
        {
            "label": "Internal Cost",
            "type": "EXPENSE",
            "source": "INTERNAL",
            "source_id": v_internal.id,
            "vendor_id": v_internal.id,
            "amount": 200
        },
        {
            "label": "External Cost",
            "type": "EXPENSE",
            "source": "EXTERNAL",
            "source_id": v_external.id,
            "vendor_id": v_external.id,
            "amount": 500
        }
    ]

    service_in = schemas.ServiceDefinitionCreate(
        name="Test Sync Service",
        slug="test-sync-service",
        base_price=1000,
        financial_schema=financial_schema
    )
    service = service_crud.create(db, obj_in=service_in)

    # 3. Create Service Request
    request_in = schemas.ServiceRequestCreate(
        service_def_id=service.id,
        form_data={"note": "testing sync"}
    )
    request = service_request_crud.create_with_user(
        db, 
        obj_in=request_in, 
        user_id=client_user.id,
        selling_price=1000
    )

    # 4. Verify that the request's service definition has the schema
    assert request.service_definition.financial_schema is not None
    schema = request.service_definition.financial_schema
    assert len(schema) == 3
    
    # Check Internal Cost Item
    internal_item = next(item for item in schema if item["label"] == "Internal Cost")
    assert internal_item["source"] == "INTERNAL"
    assert int(internal_item["source_id"]) == v_internal.id
    assert int(internal_item["vendor_id"]) == v_internal.id

    # Check External Cost Item
    external_item = next(item for item in schema if item["label"] == "External Cost")
    assert external_item["source"] == "EXTERNAL"
    assert int(external_item["source_id"]) == v_external.id
    assert int(external_item["vendor_id"]) == v_external.id

    print("\n[BACKEND TEST PASSED]: Service Definition Financial Schema persists correct source and IDs.")

if __name__ == "__main__":
    # This is for manual triggering if needed
    pass
