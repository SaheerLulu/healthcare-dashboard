"""Unit tests for api.helpers — the central filter/growth-pct logic.

Why these tests exist: DASH-E00-A10 (Definition of Done) requires unit
tests for non-trivial helpers, and ``parse_filters`` is the single
choke-point for query-param sanitisation across every dashboard
endpoint. A regression here cascades to every chart on every page.

Run from backend/:
    python3 manage.py test api.tests
"""
from datetime import date, timedelta
from unittest.mock import MagicMock

from django.test import TestCase

from api.helpers import (
    apply_common_filters,
    apply_common_filters_range,
    apply_financial_filters,
    growth_pct,
    parse_filters,
    prior_period_range,
)


def _request_with(params):
    req = MagicMock()
    req.query_params = params
    return req


class GrowthPctTests(TestCase):
    def test_simple_positive_growth(self):
        self.assertEqual(growth_pct(120, 100), 20.0)

    def test_simple_negative_growth(self):
        self.assertEqual(growth_pct(80, 100), -20.0)

    def test_zero_previous_returns_zero(self):
        # See helpers docstring: growth from a zero base is undefined; we
        # return 0 rather than raise so dashboards don't crash on a
        # cold-start period.
        self.assertEqual(growth_pct(100, 0), 0.0)

    def test_clamps_extreme_positive(self):
        # 100 vs 1 = 9 900 % which is misleading; clamp at 500.
        self.assertEqual(growth_pct(100, 1), 500.0)

    def test_clamps_extreme_negative(self):
        self.assertEqual(growth_pct(1, 100), -99.0)
        self.assertEqual(growth_pct(0, 100), -100.0)
        # When current is so small the percentage drops below -500, clamp.
        # current=-499, previous=1 → (-500)/1 * 100 = -50000% → clamped.
        self.assertEqual(growth_pct(-499, 1), -500.0)

    def test_none_inputs(self):
        self.assertEqual(growth_pct(None, 100), -100.0)
        self.assertEqual(growth_pct(100, None), 0.0)


class PriorPeriodRangeTests(TestCase):
    def test_one_week_window(self):
        f = {"start_date": "2026-04-08", "end_date": "2026-04-14"}
        prev_start, prev_end = prior_period_range(f)
        self.assertEqual(prev_start, date(2026, 4, 1))
        self.assertEqual(prev_end, date(2026, 4, 7))

    def test_single_day_window(self):
        f = {"start_date": "2026-05-06", "end_date": "2026-05-06"}
        prev_start, prev_end = prior_period_range(f)
        self.assertEqual(prev_end, date(2026, 5, 5))
        self.assertEqual(prev_start, date(2026, 5, 5))


class ParseFiltersDateTests(TestCase):
    def test_default_six_month_window_when_unset(self):
        f = parse_filters(_request_with({}))
        end = date.fromisoformat(f["end_date"])
        start = date.fromisoformat(f["start_date"])
        self.assertEqual(end, date.today())
        # ~180 days back, allow ±1 day for edge cases
        delta = (end - start).days
        self.assertTrue(179 <= delta <= 181, f"unexpected default span {delta}")

    def test_invalid_date_falls_back(self):
        f = parse_filters(_request_with({"start_date": "2026-13-40", "end_date": "garbage"}))
        # Both fall back without raising
        self.assertEqual(f["end_date"], date.today().isoformat())

    def test_reverse_range_is_normalised(self):
        f = parse_filters(_request_with({"start_date": "2026-12-31", "end_date": "2026-01-01"}))
        self.assertLess(f["start_date"], f["end_date"])

    def test_filters_passed_through(self):
        f = parse_filters(_request_with({
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "location_ids": "1,2,3",
            "category": "Antibiotic,Tonic",
            "channel": "POS",
            "payment_method": "Cash,UPI",
            "limit": "20",
        }))
        self.assertEqual(f["location_ids"], [1, 2, 3])
        self.assertEqual(f["categories"], ["Antibiotic", "Tonic"])
        self.assertEqual(f["channel"], "POS")
        self.assertEqual(f["payment_methods"], ["Cash", "UPI"])
        self.assertEqual(f["limit"], 20)

    def test_invalid_location_id_silently_dropped(self):
        f = parse_filters(_request_with({"location_id": "not-a-number"}))
        self.assertNotIn("location_id", f)

    def test_invalid_limit_falls_back(self):
        f = parse_filters(_request_with({"limit": "lots"}))
        self.assertEqual(f["limit"], 10)


class ApplyCommonFiltersTests(TestCase):
    """Verify queryset filter chaining — uses Django ORM with no DB.

    These tests don't actually run SQL; they inspect the lazily-built
    queryset's ``query.where`` to confirm the filter was applied. Cheap
    way to lock down the contract without test fixtures.
    """

    def test_date_range_always_applied(self):
        from reports.models import ReportSales
        qs = ReportSales.objects.all()
        f = {
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
        }
        out = apply_common_filters(qs, f)
        sql = str(out.query)
        self.assertIn("sale_date", sql)
        self.assertIn("2026-01-01", sql)
        self.assertIn("2026-01-31", sql)

    def test_categories_list_used_when_present(self):
        from reports.models import ReportSales
        qs = ReportSales.objects.all()
        f = {
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "categories": ["A", "B"],
        }
        out = apply_common_filters(qs, f)
        sql = str(out.query)
        self.assertIn("product_category", sql)


class ApplyFinancialFiltersTests(TestCase):
    def test_uses_entry_date_field(self):
        from reports.models import ReportFinancial
        qs = ReportFinancial.objects.all()
        f = {"start_date": "2026-01-01", "end_date": "2026-01-31"}
        out = apply_financial_filters(qs, f)
        self.assertIn("entry_date", str(out.query))


class ApplyCommonFiltersRangeTests(TestCase):
    """Used for prior-period comparison — explicit start/end override."""

    def test_explicit_range_overrides_filter_dates(self):
        from reports.models import ReportSales
        qs = ReportSales.objects.all()
        f = {
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
        }
        out = apply_common_filters_range(qs, f, "2026-03-01", "2026-03-31")
        sql = str(out.query)
        self.assertIn("2026-03-01", sql)
        self.assertIn("2026-03-31", sql)
        self.assertNotIn("2026-04-30", sql)
