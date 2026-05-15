#!/bin/bash
# Exit on error
set -e

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo "🚀 Seeding Core System Data (Roles, Permissions, Admin, Services)..."
export PYTHONPATH=$PYTHONPATH:.

# Detect Python
if [ -f ".venv/bin/python3" ]; then
    .venv/bin/python3 -m app.seeds.seed_all
elif [ -f ".venv/bin/python" ]; then
    .venv/bin/python -m app.seeds.seed_all
else
    python3 -m app.seeds.seed_all
fi

echo "✅ Seeding complete."
