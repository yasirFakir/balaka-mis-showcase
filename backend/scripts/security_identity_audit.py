import requests
import time
import json
import sys

# Config
API_URL = "http://localhost:8008/api/v1"
TIMEOUT = 5

# Colors
class Colors:
    HEADER = '\033[95m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'

def log(status, message):
    c = Colors.OKGREEN if status == "PASS" else Colors.FAIL if status == "FAIL" else Colors.WARNING
    print(f"{c}[{status}] {message}{Colors.ENDC}")

def get_token(email, password):
    try:
        resp = requests.post(f"{API_URL}/login/access-token", data={"username": email, "password": password}, timeout=TIMEOUT)
        if resp.status_code == 200:
            return resp.json().get("access_token")
        print(f"Login failed for {email}: {resp.status_code} - {resp.text}")
        return None
    except Exception as e:
        print(f"Login exception: {e}")
        return None

def register_user(email, password, full_name):
    data = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "phone_number": f"+880 1{int(time.time())}"[:14] # Unique phone
    }
    resp = requests.post(f"{API_URL}/register", json=data, timeout=TIMEOUT)
    return resp

def run_audit():
    print(f"{Colors.HEADER}=== Balaka MIS Identity & Access Control Audit ==={Colors.ENDC}")
    
    # 1. USER SETUP (Do this first to avoid Rate Limit lockout)
    print("\n--- 1. Setup Test Users ---")
    # Use seeded users since registration is disabled
    attacker_email = "rkb@balaka.com" 
    attacker_pass = "agentpassword"
    victim_id = 1 # Assuming Admin is ID 1
    
    attacker_token = get_token(attacker_email, attacker_pass)
    
    if not attacker_token:
        print(f"Login failed for {attacker_email}. Trying admin fallback...")
        # Fallback to Admin from seed_admin.py
        admin_token = get_token("admin@airbalakatravel.com", "AirBalaka@2026!#Secure") 
        if not admin_token:
             log("FAIL", "Could not login with Seed credentials. Seed DB?")
             return
        else:
             log("WARN", "Logged in as Admin. RBAC tests will likely FAIL (False Positive) as Admin has access.")
             attacker_token = admin_token
    else:
        print(f"Logged in as Standard User: {attacker_email}")

    headers_attacker = {"Authorization": f"Bearer {attacker_token}"}

    # 2. AUTHENTICATION (AuthN)
    print("\n--- 2. Authentication (AuthN) ---")
    
    # A. Weak Password
    print("Test: Weak Password Policy")
    resp = register_user("weak@audit.com", "123", "Weak User")
    if resp.status_code == 422 or resp.status_code == 400:
        log("PASS", f"Weak password rejected ({resp.status_code})")
    else:
        log("FAIL", f"Weak password accepted ({resp.status_code})")

    # 3. BROKEN ACCESS CONTROL (IDOR)

    
    # Test: Attacker reads Victim Profile (ID 1 - Admin)
    # Note: If attacker is Admin, this is allowed. If Staff, it might be allowed if they have 'users.view'.
    # We need to know the Role permissions.
    print(f"Test: Attacker reads User {victim_id} (GET /users/{{id}})")
    resp = requests.get(f"{API_URL}/users/{victim_id}", headers=headers_attacker)
    print(f"Response: {resp.status_code}")
    
    if resp.status_code in [403, 404]:
        log("PASS", f"Access denied ({resp.status_code})")
    elif resp.status_code == 200:
        # Check if we are admin
        me = requests.get(f"{API_URL}/users/me", headers=headers_attacker).json()
        if me.get("is_superuser"):
             log("INFO", "IDOR Test skipped (User is Superuser)")
        else:
             log("FAIL", "IDOR Detected! Standard user read Admin profile.")
    else:
        log("WARN", f"Unexpected response: {resp.status_code}")

    # 4. RBAC (Vertical Escalation)
    print("\n--- 3. RBAC (Privilege Escalation) ---")
    
    # Test: List All Users (Admin Endpoint)
    print("Test: Attacker lists all users (GET /users/)")
    resp = requests.get(f"{API_URL}/users/", headers=headers_attacker)
    if resp.status_code == 403:
        log("PASS", "Admin endpoint protected (403)")
    elif resp.status_code == 200:
         me = requests.get(f"{API_URL}/users/me", headers=headers_attacker).json()
         if me.get("is_superuser"):
             log("INFO", "RBAC Test skipped (User is Superuser)")
         else:
             # Check if 'Staff' role implies 'users.view_all'
             # If so, this is not a vulnerability, but a feature.
             log("WARN", "Standard user accessed /users/. Check permissions.")
    else:
        log("WARN", f"Unexpected response: {resp.status_code}")

    # 5. LOGIC / PARAMETER TAMPERING
    print("\n--- 4. Logic & Tampering ---")
    
    # Test: Update self with is_superuser=True
    print("Test: Self-promote to Superuser (PUT /users/me)")
    data = {
        "full_name": "Attacker Hacked",
        "email": attacker_email,
        "is_superuser": True
    }
    resp = requests.put(f"{API_URL}/users/me", headers=headers_attacker, json=data)
    
    # Verification
    check = requests.get(f"{API_URL}/users/me", headers=headers_attacker).json()
    if check.get("is_superuser") == True:
        log("FAIL", "Parameter Tampering Success! User is now Superuser.")
    else:
        log("PASS", "is_superuser field ignored/protected.")

    # 6. RATE LIMITING (Run last to avoid lockout)
    print("\n--- 6. Rate Limiting ---")
    print("Test: Login Rate Limiting (5 attempts)")
    blocked = False
    for i in range(6):
        resp = requests.post(f"{API_URL}/login/access-token", data={"username": "admin@example.com", "password": "wrong"}, timeout=TIMEOUT)
        if resp.status_code == 429:
            blocked = True
            break
    if blocked:
        log("PASS", "Rate limiting active (429 received)")
    else:
        log("WARN", "No rate limiting detected after 6 attempts")

if __name__ == "__main__":
    try:
        run_audit()
    except Exception as e:
        print(f"Error: {e}")
