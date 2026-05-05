"""Performance + caching middleware for the dashboard API.

Why: DASH-E00-A03 (Performance NFR) sets a 800 ms p95 budget per endpoint.
Without per-request instrumentation we cannot sample p95 or attribute
slow responses to ORM, view, or middleware time. This module emits a
single structured log line per request so the budget is observable.
"""
import logging
import time
from django.conf import settings
from django.db import connection

log = logging.getLogger("api.perf")


class PerfTimingMiddleware:
    """Log path, sql_count, sql_time, view_time for every /api/ request.

    The log line is structured so it can be grepped or shipped to a SIEM:
      perf path=/api/executive/kpis/ method=GET status=200 sql=4 sqlms=12.1 viewms=89.4

    Disabled outside DEBUG by default; flip ``DASHBOARD_PERF_LOG=1`` to
    enable in production for ad-hoc capture.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = bool(
            getattr(settings, "DEBUG", False)
            or settings.__dict__.get("DASHBOARD_PERF_LOG")
        )

    def __call__(self, request):
        if not self.enabled or not request.path.startswith("/api/"):
            return self.get_response(request)

        sql_count_start = len(connection.queries)
        t0 = time.perf_counter()
        response = self.get_response(request)
        view_ms = (time.perf_counter() - t0) * 1000.0
        queries = connection.queries[sql_count_start:]
        sql_count = len(queries)
        sql_ms = sum(float(q.get("time", 0.0)) for q in queries) * 1000.0

        log.info(
            "perf path=%s method=%s status=%s sql=%d sqlms=%.1f viewms=%.1f",
            request.path,
            request.method,
            getattr(response, "status_code", "-"),
            sql_count,
            sql_ms,
            view_ms,
        )
        if view_ms > 800:
            log.warning(
                "perf-budget-exceeded path=%s viewms=%.1f sql=%d",
                request.path,
                view_ms,
                sql_count,
            )
        return response


class CacheControlMiddleware:
    """Add HTTP cache headers to a small allow-list of stable endpoints.

    Filter-options change only when new locations / categories / channels /
    payment methods appear in the source data — typically rare. A 5-minute
    public cache here saves roughly 12 round-trips per dashboard load.
    """

    CACHEABLE_PATHS = {
        "/api/executive/filter-options/",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.method == "GET" and request.path in self.CACHEABLE_PATHS:
            response["Cache-Control"] = "public, max-age=300"
        return response
