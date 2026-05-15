from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models
import datetime

# ANSI Color Codes
GREEN = "\033[92m"
BLUE = "\033[94m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
ENDC = "\033[0m"

def log_step(msg: str):
    print(f"\n{BLUE}{BOLD}STEP: {msg}{ENDC}")

def log_success(msg: str):
    print(f"{GREEN}{BOLD}  SUCCESS: {msg}{ENDC}")

def log_info(msg: str):
    print(f"{CYAN}  INFO: {msg}{ENDC}")

def log_warn(msg: str):
    print(f"{YELLOW}{BOLD}  WARNING: {msg}{ENDC}")

def log_fail(msg: str):
    print(f"{RED}{BOLD}  FAILURE: {msg}{ENDC}")

def get_valid_form_data(svc_slug: str):
    """Returns valid form data based on seed_services schema."""
    import time
    base = {
        "full_name": f"Test User {int(time.time() * 1000)}",
        "contact_number": "+8801711223344",
        "location": "Riyadh, Saudi Arabia"
    }
    
    if "cargo" in svc_slug:
        base.update({
            "receiver_name": "Receiver Name",
            "receiver_phone": "+8801911223344",
            "district": "Dhaka"
        })
    elif "ticket" in svc_slug:
        base.update({
            "pnr_number": "PNR123456",
            "passport_number": "A00112233",
            "departure_city": "Jeddah",
            "arrival_city": "Dhaka",
            "travel_date": "2026-05-20",
            "adult_count": 1,
            "passport_copy": "/api/v1/files/secure/passport.jpg"
        })
    elif "umrah" in svc_slug:
        base.update({
            "passport_number": "A00112233",
            "person_count": 1,
            "passport_scan": "/api/v1/files/secure/passport.jpg",
            "photo": "/api/v1/files/secure/photo.jpg"
        })
    elif "driving" in svc_slug:
        base.update({
            "iqama_number": "2345678901",
            "iqama_barcode": "/api/v1/files/secure/iqama.jpg",
            "passport_copy": "/api/v1/files/secure/passport.jpg",
            "photo": "/api/v1/files/secure/photo.jpg",
            "blood_group": "O+"
        })
    elif "family-visa" in svc_slug:
        base.update({
            "visa_number": "1234567890",
            "iqama_copy": "/api/v1/files/secure/iqama.jpg",
            "police_clearance": "/api/v1/files/secure/clearance.jpg"
        })
    elif "passport-malumat" in svc_slug:
        base.update({
            "new_passport_number": "B99887766"
        })
    elif "jawazat" in svc_slug:
        base.update({
            "iqama_number": "2345678901",
            "iqama_copy": "/api/v1/files/secure/iqama.jpg"
        })
    elif "intl-license" in svc_slug:
        base.update({
            "passport_no": "A00112233",
            "iqama": "/api/v1/files/secure/iqama.jpg",
            "passport": "/api/v1/files/secure/passport.jpg",
            "photo": "/api/v1/files/secure/photo.jpg"
        })
    
    return base

def cancel_active_requests(client: TestClient, token: dict):
    """Helper to clean up active requests for the test user."""
    r = client.get("/api/v1/service-requests/me", headers=token)
    if r.status_code == 200:
        data = r.json()
        requests = data.get("items", []) if isinstance(data, dict) else data
        for req in requests:
            if req["status"] not in ["Completed", "Cancelled", "Rejected"]:
                client.put(f"/api/v1/service-requests/{req['id']}/cancel", headers=token)
