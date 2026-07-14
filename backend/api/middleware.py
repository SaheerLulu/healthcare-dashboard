"""Performance + caching middleware for the dashboard API.

Why: DASH-E00-A03 (Performance NFR) sets a 800 ms p95 budget per endpoint.
Without per-request instrumentation we cannot sample p95 or attribute
slow responses to ORM, view, or middleware time. This module emits a
single structured log line per request so the budget is observable.
"""
import json
import logging
import re
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


class AuditMiddleware:
    """Append a row to ``reports.AuditLog`` for every non-GET /api/ request.

    Implements DASH-E00-A04 (Security NFR) — "Every successful mutation
    writes to ``report_audit_log`` with actor, action, entity, timestamp"
    — and the audit-trail clause of DASH-E00-A07. Failed permission
    attempts (401 / 403) are also logged so security telemetry is honest
    about who tried what.

    Notes
    -----
    - Only methods that mutate state are logged: POST, PATCH, PUT, DELETE.
      GET reads are deliberately not logged here (volume) — they're
      handled at the page level via the user-activity endpoint instead.
    - ``/api/auth/*`` bodies are NEVER recorded — login and refresh
      payloads are credentials by definition and the audit table has an
      8-year retention (DASH-E00-A07). The request row itself (who,
      when, status) is still written.
    - For every other body, the VALUES of sensitive keys (password,
      token, refresh, authorization, secret, api_key) are replaced with
      ``[redacted]`` — masking the key name alone would retain the
      secret. JSON bodies are masked structurally; anything else falls
      back to a regex over ``key: value`` / ``key=value`` shapes.
    - The body summary is truncated to 500 characters so a stray giant
      payload can't blow up the log table.
    - DB write happens inside a try/except so an audit failure never
      kills a real request.
    """

    LOGGED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
    SENSITIVE_KEYS = ("password", "token", "refresh", "authorization", "secret", "api_key")
    # Paths whose bodies are never recorded, regardless of masking.
    NO_BODY_PREFIXES = ("/api/auth/",)
    BODY_LIMIT = 500
    REDACTED = "[redacted]"
    # Fallback for non-JSON bodies: `key=value` (form-encoded) or
    # `"key": "value"` fragments inside malformed JSON.
    _SENSITIVE_VALUE_RE = re.compile(
        r'(?i)(["\']?[\w.-]*(?:password|token|refresh|authorization|secret|api_key)'
        r'[\w.-]*["\']?\s*[:=]\s*)("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|[^,&\s}\]]+)'
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def _client_ip(self, request) -> str:
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "") or ""

    def _user_info(self, request):
        u = getattr(request, "user", None)
        if u is None or not getattr(u, "is_authenticated", False):
            return None, ""
        uid = int(getattr(u, "id", 0) or 0) or None
        label = getattr(u, "username", "") or getattr(u, "email", "") or ""
        return uid, label[:120]

    @classmethod
    def _is_sensitive_key(cls, key) -> bool:
        lowered = str(key).lower()
        return any(marker in lowered for marker in cls.SENSITIVE_KEYS)

    @classmethod
    def _mask_structure(cls, value):
        """Recursively replace values of sensitive keys in parsed JSON."""
        if isinstance(value, dict):
            return {
                k: cls.REDACTED if cls._is_sensitive_key(k) else cls._mask_structure(v)
                for k, v in value.items()
            }
        if isinstance(value, list):
            return [cls._mask_structure(item) for item in value]
        return value

    def _summarise_body(self, request) -> str:
        try:
            if request.path.startswith(self.NO_BODY_PREFIXES):
                return ""
            body = request.body or b""
            if not body:
                return ""
            text = body.decode("utf-8", errors="replace")
            try:
                parsed = json.loads(text)
            except (ValueError, TypeError):
                parsed = None
            if isinstance(parsed, (dict, list)):
                text = json.dumps(self._mask_structure(parsed), ensure_ascii=False)
            else:
                text = self._SENSITIVE_VALUE_RE.sub(
                    rf"\g<1>{self.REDACTED}", text
                )
            return text[: self.BODY_LIMIT]
        except Exception:
            return ""

    def __call__(self, request):
        t0 = time.perf_counter()
        logged = (
            request.method in self.LOGGED_METHODS
            and request.path.startswith("/api/")
        )
        # Snapshot the (masked) body BEFORE the view runs: accessing
        # ``request.body`` here buffers it so DRF parsers still work,
        # whereas after the response the stream is consumed and Django
        # raises RawPostDataException.
        body_summary = self._summarise_body(request) if logged else ""

        response = self.get_response(request)
        if not logged:
            return response

        try:
            from reports.models import AuditLog

            uid, label = self._user_info(request)
            duration_ms = int((time.perf_counter() - t0) * 1000)

            AuditLog.objects.create(
                user_id=uid,
                user_label=label,
                method=request.method,
                path=request.path[:255],
                status_code=getattr(response, "status_code", None),
                duration_ms=duration_ms,
                ip=self._client_ip(request),
                body_summary=body_summary,
            )
        except Exception:
            log.exception("audit-log write failed for %s %s", request.method, request.path)
        return response
