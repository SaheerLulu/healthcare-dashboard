"""Timezone-correct calendar fields in the pipeline (security audit #9).

With USE_TZ=True the ORM returns aware UTC datetimes; deriving
``.date()`` / ``.hour`` directly put every sale between 00:00 and 05:29
IST on the previous day (and the wrong month/fiscal year at boundaries).
local_date/local_hour must convert to the project timezone
(Asia/Kolkata) first, while tolerating naive datetimes and plain dates
from the upstream SQLite.
"""
from datetime import date, datetime, timezone as dt_timezone

from django.test import TestCase

from pipeline.inventory_pipeline import get_fiscal_year, local_date, local_hour


class LocalDateTests(TestCase):
    def test_aware_utc_evening_is_next_day_ist(self):
        # 23:00 UTC = 04:30 IST the NEXT day.
        dt = datetime(2026, 6, 11, 23, 0, tzinfo=dt_timezone.utc)
        self.assertEqual(local_date(dt), date(2026, 6, 12))
        self.assertEqual(local_hour(dt), 4)

    def test_aware_utc_1831_crosses_midnight_ist(self):
        # 18:31 UTC = 00:01 IST next day — the boundary minute.
        dt = datetime(2026, 3, 31, 18, 31, tzinfo=dt_timezone.utc)
        self.assertEqual(local_date(dt), date(2026, 4, 1))
        # ...which also flips the fiscal year at the FY boundary.
        self.assertEqual(get_fiscal_year(local_date(dt)), "2026-27")

    def test_aware_utc_daytime_is_same_day(self):
        dt = datetime(2026, 6, 11, 10, 0, tzinfo=dt_timezone.utc)  # 15:30 IST
        self.assertEqual(local_date(dt), date(2026, 6, 11))
        self.assertEqual(local_hour(dt), 15)

    def test_naive_datetime_passes_through_as_wall_clock(self):
        dt = datetime(2026, 6, 11, 23, 0)  # naive — assumed already local
        self.assertEqual(local_date(dt), date(2026, 6, 11))
        self.assertEqual(local_hour(dt), 23)

    def test_plain_date_and_none_pass_through(self):
        self.assertEqual(local_date(date(2026, 6, 11)), date(2026, 6, 11))
        self.assertIsNone(local_date(None))
        self.assertEqual(local_hour(date(2026, 6, 11)), 0)
        self.assertEqual(local_hour(None), 0)
