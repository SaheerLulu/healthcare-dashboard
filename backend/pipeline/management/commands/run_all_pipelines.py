from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Max, Q

from pipeline.inventory_pipeline import InventoryPipeline
from pipeline.financial_pipeline import FinancialPipeline
from pipeline.locking import PipelineLocked, pipeline_lock
from pipeline.models import PipelineLog, PipelineError
from reports.models import (
    ReportSales, ReportSalesReturns, ReportPurchases,
    ReportFinancial, ReportGST, ReportTDS,
)
from source_models.models import (
    POSOrderRO, B2BSalesOrderRO, SalesReturnRO,
    PurchaseOrderRO, PurchaseReturnRO,
    JournalEntryRO, GSTR1EntryRO, GSTR3BSummaryRO, GSTR2BEntryRO,
    ITCReconciliationRO, RCMEntryRO, TDSDeductionRO,
)

RESYNC_MESSAGE = 'resync window re-pull'


class Command(BaseCommand):
    help = 'Run both inventory and financial data pipelines'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full', action='store_true',
            help='Full refresh – delete existing data and rebuild from scratch',
        )
        parser.add_argument(
            '--resync-days', type=int, default=None, metavar='N',
            help='Re-pull a trailing window: delete report rows dated within '
                 'the last N days, reset each watermark to the max remaining '
                 'source id, and queue the affected source ids for re-pull. '
                 'Absorbs upstream edits without a full refresh.',
        )

    # Dated report tables: (report model, subset filter, report date filter,
    # pipeline_type, report source-id column, qualified source queryset,
    # source-side window Q). report_inventory is a full-rebuild snapshot
    # every run — no resync needed.
    @staticmethod
    def _resync_specs(cutoff):
        month = cutoff.strftime('%Y-%m')
        gst_sources = {
            'gstr1': GSTR1EntryRO.objects.filter(is_active=True),
            'gstr3b': GSTR3BSummaryRO.objects.all(),
            'gstr2b': GSTR2BEntryRO.objects.all(),
            'itc': ITCReconciliationRO.objects.all(),
            'rcm': RCMEntryRO.objects.all(),
        }
        gst = [
            (ReportGST, {'source_table': t}, {'period__gte': month}, t,
             'source_id', qs, Q(period__gte=month))
            for t, qs in gst_sources.items()
        ]
        return [
            (ReportSales, {'source_type': 'pos'}, {'sale_date__gte': cutoff},
             'pos_sales', 'source_id',
             POSOrderRO.objects.filter(status__in=['confirmed', 'completed']),
             Q(sale_date__date__gte=cutoff)),
            (ReportSales, {'source_type': 'b2b'}, {'sale_date__gte': cutoff},
             'b2b_sales', 'source_id',
             B2BSalesOrderRO.objects.filter(status__in=['confirmed', 'delivered', 'invoiced']),
             Q(sale_date__gte=cutoff) | Q(sale_date__isnull=True, created_at__date__gte=cutoff)),
            (ReportSalesReturns, {}, {'return_date__gte': cutoff},
             'sales_returns', 'source_id',
             SalesReturnRO.objects.filter(status__in=['confirmed', 'completed']),
             Q(return_date__date__gte=cutoff)),
            (ReportPurchases, {'is_return': False}, {'bill_date__gte': cutoff},
             'purchases', 'source_id',
             PurchaseOrderRO.objects.filter(state__in=['confirmed', 'done', 'approved']),
             Q(bill_date__gte=cutoff)),
            (ReportPurchases, {'is_return': True}, {'bill_date__gte': cutoff},
             'purchase_returns', 'source_id',
             PurchaseReturnRO.objects.filter(status__in=['confirmed', 'completed', 'approved']),
             Q(return_date__date__gte=cutoff)),
            (ReportFinancial, {}, {'entry_date__gte': cutoff},
             'journal_entries', 'source_entry_id',
             JournalEntryRO.objects.filter(is_posted=True),
             Q(date__gte=cutoff)),
            *gst,
            (ReportTDS, {}, {'transaction_date__gte': cutoff},
             'tds', 'source_id',
             TDSDeductionRO.objects.all(),
             Q(transaction_date__gte=cutoff)),
        ]

    def _resync_window(self, days):
        """Delete the trailing report window and queue it for re-pull.

        Source ids are NOT guaranteed date-monotonic (e.g. journal entries
        can be posted out of date order), so resetting the watermark to the
        max remaining source id is not enough: window ids at or below the
        new watermark are queued as unresolved PipelineError rows, which the
        per-type syncs retry (delete + rebuild by source id) on the very
        next run. Ids above the watermark are covered by the normal
        incremental window. Source rows that vanished or no longer qualify
        upstream simply stay deleted.
        """
        cutoff = date.today() - timedelta(days=days)
        self.stdout.write(f"Resync window: deleting report rows dated >= {cutoff}")
        for model, subset, date_filter, ptype, id_col, src_qs, src_window in (
                self._resync_specs(cutoff)):
            window_qs = model.objects.filter(**subset, **date_filter)
            report_ids = set(window_qs.values_list(id_col, flat=True))
            deleted, _ = window_qs.delete()
            watermark_qs = model.objects.filter(**subset)
            if ptype == 'tds':
                # Synthesized 194Q rows reuse PURCHASE ids as source_id
                # (source_type='purchase'); including them would poison the
                # real TDSDeduction watermark and silently skip future real
                # TDS rows whose ids fall at or below a synthetic id.
                watermark_qs = watermark_qs.exclude(source_type='purchase')
            watermark = watermark_qs.aggregate(m=Max(id_col))['m'] or 0
            source_ids = set(
                src_qs.filter(src_window).values_list('id', flat=True))
            candidates = {
                i for i in (report_ids | source_ids) if i and i <= watermark
            }
            # Re-pull only ids that still qualify upstream.
            requeue = set(
                src_qs.filter(id__in=candidates).values_list('id', flat=True))
            for sid in sorted(requeue):
                PipelineError.objects.get_or_create(
                    pipeline_type=ptype, source_id=sid, resolved=False,
                    defaults={'error_message': RESYNC_MESSAGE, 'traceback': ''},
                )
            PipelineLog.objects.update_or_create(
                pipeline_type=ptype,
                defaults={'last_synced_id': watermark},
            )
            self.stdout.write(
                f"  {ptype}: deleted {deleted} rows, watermark -> {watermark}, "
                f"requeued {len(requeue)} source ids"
            )

    def handle(self, *args, **options):
        full = options['full']
        resync_days = options['resync_days']

        if resync_days is not None:
            if resync_days < 1:
                raise CommandError('--resync-days must be a positive integer')
            if full:
                raise CommandError('--resync-days and --full are mutually exclusive')

        # Same lock as scheduled_pipeline — a manual run (especially
        # --resync-days/--full, which delete rows) racing the cron run
        # would double-insert the shared incremental window.
        try:
            with pipeline_lock():
                self._run(full, resync_days)
        except PipelineLocked:
            raise CommandError(
                'Another pipeline run is in progress (.pipeline.lock held) — '
                'retry once it finishes.'
            )

    def _run(self, full, resync_days):
        if resync_days is not None:
            self._resync_window(resync_days)

        self.stdout.write("Running inventory pipeline...")
        inv_results = InventoryPipeline().run_all(full=full)
        self.stdout.write(self.style.SUCCESS(
            f"  Inventory: {inv_results['total']} records in {inv_results['duration_seconds']}s"
            f" ({inv_results.get('errors', 0)} errors)"
        ))

        self.stdout.write("Running financial pipeline...")
        fin_results = FinancialPipeline().run_all(full=full)
        self.stdout.write(self.style.SUCCESS(
            f"  Financial: {fin_results['total']} records in {fin_results['duration_seconds']}s"
            f" ({fin_results.get('errors', 0)} errors)"
        ))

        total = inv_results['total'] + fin_results['total']
        errors = inv_results.get('errors', 0) + fin_results.get('errors', 0)
        if errors:
            self.stdout.write(self.style.WARNING(
                f"\nAll pipelines complete with {errors} record error(s): "
                f"{total} total records (see pipeline_error table)"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"\nAll pipelines complete: {total} total records"
            ))
