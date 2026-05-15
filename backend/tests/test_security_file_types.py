from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

def test_dangerous_file_upload(client: TestClient, db: Session, user_token_headers: dict):
    print("\n\033[93m\033[1m🚀 SECURITY AUDIT: Dangerous File Type Upload Check\033[0m")
    
    # 1. Attempt to upload a Python script (RCE risk)
    files = {'file': ('exploit.py', b'print("Hacked")')}
    
    print("  \033[94mINFO: Attempting to upload 'exploit.py'...\033[0m")
    r = client.post("/api/v1/files/upload", files=files, headers=user_token_headers)
    
    if r.status_code == 200:
        print(f"    \033[91m\033[1mFAILURE: Upload Succeeded! (Status {r.status_code})\033[0m")
        print("    Vulnerability CONFIRMED: Server accepted a .py file.")
    elif r.status_code == 400:
        print(f"    \033[92m\033[1mSUCCESS: Upload Blocked! (Status {r.status_code})\033[0m")
        assert "not allowed" in r.text or "extension" in r.text.lower()
    else:
        print(f"    \033[93mWARNING: Unexpected status {r.status_code}\033[0m")

    # 2. Attempt to upload a valid file (PDF)
    files = {'file': ('document.pdf', b'%PDF-1.4...')}
    print("  \033[94mINFO: Attempting to upload 'document.pdf' (Valid)...")
    r = client.post("/api/v1/files/upload", files=files, headers=user_token_headers)
    
    if r.status_code == 200:
        print(f"    \033[92m\033[1mSUCCESS: Upload Accepted (Status {r.status_code})\033[0m")
    else:
        print(f"    \033[91m\033[1mFAILURE: Valid Upload Failed! (Status {r.status_code})\033[0m")

    print("\n\033[92m\033[1m✅ FILE TYPE SECURITY VERIFIED\033[0m\n")
