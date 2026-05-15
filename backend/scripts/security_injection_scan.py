import requests
import json
import sys
import time

# Configuration
API_URL = "http://localhost:8008"  # Adjust if your backend runs on a different port
TIMEOUT = 5

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(type, message, detail=None):
    if type == "INFO":
        print(f"{Colors.OKBLUE}[INFO]{Colors.ENDC} {message}")
    elif type == "SUCCESS":
        print(f"{Colors.OKGREEN}[PASS]{Colors.ENDC} {message}")
    elif type == "WARNING":
        print(f"{Colors.WARNING}[WARN]{Colors.ENDC} {message}")
    elif type == "FAILURE":
        print(f"{Colors.FAIL}[FAIL]{Colors.ENDC} {message}")
    
    if detail:
        print(f"       {detail}")

def check_backend_health():
    try:
        response = requests.get(f"{API_URL}/", timeout=TIMEOUT)
        if response.status_code == 200:
            log("SUCCESS", "Backend is reachable.")
            return True
        else:
            log("WARNING", f"Backend reachable but returned status {response.status_code}")
            return True # Proceed anyway
    except requests.exceptions.ConnectionError:
        log("FAILURE", "Backend is not reachable at " + API_URL)
        return False

# --- SQL Injection Tests ---
def test_sqli():
    print(f"\n{Colors.HEADER}--- Starting SQL Injection Tests ---{Colors.ENDC}")
    
    # Target: Public Login Endpoint (common target)
    target_url = f"{API_URL}/api/v1/login/access-token"
    
    payloads = [
        ("' OR '1'='1", "Generic bypass attempt"),
        ("admin' --", "Comment truncation"),
        ("' UNION SELECT 1, 'admin', 'pass' --", "Union based"),
        ("' AND 1=0 --", "Boolean False"),
        ("'; SELECT pg_sleep(5);--", "Time-based (Postgres)")
    ]

    for payload, desc in payloads:
        try:
            # Attempt injection in username field
            data = {"username": payload, "password": "password123"}
            start_time = time.time()
            response = requests.post(target_url, data=data, timeout=10) # Longer timeout for time-based
            elapsed = time.time() - start_time
            
            # Analysis
            if response.status_code == 500:
                 log("WARNING", f"Potential SQLi (500 Error) with payload: {payload}", f"Desc: {desc}")
            elif elapsed > 4 and "pg_sleep" in payload:
                 log("FAILURE", f"Time-based SQLi confirmed! Response took {elapsed:.2f}s", f"Payload: {payload}")
            elif response.status_code == 200:
                 # If we logged in with garbage password but injection, that's a fail
                 if "access_token" in response.json():
                     log("FAILURE", f"Auth Bypass Successful with payload: {payload}", f"Desc: {desc}")
                 else:
                     log("SUCCESS", f"Payload handled correctly (200 OK but no token): {payload}")
            elif response.status_code in [400, 401, 422, 404]:
                 log("SUCCESS", f"Payload rejected safely ({response.status_code}): {payload}")
            else:
                 log("INFO", f"Unexpected status {response.status_code} for payload: {payload}")

        except Exception as e:
            log("INFO", f"Request failed for {payload}: {str(e)}")

# --- XSS Tests ---
def test_xss():
    print(f"\n{Colors.HEADER}--- Starting XSS Tests ---{Colors.ENDC}")
    
    # Target: We'll assume a search or public endpoint that reflects input
    # Since we might not have a public search, we will try to 'register' or use a public form if available.
    # Falling back to a safe assumption: Checking if the API reflects input in error messages without escaping.
    
    target_url = f"{API_URL}/api/v1/login/access-token" 
    
    payloads = [
        ("<script>alert(1)</script>", "Basic Reflected"),
        (">\"<img src=x onerror=alert(1)>", "Break out of attribute"),
        ("javascript:alert(1)", "Protocol handler")
    ]

    for payload, desc in payloads:
        try:
            # We put payload in username, hoping it reflects in error like "User <script>... not found"
            data = {"username": payload, "password": "password123"}
            response = requests.post(target_url, data=data, timeout=TIMEOUT)
            
            content = response.text
            
            if payload in content:
                # Check if Content-Type is text/html (API should return JSON, so this is usually low risk unless browser renders it)
                if "text/html" in response.headers.get("Content-Type", ""):
                     log("FAILURE", f"Reflected XSS Detected! Payload found in HTML response: {payload}")
                else:
                     log("WARNING", f"Payload reflected in JSON (Low Risk if client handles correctly): {payload}")
            else:
                log("SUCCESS", f"Payload not reflected directly: {payload}")

        except Exception as e:
            log("INFO", f"XSS Check error: {str(e)}")

# --- SSRF Tests ---
def test_ssrf():
    print(f"\n{Colors.HEADER}--- Starting SSRF Tests ---{Colors.ENDC}")
    
    # Target: Often endpoints that fetch URLs (profile image, imports). 
    # Attempting to hit a known endpoint that might take a URL. 
    # If none known, we will try a generic 'file' or 'url' param on a common endpoint if applicable.
    # For this audit, we'll assume there isn't a widely open public URL fetcher, but we'll test headers.
    
    target_url = f"{API_URL}/api/v1/login/access-token"
    
    headers_payloads = [
        ("X-Forwarded-For", "127.0.0.1"),
        ("Referer", "http://127.0.0.1:22"),
        ("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
    ]

    for header, value in headers_payloads:
        try:
            response = requests.post(target_url, data={"username": "test", "password": "pwd"}, headers={header: value}, timeout=TIMEOUT)
            
            # Blind SSRF is hard to detect without an external listener. 
            # We mostly check if it crashes (500) or behaves oddly.
            if response.status_code == 500:
                log("WARNING", f"Server error with header {header}: {value}. Potential handling issue.")
            else:
                log("SUCCESS", f"Server handled header {header} safely ({response.status_code})")
        except Exception as e:
            log("INFO", f"SSRF header test failed: {str(e)}")

if __name__ == "__main__":
    print(f"{Colors.BOLD}Starting Security Injection Scan...{Colors.ENDC}")
    if check_backend_health():
        test_sqli()
        test_xss()
        test_ssrf()
    else:
        print("Skipping tests as backend is down.")
