#!/bin/bash
# Exit on error
set -e

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo "🚀 Upgrading Database Schema to latest head..."
export PYTHONPATH=$PYTHONPATH:.

# Detect Python/Alembic
if [ -f ".venv/bin/python3" ]; then
    .venv/bin/python3 -m alembic upgrade head
elif [ -f ".venv/bin/python" ]; then
    .venv/bin/python -m alembic upgrade head
else
    python3 -m alembic upgrade head
fi

echo "✅ Upgrade complete."
