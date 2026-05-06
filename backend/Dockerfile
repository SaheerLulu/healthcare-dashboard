# Backend container — DASH-E20-F03 (Deployment).
#
# Single-stage Python image. Slim base + frozen requirements. Runs Django
# under gunicorn (set in CMD). Mounted upstream SQLite path is provided
# at runtime via DJANGO_DB_PATH; the container itself ships no DB.
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps (sqlite3 client only — handy for ad-hoc inspection
# inside the container). Build-essential not needed for pure-python
# wheels with the pinned versions.
RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt

COPY . /app

# Default port; can be overridden by docker-compose.
ENV DJANGO_PORT=8002 \
    DJANGO_DEBUG=False \
    DASHBOARD_REQUIRE_AUTH=1 \
    DASHBOARD_PERF_LOG=1

# Health probe — DASH-E00-A05 reliability NFR. The container is
# unhealthy if /api/health/ ever returns non-2xx for 3 consecutive
# checks 30 s apart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://localhost:${DJANGO_PORT}/api/health/" || exit 1

EXPOSE 8002

# `migrate --run-syncdb` is idempotent so it's safe to run on every
# container start. The pipeline does NOT run on boot — that's an
# orchestration choice (see docker-compose.yml `pipeline-bootstrap`
# service). gunicorn workers default to 3 (CPU-light, IO-bound).
CMD ["sh", "-c", "python3 manage.py migrate --run-syncdb && gunicorn dashboard_project.wsgi:application --bind 0.0.0.0:${DJANGO_PORT} --workers ${GUNICORN_WORKERS:-3} --access-logfile - --error-logfile -"]
