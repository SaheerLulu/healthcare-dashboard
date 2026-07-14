#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Healthcare Inventory Dashboard ==="

# Load backend/.env (DB credentials etc.) so both the pipeline commands and
# runserver see them. Django reads straight from os.environ — it does NOT
# auto-load .env — so we export every KEY=VALUE here. Values already set in
# the caller's environment win over the file.
ENV_FILE="backend/.env"
if [ -f "$ENV_FILE" ]; then
  echo "[Backend] Loading $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# This is the LOCAL DEV entrypoint: default DEBUG on unless the caller
# already set it. settings.py defaults DJANGO_DEBUG to False so bare
# production-ish runs fail closed (auth required, restricted hosts);
# dev convenience belongs here, not in the settings default.
export DJANGO_DEBUG="${DJANGO_DEBUG:-True}"

# Local dev targets the PostgreSQL "healthcare_dev" database by default
# (overridable in backend/.env). Both the dashboard's report/pipeline tables
# and the upstream source tables it proxies live there.
export DJANGO_DB_ENGINE="${DJANGO_DB_ENGINE:-postgresql}"
export POSTGRES_DB="${POSTGRES_DB:-healthcare_dev}"
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Backend: migrations + pipelines + server
echo "[Backend] Running migrations..."
cd backend
python3 manage.py migrate --run-syncdb 2>&1 | tail -3

echo "[Backend] Running data pipelines..."
python3 manage.py run_all_pipelines --full

echo "[Backend] Starting server on 0.0.0.0:8002..."
# Bind all interfaces so the API is reachable off-box / from the internet.
# DEBUG mode sets ALLOWED_HOSTS=['*'], so any public host/IP is accepted.
python3 manage.py runserver 0.0.0.0:8002 &
BACKEND_PID=$!
cd ..

# Frontend: dev server. vite.config.ts sets host:true so Vite also binds
# 0.0.0.0; it proxies /api → localhost:8002 server-side, so exposing port
# 5173 is enough to use the whole app from another machine / the internet.
echo "[Frontend] Starting Vite dev server on 0.0.0.0:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Best-effort: show the LAN IP so you know what to browse to from other hosts.
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo ""
echo "=== Both servers running (bound to all interfaces) ==="
echo "  Frontend: http://localhost:5173/        (app entry point)"
echo "  Backend:  http://localhost:8002/api/"
if [ -n "$LAN_IP" ]; then
  echo "  On your network / internet: http://$LAN_IP:5173/"
fi
echo ""
echo "  Reachable from the internet requires the host firewall / cloud"
echo "  security group to allow inbound TCP 5173 (and 8002 for direct API)."
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
