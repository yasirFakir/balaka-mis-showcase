from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import time

def test_login_rate_limit(client: TestClient, db: Session):
    print("\n\033[93m\033[1m🚀 SECURITY AUDIT: Rate Limiting on Login Endpoint\033[0m")
    
    # Enable Limiter for this test
    from app.main import app
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = True

    # Credentials (valid or invalid doesn't matter for rate limiting, but we use invalid to be safe)
    login_data = {"username": "hacker@evil.com", "password": "wrongpassword"}
    
    # Use a fixed IP for testing
    headers = {"X-Forwarded-For": "1.2.3.4"}

    # 1. First 5 attempts should pass (result in 400 Bad Request due to wrong auth, NOT 429)
    print("  \033[94mINFO: Sending 5 allowed requests...\033[0m")
    for i in range(5):
        r = client.post("/api/v1/login/access-token", data=login_data, headers=headers)
        # We expect 400 because auth fails, but request reaches the endpoint
        assert r.status_code == 400 
        print(f"    Request {i+1}: Allowed (Status {r.status_code})")
        
    # 2. 6th attempt should fail with 429 Too Many Requests
    print("  \033[94mINFO: Sending 6th request (Expect Block)...")
    r = client.post("/api/v1/login/access-token", data=login_data, headers=headers)
    
    # Cleanup: Disable limiter back
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False

    if r.status_code == 429:
        print(f"    \033[92m\033[1mSUCCESS: Request Blocked! (Status {r.status_code})\033[0m")
        assert "Too Many Requests" in r.text or "Rate limit exceeded" in r.text
    else:
        print(f"    \033[91m\033[1mFAILURE: Request NOT Blocked! (Status {r.status_code})\033[0m")
        assert False, f"Rate limit failed! Expected 429, got {r.status_code}"
    
    print("\n\033[92m\033[1m✅ RATE LIMITING VERIFIED\033[0m\n")
