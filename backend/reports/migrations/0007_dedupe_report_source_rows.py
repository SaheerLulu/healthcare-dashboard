"""Dedupe report rows on their natural source tuples.

Concurrent pipeline writers (scheduler container + API trigger) used to
share no cross-container lock, so the same incremental window could be
inserted twice. 0008 adds UniqueConstraints on the natural source tuples;
this migration first deletes the duplicates, keeping the row with the
highest id (the latest insert) for each tuple.

ReportInventory and ReportTDS are intentionally not deduped/constrained —
see the comments on their model Meta (no clean natural key).
"""
from django.db import migrations
from django.db.models import Count, Max


DEDUPE_SPECS = [
    ('ReportSales', ('source_type', 'source_id', 'source_line_id')),
    ('ReportSalesReturns', ('source_id', 'source_line_id')),
    ('ReportPurchases', ('is_return', 'source_id', 'source_line_id')),
    ('ReportFinancial', ('source_entry_id', 'source_line_id')),
    ('ReportGST', ('source_table', 'source_id')),
]


def dedupe(apps, schema_editor):
    for model_name, fields in DEDUPE_SPECS:
        model = apps.get_model('reports', model_name)
        dupes = (
            model.objects.values(*fields)
            .annotate(n=Count('id'), keep=Max('id'))
            .filter(n__gt=1)
        )
        for d in dupes.iterator():
            key = {f: d[f] for f in fields}
            model.objects.filter(**key).exclude(id=d['keep']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0006_scrub_auth_audit_bodies'),
    ]

    operations = [
        migrations.RunPython(dedupe, migrations.RunPython.noop),
    ]
