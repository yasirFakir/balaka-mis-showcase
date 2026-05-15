#!/bin/bash
# Exit on error
set -e

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo "🚀 Seeding Performance Mock Data (High volume requests/transactions)..."
export PYTHONPATH=$PYTHONPATH:.
python3 -m app.seeds.mock.seed_performance

echo "✅ Performance seeding complete."
