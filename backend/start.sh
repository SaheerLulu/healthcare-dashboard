#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Healthcare Inventory Dashboard Backend ==="

# Run migrations
echo "Running migrations..."
python3 manage.py migrate --run-syncdb 2>&1 | tail -3

# Run pipelines
echo "Running data pipelines..."
python3 manage.py run_all_pipelines --full

# Start server
echo "Starting server on port 8002..."
python3 manage.py runserver 8002
