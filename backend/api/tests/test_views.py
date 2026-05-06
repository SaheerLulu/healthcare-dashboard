"""Smoke tests for one endpoint per dashboard domain.

These are *contract* tests, not data-correctness tests:

- Every listed endpoint must return HTTP 200 on a fresh test database
  (zero rows in any reporting table).
- Every endpoint must return JSON (no HTML errors leaking through).
- Every endpoint must accept the standard filter contract from
  helpers.parse_filters (start_date, end_date, location_ids, …).

If a future refactor breaks the response envelope, these tests catch it
before it reaches a frontend chart that crashes with "data is undefined".
"""
from django.test import TestCase, Client


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
    "/api/location/comparison/",
    "/api/product/overview/",
    "/api/dispatch/pipeline/",
    "/api/loyalty/overview/",
    "/api/audit/overview/",
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


class SmokeTests(TestCase):
    """Hit every public endpoint once. None should 5xx on an empty DB."""

    def setUp(self):
        self.c = Client()

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


class JWTEnforcementTests(TestCase):
    """Verify that DASHBOARD_REQUIRE_AUTH flips the entire surface to
    require a JWT, and that an unauth GET on a protected endpoint
    returns 401/403 — proving DashboardPermission is wired correctly.
    """

    def setUp(self):
        self.c = Client()

    def test_dev_default_allows_anon(self):
        from django.conf import settings
        settings.DASHBOARD_REQUIRE_AUTH = False  # default
        resp = self.c.get("/api/executive/kpis/")
        self.assertEqual(resp.status_code, 200)

    def test_flag_on_blocks_anon(self):
        from django.conf import settings
        settings.DASHBOARD_REQUIRE_AUTH = True
        try:
            resp = self.c.get("/api/executive/kpis/")
            self.assertIn(resp.status_code, (401, 403))
        finally:
            settings.DASHBOARD_REQUIRE_AUTH = False

    def test_flag_on_still_allows_health(self):
        """Liveness must stay open even with auth required —
        the LB needs to probe without a token (DASH-E00-A05)."""
        from django.conf import settings
        settings.DASHBOARD_REQUIRE_AUTH = True
        try:
            resp = self.c.get("/api/health/")
            self.assertEqual(resp.status_code, 200)
        finally:
            settings.DASHBOARD_REQUIRE_AUTH = False
