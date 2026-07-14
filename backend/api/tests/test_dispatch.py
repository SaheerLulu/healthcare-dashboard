"""Regression test for /api/dispatch/detail/ 500 on mixed null dates.

Synthesised dispatch rows derive dispatch_date from B2B sale_date, which
is nullable; sorting with a '' sentinel mixed str and date and raised
TypeError. The fix uses date.min so all keys are dates.
"""
from datetime import date

from django.test import TestCase

from api.dispatch import _dispatch_sort_key


class DispatchSortKeyTests(TestCase):
    def test_mixed_none_and_dates_sort_without_typeerror(self):
        rows = [
            {'dispatch_date': date(2026, 6, 1)},
            {'dispatch_date': None},
            {'dispatch_date': date(2026, 5, 1)},
            {'dispatch_date': None},
        ]
        ordered = sorted(rows, key=_dispatch_sort_key, reverse=True)
        self.assertEqual(
            [r['dispatch_date'] for r in ordered],
            [date(2026, 6, 1), date(2026, 5, 1), None, None],
        )

    def test_none_maps_to_date_min(self):
        self.assertEqual(_dispatch_sort_key({'dispatch_date': None}), date.min)
        self.assertEqual(
            _dispatch_sort_key({'dispatch_date': date(2026, 1, 2)}),
            date(2026, 1, 2),
        )
