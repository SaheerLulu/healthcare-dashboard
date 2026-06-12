#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Healthcare Inventory Dashboard ==="

# This is the LOCAL DEV entrypoint: default DEBUG on unless the caller
# already set it. settings.py defaults DJANGO_DEBUG to False so bare
# production-ish runs fail closed (auth required, restricted hosts);
# dev convenience belongs here, not in the settings default.
export DJANGO_DEBUG="${DJANGO_DEBUG:-True}"

# Backend: migrations + pipelines + server
echo "[Backend] Running migrations..."
cd backend
python3 manage.py migrate --run-syncdb 2>&1 | tail -3

echo "[Backend] Running data pipelines..."
python3 manage.py run_all_pipelines --full

echo "[Backend] Starting server on port 8002..."
python3 manage.py runserver 8002 &
BACKEND_PID=$!
cd ..

# Frontend: dev server
echo "[Frontend] Starting Vite dev server on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== Both servers running ==="
echo "  Backend:  http://localhost:8002/api/"
echo "  Frontend: http://localhost:5173/"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
