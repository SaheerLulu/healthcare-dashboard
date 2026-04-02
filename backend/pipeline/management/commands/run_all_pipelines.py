from django.core.management.base import BaseCommand
from pipeline.inventory_pipeline import InventoryPipeline
from pipeline.financial_pipeline import FinancialPipeline


class Command(BaseCommand):
    help = 'Run both inventory and financial data pipelines'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full', action='store_true',
            help='Full refresh – delete existing data and rebuild from scratch',
        )

    def handle(self, *args, **options):
        full = options['full']

        self.stdout.write("Running inventory pipeline...")
        inv_results = InventoryPipeline().run_all(full=full)
        self.stdout.write(self.style.SUCCESS(
            f"  Inventory: {inv_results['total']} records in {inv_results['duration_seconds']}s"
        ))

        self.stdout.write("Running financial pipeline...")
        fin_results = FinancialPipeline().run_all(full=full)
        self.stdout.write(self.style.SUCCESS(
            f"  Financial: {fin_results['total']} records in {fin_results['duration_seconds']}s"
        ))

        total = inv_results['total'] + fin_results['total']
        self.stdout.write(self.style.SUCCESS(f"\nAll pipelines complete: {total} total records"))
