from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import schemas
from app.main import app

def test_create_service_request_rate_limit(client: TestClient, user_token_headers: dict, db: Session):
    print("\n\033[93m\033[1m🚀 SECURITY AUDIT: Rate Limiting on Service Request Endpoint\033[0m")
    
    # Enable Limiter for this specific test (it is disabled by default in conftest.py)
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = True
    
    # 1. Get a service to apply for
    from app.crud.service import service as service_def_crud
    services = service_def_crud.get_multi(db)
    if not services:
        print("  \033[91mFAILURE: No services found to test\033[0m")
        return
    
    service_id = services[0].id
    req_data = {
        "service_def_id": service_id,
        "quantity": 1,
        "form_data": {"full_name": "Test User"} # Minimal data
    }
    
    # Use a fixed IP for testing to ensure slowapi sees them as same client
    headers = {**user_token_headers, "X-Forwarded-For": "1.2.3.4"}
    
    # 2. Send 5 requests (allowed)
    print("  \033[94mINFO: Sending 5 allowed requests...\033[0m")
    for i in range(5):
        # We might get 422 because form_data is incomplete, but NOT 429 yet
        response = client.post("/api/v1/service-requests/", json=req_data, headers=headers)
        print(f"    Request {i+1}: Status {response.status_code}")
        assert response.status_code != 429
        
    # 3. 6th attempt should fail with 429
    print("  \033[94mINFO: Sending 6th request (Expect Block)...")
    response = client.post("/api/v1/service-requests/", json=req_data, headers=headers)
    
    # Cleanup: Disable limiter back for other tests
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False

    if response.status_code == 429:
        print(f"    \033[92m\033[1mSUCCESS: Request Blocked! (Status {response.status_code})\033[0m")
    else:
        print(f"    \033[91m\033[1mFAILURE: Request NOT Blocked! (Status {response.status_code})\033[0m")
        assert False, f"Rate limit failed! Expected 429, got {response.status_code}"
    
    print("\n\033[92m\033[1m✅ SERVICE REQUEST RATE LIMITING VERIFIED\033[0m\n")
