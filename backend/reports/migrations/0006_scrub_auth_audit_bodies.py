"""Scrub credential payloads already persisted to audit_log.

AuditMiddleware used to store every non-GET /api/* body in
``AuditLog.body_summary`` with key-name-only masking, so
``POST /api/auth/login/`` rows contain cleartext passwords and
``POST /api/auth/refresh/`` rows contain live refresh tokens — under an
8-year retention. The middleware no longer records /api/auth/* bodies at
all; this migration redacts what's already on disk.

Irreversible by design: the whole point is that the original payloads
are gone.
"""
from django.db import migrations


def scrub_auth_bodies(apps, schema_editor):
    AuditLog = apps.get_model('reports', 'AuditLog')
    AuditLog.objects.filter(path__startswith='/api/auth/').exclude(
        body_summary='',
    ).update(body_summary='[redacted]')


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0005_alter_reportfinancial_account_code_and_more'),
    ]

    operations = [
        migrations.RunPython(scrub_auth_bodies, migrations.RunPython.noop),
    ]
