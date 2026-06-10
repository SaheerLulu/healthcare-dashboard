from django.core.management.base import BaseCommand, CommandError
from pipeline.locking import PipelineLocked, pipeline_lock
from pipeline.inventory_pipeline import InventoryPipeline


class Command(BaseCommand):
    help = 'Run the inventory data pipeline to populate reporting tables'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full', action='store_true',
            help='Full refresh – delete existing data and rebuild from scratch',
        )

    def handle(self, *args, **options):
        try:
            with pipeline_lock():
                results = InventoryPipeline().run_all(full=options['full'])
        except PipelineLocked:
            raise CommandError(
                'Another pipeline run is in progress (.pipeline.lock held) — '
                'retry once it finishes.'
            )

        self.stdout.write(self.style.SUCCESS(
            f"Inventory pipeline complete in {results['duration_seconds']}s:"
        ))
        for key, val in results.items():
            if key not in ('total', 'duration_seconds', 'errors'):
                self.stdout.write(f"  {key}: {val} records")
        self.stdout.write(self.style.SUCCESS(f"  Total: {results['total']} records"))
        if results.get('errors'):
            self.stdout.write(self.style.WARNING(
                f"  Errors: {results['errors']} record(s) failed (see pipeline_error)"
            ))
