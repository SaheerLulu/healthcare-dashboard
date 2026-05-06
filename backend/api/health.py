"""Health check + freshness endpoints for the dashboard service.

Why: DASH-E00-A05 (Reliability NFR) sets a 15-minute data-freshness lag
threshold per reporting table. A deployment / load balancer / oncall
script needs a single endpoint that returns liveness + freshness in one
call so it doesn't have to walk every business endpoint.

Endpoints:
- GET /api/health/         — liveness only (DB reachable, app up)
- GET /api/health/data/    — per-pipeline freshness (last_run_at, lag_seconds)

Both are intentionally permission-free so they can be probed by
upstream monitors without an auth header.
"""
from datetime import datetime, timezone

from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def liveness(_request):
    """Cheap probe — confirms DB is reachable and process is responsive."""
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        db_ok = True
        db_error = None
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    body = {
        "service": "healthcare-dashboard",
        "status": "ok" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": {"ok": db_ok, "error": db_error},
        },
    }
    return Response(body, status=200 if db_ok else 503)


@api_view(["GET"])
@permission_classes([AllowAny])
def data_freshness(_request):
    """Per-pipeline freshness summary keyed off ``PipelineLog``.

    Returns one entry per pipeline_type with the last successful run, the
    age in seconds, and a status flag (``fresh``/``stale``) using the
    15-minute threshold from DASH-E00-A05.
    """
    from pipeline.models import PipelineLog

    THRESHOLD_SECONDS = 15 * 60

    rows = list(
        PipelineLog.objects.values("pipeline_type")
        .order_by("pipeline_type", "-last_run_at")
        .distinct()
    )

    # `.distinct()` on values without DISTINCT ON support (SQLite) won't
    # collapse duplicates of the same pipeline_type; do it manually.
    seen: dict[str, dict] = {}
    for log in (
        PipelineLog.objects.order_by("pipeline_type", "-last_run_at").values(
            "pipeline_type",
            "last_run_at",
            "records_processed",
            "status",
            "duration_seconds",
        )
    ):
        ptype = log["pipeline_type"]
        if ptype in seen:
            continue
        seen[ptype] = log

    now = datetime.now(timezone.utc)
    items = []
    overall_stale = False
    for log in seen.values():
        last_run = log.get("last_run_at")
        if last_run is None:
            lag = None
            status = "unknown"
        else:
            if last_run.tzinfo is None:
                last_run = last_run.replace(tzinfo=timezone.utc)
            lag = int((now - last_run).total_seconds())
            status = "fresh" if lag <= THRESHOLD_SECONDS else "stale"
            if status == "stale":
                overall_stale = True

        items.append(
            {
                "pipeline_type": log["pipeline_type"],
                "last_run_at": (last_run.isoformat() if last_run else None),
                "lag_seconds": lag,
                "status": status,
                "records_processed": log.get("records_processed"),
                "last_run_status": log.get("status"),
                "duration_seconds": log.get("duration_seconds"),
            }
        )

    body = {
        "threshold_seconds": THRESHOLD_SECONDS,
        "overall": "stale" if overall_stale else "fresh" if items else "unknown",
        "pipelines": items,
    }
    return Response(body)
