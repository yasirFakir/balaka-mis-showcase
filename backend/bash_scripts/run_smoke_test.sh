#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/../.."

# Kill anything on ports 8008, 3000, 3001
fuser -k 8008/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null

# Clean locks
rm -f frontend/apps/balaka-admin/.next/dev/lock
rm -f frontend/apps/balaka-client/.next/dev/lock

# Start Backend
echo "Starting Backend..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8008 &
BACKEND_PID=$!
cd ..

# Wait for backend port
echo "Waiting for backend port 8008..."
until python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); result = s.connect_ex(('localhost', 8008)); s.close(); exit(result)" 2>/dev/null; do
  sleep 1
done
echo "Backend is up!"

# Start Admin Frontend (3000)
echo "Starting Admin Frontend..."
cd frontend/apps/balaka-admin
npm run dev -- -p 3000 &
FRONTEND_PID=$!
cd ../../..

# Start Client Frontend (3001)
echo "Starting Client Frontend..."
cd frontend/apps/balaka-client
npm run dev -- -p 3001 &
CLIENT_PID=$!
cd ../../..

# Wait for frontends
echo "Waiting for Admin Frontend (3000)..."
until python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); result = s.connect_ex(('localhost', 3000)); s.close(); exit(result)" 2>/dev/null; do
  sleep 1
done
echo "Admin Frontend is up!"

echo "Waiting for Client Frontend (3001)..."
until python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); result = s.connect_ex(('localhost', 3001)); s.close(); exit(result)" 2>/dev/null; do
  sleep 1
done
echo "Client Frontend is up!"

# Run Admin Tests
echo "Running Admin Smoke Test..."
cd frontend
npx playwright test tests/e2e/admin-smoke.spec.ts --workers=2 --reporter=line
ADMIN_TEST_EXIT_CODE=$?

# Run Client Tests
echo "Running Client Smoke Test..."
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test tests/e2e/client-smoke.spec.ts --workers=2 --reporter=line
CLIENT_TEST_EXIT_CODE=$?

# Cleanup
echo "Stopping services..."
kill $BACKEND_PID
kill $FRONTEND_PID
kill $CLIENT_PID

if [ $ADMIN_TEST_EXIT_CODE -ne 0 ] || [ $CLIENT_TEST_EXIT_CODE -ne 0 ]; then
    exit 1
else
    exit 0
fi