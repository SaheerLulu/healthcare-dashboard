"""
Cron-friendly dashboard ETL (DRILLTHROUGH_DESIGN §6).

Runs the inventory pipeline then the financial pipeline incrementally.
Holds the shared pipeline lock (Postgres advisory lock on deployed
stacks, flock on SQLite — see pipeline.locking) so two cron firings
5 min apart won't stack: if a previous run is still in progress, this
one exits with status 0 and a log line. Missed runs are simply absorbed
by the next incremental window — the per-type PipelineLog watermarks
make that safe.

Recommended cron:
    */15 * * * * cd /app/backend && .venv/bin/python manage.py scheduled_pipeline \\
                    >> /var/log/dashboard-pipeline.log 2>&1
"""
import sys

from django.core.management.base import BaseCommand

from pipeline.inventory_pipeline import InventoryPipeline
from pipeline.financial_pipeline import FinancialPipeline
from pipeline.locking import PipelineLocked, pipeline_lock


class Command(BaseCommand):
    help = 'Run incremental inventory + financial pipelines. Idempotent. Cron-safe.'

    def add_arguments(self, parser):
        parser.add_argument('--lock-file', default=None,
                            help='Path to lock file (default <BASE_DIR>/.pipeline.lock)')

    def handle(self, *args, **opts):
        try:
            with pipeline_lock(opts['lock_file']):
                inv = InventoryPipeline().run_all(full=False)
                fin = FinancialPipeline().run_all(full=False)
                errors = inv.get('errors', 0) + fin.get('errors', 0)
                summary = (
                    f"inventory={inv['total']} records ({inv['duration_seconds']}s), "
                    f"financial={fin['total']} records ({fin['duration_seconds']}s)"
                )
                if errors:
                    self.stdout.write(self.style.WARNING(
                        f'scheduled_pipeline: partial — {summary}; '
                        f'{errors} record error(s), see pipeline_error.'))
                else:
                    self.stdout.write(self.style.SUCCESS(
                        f'scheduled_pipeline: ok — {summary}'))
        except PipelineLocked:
            self.stdout.write(self.style.WARNING(
                'scheduled_pipeline: previous run still active — skipping.'))
            sys.exit(0)
