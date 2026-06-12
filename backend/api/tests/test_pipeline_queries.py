"""Pipeline query-efficiency regression tests (perf pass 2026-06-12).

refresh_inventory_snapshot runs on EVERY incremental sync (every 15 min).
It used to fire one ReportSales revenue aggregate per stock-quant row —
an N+1 that scaled with inventory size. The fix precomputes a fifth
grouped map (revenue-90d per product) alongside the existing four, so
the rebuild must now issue a CONSTANT number of queries regardless of
quant count.

source_models are managed=False (they proxy the upstream pharmacy app's
tables), so the test database does not create them; this suite creates
just the three tables the snapshot reads via schema_editor.
"""
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from pipeline.inventory_pipeline import InventoryPipeline
from reports.models import ReportInventory
from source_models.models import LocationRO, ProductRO, StockQuantRO

NOW = datetime(2026, 6, 1, 12, 0, tzinfo=dt_timezone.utc)


class SnapshotQueryCountTests(TestCase):
    @classmethod
    def setUpClass(cls):
        # Create the unmanaged source tables BEFORE the class atomics open
        # so the DDL isn't rolled back mid-suite; dropped in tearDownClass.
        with connection.schema_editor() as editor:
            for model in (LocationRO, ProductRO, StockQuantRO):
                editor.create_model(model)
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        with connection.schema_editor() as editor:
            for model in (StockQuantRO, ProductRO, LocationRO):
                editor.delete_model(model)

    def setUp(self):
        self.loc = LocationRO.objects.create(
            name='Main Store', complete_name='HQ/Main Store', usage='internal',
        )
        self.products = [
            ProductRO.objects.create(
                name=f'PARACETAMOL TABLET {i}', created_at=NOW, location=self.loc,
            )
            for i in range(3)
        ]

    def _seed_quants(self, n):
        StockQuantRO.objects.all().delete()
        StockQuantRO.objects.bulk_create([
            StockQuantRO(
                product=self.products[i % len(self.products)],
                location=self.loc,
                quantity=10 + i,
                reserved_quantity=0,
                lot_name=f'LOT{i}',
                expiry_month='2027-12',
                mrp=Decimal('100.00'),
                purchase_rate=Decimal('70.00'),
                created_at=NOW,
                updated_at=NOW,
            )
            for i in range(n)
        ])

    def test_snapshot_queries_constant_in_quant_count(self):
        pipeline = InventoryPipeline()

        # Warm-up run so both measured runs hit the same PipelineLog
        # update_or_create branch (UPDATE, not INSERT).
        self._seed_quants(1)
        pipeline.refresh_inventory_snapshot()

        self._seed_quants(4)
        with CaptureQueriesContext(connection) as small:
            count_small = pipeline.refresh_inventory_snapshot()

        self._seed_quants(12)
        with CaptureQueriesContext(connection) as large:
            count_large = pipeline.refresh_inventory_snapshot()

        self.assertEqual(count_small, 4)
        self.assertEqual(count_large, 12)
        self.assertEqual(ReportInventory.objects.count(), 12)
        self.assertEqual(
            len(small.captured_queries), len(large.captured_queries),
            "snapshot rebuild query count must not scale with quant count:\n"
            f"4 quants -> {len(small.captured_queries)} queries, "
            f"12 quants -> {len(large.captured_queries)} queries",
        )
