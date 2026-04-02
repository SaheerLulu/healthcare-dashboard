from django.core.management.base import BaseCommand
from pipeline.financial_pipeline import FinancialPipeline


class Command(BaseCommand):
    help = 'Run the financial data pipeline to populate reporting tables'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full', action='store_true',
            help='Full refresh – delete existing data and rebuild from scratch',
        )

    def handle(self, *args, **options):
        pipeline = FinancialPipeline()
        results = pipeline.run_all(full=options['full'])

        self.stdout.write(self.style.SUCCESS(
            f"Financial pipeline complete in {results['duration_seconds']}s:"
        ))
        for key, val in results.items():
            if key not in ('total', 'duration_seconds'):
                self.stdout.write(f"  {key}: {val} records")
        self.stdout.write(self.style.SUCCESS(f"  Total: {results['total']} records"))
