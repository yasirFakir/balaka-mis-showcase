#!/bin/bash

# Configuration
PORT=8008
LOG_FILE="server.log"
PYTHON_BIN=".venv/bin/python"

# 1. Kill any existing processes on this port
echo "Cleaning up existing processes on port $PORT..."
pkill -9 -f "uvicorn.*--port $PORT" 2>/dev/null
sleep 1

echo "------------------------------------------------"
echo "Starting Balaka MIS Backend..."
echo "Address: http://localhost:$PORT"
echo "Logging to: $LOG_FILE"
echo "------------------------------------------------"

# 2. Run the server and pipe output to both console and file
# Using 2>&1 to capture both stdout and stderr
$PYTHON_BIN -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload 2>&1 | tee $LOG_FILE
