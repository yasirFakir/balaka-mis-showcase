from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.config import settings

def test_file_upload_security(client: TestClient, db: Session, user_token_headers: dict):
    print("\n\033[93m\033[1m🚀 SECURITY AUDIT: File Upload Endpoint\033[0m")
    
    files = {'file': ('test_doc.txt', b'secure content')}

    # 1. Unauthenticated Attempt
    print("  \033[94mINFO: Attempting upload WITHOUT token...\033[0m")
    r = client.post("/api/v1/files/upload", files=files)
    if r.status_code == 401:
        print(f"    \033[92m\033[1mSUCCESS: Blocked (Status {r.status_code})\033[0m")
    else:
        print(f"    \033[91m\033[1mFAILURE: Allowed (Status {r.status_code})\033[0m")
        assert False, "Unauthenticated upload should be blocked"

    # 2. Authenticated Attempt
    print("  \033[94mINFO: Attempting upload WITH token...\033[0m")
    # Reset file pointer for re-use or recreate
    files = {'file': ('test_doc.txt', b'secure content')}
    r = client.post("/api/v1/files/upload", files=files, headers=user_token_headers)
    
    if r.status_code == 200:
        print(f"    \033[92m\033[1mSUCCESS: Upload Accepted (Status {r.status_code})\033[0m")
    else:
        print(f"    \033[91m\033[1mFAILURE: Upload Failed (Status {r.status_code}: {r.text})\033[0m")
        assert False, "Authenticated upload should succeed"
    
    print("\n\033[92m\033[1m✅ UPLOAD SECURITY VERIFIED\033[0m\n")
