import requests
import time

API_URL = "http://localhost:8008/api/v1"
EMAIL = "rkb@balaka.com"
PASSWORD = "agentpassword"

def login(password):
    try:
        resp = requests.post(f"{API_URL}/login/access-token", data={"username": EMAIL, "password": password})
        return resp
    except Exception as e:
        print(e)
        return None

def run():
    print("--- Testing Account Lockout ---")
    
    # 1. Verify working login
    print("1. Verifying correct credentials...")
    resp = login(PASSWORD)
    if resp.status_code == 200:
        print("   Success.")
    else:
        print(f"   Failed to login initially: {resp.status_code} {resp.text}")
        return

    # 2. Fail 5 times
    print("2. Sending 5 failures...")
    for i in range(5):
        resp = login("wrongpass")
        print(f"   Attempt {i+1}: {resp.status_code}")
        # Note: Rate limiting might kick in (429) before Lockout (400/401).
        # We need to distinguish. 
        # If rate limited, we can't test lockout easily without waiting.
        if resp.status_code == 429:
            print("   Rate Limited (IP Ban).")
            # We can't proceed if IP is banned.
            # But lockout is USER ban.
            # We assume rate limit is 5/minute.
            # So 5 attempts is exactly the limit.
            pass

    # 3. Try correct password immediately
    print("3. Trying correct password (should be LOCKED or Rate Limited)...")
    resp = login(PASSWORD)
    print(f"   Response: {resp.status_code} {resp.text}")
    
    if resp.status_code == 400: # login_access_token returns 400 for failures
        # Ideally we want to know if it's "Locked" or "Incorrect".
        # But for security, we return generic message or None from authenticate.
        # But if we are locked, authenticate returns None.
        # So we get "Incorrect email or password" (400).
        print("   Result: Rejected (400). This indicates Lockout if credentials are correct.")
    elif resp.status_code == 200:
        print("   Result: Success (Login worked). Lockout FAILED.")
    elif resp.status_code == 429:
        print("   Result: Rate Limited (429). Hard to verify Lockout.")

if __name__ == "__main__":
    run()
