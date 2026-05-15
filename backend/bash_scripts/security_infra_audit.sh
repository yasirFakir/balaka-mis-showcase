#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/../.."

# Configuration
API_URL="http://localhost:8008"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

check_http_code() {
    local url=$1
    local expected=$2
    local code=$(curl -o /dev/null -s -w "%{http_code}" "$url")
    if [ "$code" == "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $url -> $code (Expected)"
    else
        echo -e "  ${RED}✗${NC} $url -> $code (Expected $expected)"
    fi
}

echo "============================================"
echo "   Balaka MIS Infra & Supply Chain Audit"
echo "============================================"

# 1. SERVER MISCONFIGURATION
echo -e "\n--- 1. Server Misconfiguration ---"
log "Checking Security Headers..."
headers=$(curl -s -I "$API_URL/")
if echo "$headers" | grep -q "Strict-Transport-Security"; then echo -e "  ${GREEN}✓${NC} HSTS Present"; else echo -e "  ${RED}✗${NC} HSTS Missing"; fi
if echo "$headers" | grep -q "X-Content-Type-Options: nosniff"; then echo -e "  ${GREEN}✓${NC} X-Content-Type-Options Present"; else echo -e "  ${RED}✗${NC} X-Content-Type-Options Missing"; fi
if echo "$headers" | grep -q "X-Frame-Options: DENY"; then echo -e "  ${GREEN}✓${NC} X-Frame-Options Present"; else echo -e "  ${RED}✗${NC} X-Frame-Options Missing"; fi

log "Checking Verb Tampering..."
check_http_code "$API_URL/" "200" # GET should work
# TRACE should be blocked (405 or 501 or 403)
trace_code=$(curl -X TRACE -o /dev/null -s -w "%{http_code}" "$API_URL/")
if [[ "$trace_code" =~ ^(405|501|403)$ ]]; then
     echo -e "  ${GREEN}✓${NC} TRACE -> $trace_code (Blocked)"
else
     echo -e "  ${RED}✗${NC} TRACE -> $trace_code (Allowed/Unexpected)"
fi

log "Checking Server Banner..."
server_header=$(curl -s -I "$API_URL/" | grep -i "Server:")
echo "  Detected: $server_header"

# 2. CORS & API SECURITY
echo -e "\n--- 2. CORS & API Security ---"
log "Checking CORS Wildcard (Origin: https://evil.com)..."
cors_headers=$(curl -s -I -H "Origin: https://evil.com" -H "Access-Control-Request-Method: GET" "$API_URL/api/v1/")
if echo "$cors_headers" | grep -q "Access-Control-Allow-Origin: https://evil.com"; then
    echo -e "  ${RED}✗${NC} Reflects arbitrary origin (Potentially Insecure)"
elif echo "$cors_headers" | grep -q "Access-Control-Allow-Origin: *"; then
    echo -e "  ${YELLOW}⚠${NC} Wildcard allowed (Acceptable for public API, risky for auth)"
else
    echo -e "  ${GREEN}✓${NC} Origin not reflected/allowed"
fi

log "Checking Docs Exposure..."
check_http_code "$API_URL/docs" "200"
check_http_code "$API_URL/openapi.json" "200"
echo "  (Note: /docs is usually acceptable in dev/beta, restricted in prod)"

# 3. ENVIRONMENT & SECRETS
echo -e "\n--- 3. Environment & Secrets ---"
log "Checking File Leaks (Static)..."
# Checking if backend serves .env via static route? (Unlikely with FastAPI unless explicitly mounted, but good check)
check_http_code "$API_URL/.env" "404"
check_http_code "$API_URL/.git/HEAD" "404"

log "Scanning for Hardcoded Secrets (grep)..."
# Simple grep for typical keywords
grep -rE "api_key|aws_access_key" "$BACKEND_DIR" "$FRONTEND_DIR" --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.git --exclude-dir=build --exclude-dir=dist > secrets_scan.log 2>&1
if [ -s secrets_scan.log ]; then
    warn "Potential secrets found (see secrets_scan.log)"
    head -n 3 secrets_scan.log
else
    echo -e "  ${GREEN}✓${NC} No obvious hardcoded keys found"
fi
rm secrets_scan.log

# 4. SUPPLY CHAIN
echo -e "\n--- 4. Supply Chain Audit ---"
log "Checking Python Dependencies (pip-audit)..."
if [ -d "$BACKEND_DIR/.venv" ]; then
    cd "$BACKEND_DIR"
    # Install pip-audit if missing
    if ! .venv/bin/pip freeze | grep -q "pip-audit"; then
        echo "  Installing pip-audit..."
        .venv/bin/pip install pip-audit > /dev/null 2>&1
    fi
    .venv/bin/pip-audit > pip_audit.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} No known vulnerabilities found (Python)"
    else
        echo -e "  ${RED}✗${NC} Vulnerabilities found (Python). See backend/pip_audit.log"
        cat pip_audit.log | head -n 5
    fi
    cd ..
else
    echo -e "  ${YELLOW}[SKIP]${NC} Backend .venv not found"
fi

log "Checking Node Dependencies (npm audit)..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    npm audit > npm_audit.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} No known vulnerabilities found (Node)"
    else
         echo -e "  ${YELLOW}⚠${NC} Vulnerabilities found (Node). See frontend/npm_audit.log"
         # Check for HIGH/CRITICAL
         if grep -E "High|Critical" npm_audit.log;
         then
             echo -e "  ${RED}!!! HIGH/CRITICAL RISKS DETECTED !!!${NC}"
         fi
    fi
    cd ..
else
    echo -e "  ${YELLOW}[SKIP]${NC} Frontend directory not found"
fi

echo -e "\nAudit Complete."
