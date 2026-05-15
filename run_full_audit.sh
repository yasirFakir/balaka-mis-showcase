#!/bin/bash

# Balaka MIS - Unified Test & Audit Script
# This script runs all backend tests and frontend E2E tests for both Client and Admin sites.

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}      BALAKA MIS UNIFIED TEST AUDIT SUITE           ${NC}"
echo -e "${CYAN}====================================================${NC}"

# --- BACKEND AUDIT ---
echo -e "\n${YELLOW}[1/3] Running Backend Test Suite (Pytest)...${NC}"
cd backend
if [ -d ".venv" ]; then
    export PYTHONPATH=.
    .venv/bin/pytest tests/ --maxfail=5
else
    echo -e "${RED}Error: Backend virtual environment (.venv) not found.${NC}"
    exit 1
fi
cd ..

# --- FRONTEND E2E AUDIT ---
echo -e "\n${YELLOW}[2/3] Preparing Frontend E2E Environment...${NC}"
# Note: This assumes servers are running or will be started. 
# For a truly unified script, we might want to check if they are up. 

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}Playwright not found. Installing...${NC}"
    cd frontend && npm install && npx playwright install --with-deps && cd ..
fi

echo -e "\n${YELLOW}[3/3] Executing Frontend Smoke Tests (Playwright)...${NC}"
cd frontend

# Run Client Smoke Tests (Assuming localhost:3000)
echo -e "${CYAN}> Running Client Site Smoke Tests...${NC}"
PLAYWRIGHT_BASE_URL="http://localhost:3000" npx playwright test tests/e2e/client-smoke.spec.ts --project=firefox

# Run Admin Site Smoke Tests (Assuming localhost:3001)
echo -e "\n${CYAN}> Running Admin Site Smoke Tests...${NC}"
PLAYWRIGHT_BASE_URL="http://localhost:3001" npx playwright test tests/e2e/admin-smoke.spec.ts --project=firefox

cd ..

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}      ALL AUDITS COMPLETED SUCCESSFULLY!            ${NC}"
echo -e "${GREEN}====================================================${NC}"
