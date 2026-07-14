"""Smoke tests for one endpoint per dashboard domain.

These are *contract* tests, not data-correctness tests:

- Every listed endpoint must return HTTP 200 on a fresh test database
  (zero rows in any reporting table).
- Every endpoint must return JSON (no HTML errors leaking through).
- Every endpoint must accept the standard filter contract from
  helpers.parse_filters (start_date, end_date, location_ids, …).

If a future refactor breaks the response envelope, these tests catch it
before it reaches a frontend chart that crashes with "data is undefined".

DASHBOARD_REQUIRE_AUTH now fails closed (defaults to ``not DEBUG``), so a
bare ``manage.py test`` run resolves it to True. Suites that exercise the
open-dashboard contract override it to False explicitly; auth behaviour
itself is covered by JWTEnforcementTests.
"""
from django.core.cache import cache
from django.test import TestCase, Client, override_settings


SMOKE_ENDPOINTS = [
    # Executive
    "/api/executive/kpis/",
    "/api/executive/revenue-trend/",
    "/api/executive/channel-mix/",
    "/api/executive/category-revenue/",
    "/api/executive/top-products/",
    "/api/executive/inventory-alerts/",
    "/api/executive/pending-actions/",
    "/api/executive/today-sales/",
    "/api/executive/filter-options/",
    # Sales
    "/api/sales/overview/",
    "/api/sales/payment-mix/",
    "/api/sales/products/",
    # Financial
    "/api/financial/pnl/",
    "/api/financial/balance-sheet/",
    "/api/financial/cash-flow/",
    # Inventory
    "/api/inventory/overview/",
    "/api/inventory/by-category/",
    "/api/inventory/expiry/",
    # Procurement
    "/api/procurement/overview/",
    "/api/procurement/supplier-scorecard/",
    # GST + TDS
    "/api/gst/overview/",
    "/api/tds/overview/",
    # Working capital + location + product + dispatch + loyalty + audit
    "/api/working-capital/overview/",
    "/api/working-capital/runway/",
    "/api/location/comparison/",
    "/api/location/radar/",
    "/api/product/overview/",
    "/api/product/substitutability/",
    "/api/dispatch/pipeline/",
    "/api/loyalty/overview/",
    "/api/loyalty/rfm/",
    "/api/audit/overview/",
    "/api/audit/anomalies/",
    "/api/inventory/days-of-cover/",
    # Pipeline + health + reconcile + prefs
    "/api/pipeline/history/",
    "/api/pipeline/errors/",
    "/api/health/",
    "/api/health/data/",
    "/api/reconcile/sales/",
    "/api/reconcile/gst/",
    "/api/reconcile/cash/",
    "/api/reconcile/summary/",
    "/api/prefs/",
]


@override_settings(DASHBOARD_REQUIRE_AUTH=False)
class SmokeTests(TestCase):
    """Hit every public endpoint once. None should 5xx on an empty DB."""

    def setUp(self):
        self.c = Client()
        # filter-options is server-cached keyed on the pipeline watermark;
        # clear so no payload leaks across tests within one process.
        cache.clear()

    def test_all_endpoints_return_2xx(self):
        failures = []
        for path in SMOKE_ENDPOINTS:
            resp = self.c.get(path)
            if resp.status_code >= 500:
                failures.append((path, resp.status_code, resp.content[:200]))
        self.assertEqual(failures, [], f"5xx on: {failures}")

    def test_all_endpoints_return_json(self):
        non_json = []
        for path in SMOKE_ENDPOINTS:
            resp = self.c.get(path)
            ct = resp.headers.get("Content-Type", "")
            if "application/json" not in ct:
                non_json.append((path, ct))
        self.assertEqual(non_json, [], f"Non-JSON: {non_json}")

    def test_negative_or_garbage_limit_returns_200(self):
        """Regression: ?limit=-1 used to flow into qs[:limit] and 500
        (ValueError: negative indexing). Convention: bad numeric input
        degrades to the clamped default, never errors."""
        paths = [
            "/api/executive/top-products/",      # parse_filters limit
            "/api/inventory/days-of-cover/",     # direct limit + max_days
            "/api/loyalty/rfm/",                 # list-slice limit
            "/api/product/substitutability/",    # list-slice limit
        ]
        for path in paths:
            for params in ({"limit": "-1"}, {"limit": "x"},
                           {"limit": "-1", "max_days": "junk"}):
                resp = self.c.get(path, params)
                self.assertEqual(
                    resp.status_code, 200,
                    f"{path} with {params} -> {resp.status_code}",
                )

    def test_filter_contract_is_accepted(self):
        """Every endpoint that takes filters must accept the standard set
        without raising 5xx. Empty result sets are fine."""
        params = {
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "location_ids": "1,2,3",
            "category": "Antibiotic",
            "channel": "POS",
            "payment_method": "Cash",
        }
        failures = []
        for path in SMOKE_ENDPOINTS:
            if path.startswith("/api/health"):
                continue
            resp = self.c.get(path, params)
            if resp.status_code >= 500:
                failures.append((path, resp.status_code, resp.content[:200]))
        self.assertEqual(failures, [], f"Filter contract broke on: {failures}")


@override_settings(DASHBOARD_REQUIRE_AUTH=False)
class FilterOptionsCacheTests(TestCase):
    """The filter-options payload is server-cached (it costs ~25 DISTINCT
    scans) keyed on the newest PipelineLog.last_run_at, so a pipeline sync
    invalidates it without waiting out the TTL."""

    PATH = "/api/executive/filter-options/"

    def setUp(self):
        self.c = Client()
        cache.clear()

    def test_second_request_serves_cached_payload(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        first = self.c.get(self.PATH)
        self.assertEqual(first.status_code, 200)
        with CaptureQueriesContext(connection) as ctx:
            second = self.c.get(self.PATH)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json(), first.json())
        # Cached hit: only the PipelineLog watermark probe, not the
        # ~25 DISTINCT option scans.
        self.assertLessEqual(len(ctx.captured_queries), 3)

    def test_pipeline_run_invalidates_cache(self):
        from datetime import date
        from pipeline.models import PipelineLog
        from reports.models import ReportSales

        before = self.c.get(self.PATH).json()
        self.assertNotIn("Tablets", before["categories"])

        ReportSales.objects.create(
            source_id=1, source_line_id=1, source_type="pos",
            sale_date=date(2026, 6, 1), sale_month="2026-06",
            fiscal_year="2026-27", location_id=1, channel="POS",
            product_id=1, product_category="Tablets",
        )
        # Any sync writes PipelineLog (auto_now last_run_at), which moves
        # the cache key — no stale options until the TTL runs out.
        PipelineLog.objects.create(pipeline_type="pos_sales", last_synced_id=1)

        after = self.c.get(self.PATH).json()
        self.assertIn("Tablets", after["categories"])


class JWTEnforcementTests(TestCase):
    """Verify that DASHBOARD_REQUIRE_AUTH flips the entire surface to
    require a JWT, and that an unauth GET on a protected endpoint
    returns 401/403 — proving DashboardPermission is wired correctly.
    """

    def setUp(self):
        self.c = Client()

    def test_flag_off_allows_anon(self):
        with override_settings(DASHBOARD_REQUIRE_AUTH=False):
            resp = self.c.get("/api/executive/kpis/")
        self.assertEqual(resp.status_code, 200)

    def test_flag_on_blocks_anon(self):
        with override_settings(DASHBOARD_REQUIRE_AUTH=True):
            resp = self.c.get("/api/executive/kpis/")
        self.assertIn(resp.status_code, (401, 403))

    def test_fail_closed_default_blocks_anon(self):
        """With no env configured (DEBUG off, DASHBOARD_REQUIRE_AUTH
        unset), settings resolve the flag to True — the bare test run
        itself is the production-ish case, so no override here."""
        import os
        if os.environ.get("DASHBOARD_REQUIRE_AUTH", "").strip() or \
                os.environ.get("DJANGO_DEBUG", "").lower() in ("true", "1", "yes"):
            self.skipTest("ambient env overrides the fail-closed default")
        from django.conf import settings
        self.assertTrue(settings.DASHBOARD_REQUIRE_AUTH)
        resp = self.c.get("/api/executive/kpis/")
        self.assertIn(resp.status_code, (401, 403))

    def test_flag_on_still_allows_health(self):
        """Liveness must stay open even with auth required —
        the LB needs to probe without a token (DASH-E00-A05)."""
        with override_settings(DASHBOARD_REQUIRE_AUTH=True):
            resp = self.c.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
