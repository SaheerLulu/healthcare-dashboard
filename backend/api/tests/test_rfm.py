"""RFM endpoint contract pin (perf pass 2026-06-12).

The RFM computation was reworked to stop materialising every customer
into response dicts (segments counted in a light pass; only the
top-`limit` rows by revenue are enriched, via heapq.nlargest which is
stable-equivalent to the previous full sort). This suite pins the
positional quintile scores, segment labels, revenue ordering and the
"segments cover ALL customers even when `limit` trims the rows"
contract so the response stays byte-identical.
"""
from datetime import date

from django.test import TestCase, Client, override_settings

from reports.models import ReportSales


@override_settings(DASHBOARD_REQUIRE_AUTH=False)
class RFMTests(TestCase):
    PARAMS = {"start_date": "2026-01-01", "end_date": "2026-06-01"}

    @classmethod
    def setUpTestData(cls):
        # 5 customers, strictly decreasing R/F/M so positional quintiles
        # are deterministic: customer i gets r=f=m=(6-i).
        spec = [
            # (customer_id, orders, last_sale)
            (1, 5, date(2026, 6, 1)),   # recency 0  -> 555 Champions
            (2, 4, date(2026, 5, 22)),  # recency 10 -> 444 Hibernating
            (3, 3, date(2026, 5, 12)),  # recency 20 -> 333 Hibernating
            (4, 2, date(2026, 5, 2)),   # recency 30 -> 222 Hibernating
            (5, 1, date(2026, 4, 22)),  # recency 40 -> 111 Lost
        ]
        line_id = 0
        for cid, orders, last_sale in spec:
            for o in range(orders):
                line_id += 1
                ReportSales.objects.create(
                    source_id=cid * 100 + o, source_line_id=line_id,
                    source_type="pos", sale_date=last_sale,
                    sale_month=last_sale.strftime("%Y-%m"),
                    fiscal_year="2026-27", location_id=1, channel="POS",
                    customer_id=cid, customer_name=f"Customer {cid}",
                    customer_type="Retail", product_id=1,
                    line_total=1000,
                )

    def setUp(self):
        self.c = Client()

    def test_scores_segments_and_ordering(self):
        data = self.c.get("/api/loyalty/rfm/", self.PARAMS).json()
        self.assertEqual(data["totals"]["count"], 5)
        rows = data["customers"]
        self.assertEqual([r["customer_id"] for r in rows], [1, 2, 3, 4, 5])
        self.assertEqual(
            [r["rfm_code"] for r in rows], ["555", "444", "333", "222", "111"])
        self.assertEqual(
            [r["segment"] for r in rows],
            ["Champions", "Hibernating", "Hibernating", "Hibernating", "Lost"])
        self.assertEqual([r["revenue"] for r in rows],
                         [5000.0, 4000.0, 3000.0, 2000.0, 1000.0])
        self.assertEqual([r["recency_days"] for r in rows], [0, 10, 20, 30, 40])
        self.assertEqual(rows[0]["last_sale"], "2026-06-01")
        self.assertEqual(
            data["segments"],
            [
                {"segment": "Champions", "count": 1},
                {"segment": "Loyal", "count": 0},
                {"segment": "Potential", "count": 0},
                {"segment": "At-Risk", "count": 0},
                {"segment": "Lost", "count": 1},
                {"segment": "Hibernating", "count": 3},
            ],
        )

    def test_limit_trims_rows_but_not_totals_or_segments(self):
        data = self.c.get("/api/loyalty/rfm/", {**self.PARAMS, "limit": "2"}).json()
        self.assertEqual(data["totals"]["count"], 5)
        self.assertEqual([r["customer_id"] for r in data["customers"]], [1, 2])
        self.assertEqual(sum(s["count"] for s in data["segments"]), 5)
