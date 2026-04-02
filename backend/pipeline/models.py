"""Pipeline state tracking models for incremental ETL."""
from django.db import models


class PipelineLog(models.Model):
    pipeline_type = models.CharField(max_length=30, db_index=True)
    last_synced_id = models.IntegerField(default=0)
    last_run_at = models.DateTimeField(auto_now=True)
    records_processed = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='success')
    error_message = models.TextField(blank=True)
    duration_seconds = models.FloatField(default=0)

    class Meta:
        db_table = 'pipeline_log'

    def __str__(self):
        return f"{self.pipeline_type} - {self.status} ({self.records_processed} records)"

    @classmethod
    def get_last_id(cls, pipeline_type):
        log = cls.objects.filter(
            pipeline_type=pipeline_type, status='success'
        ).order_by('-last_run_at').first()
        return log.last_synced_id if log else 0


class PipelineError(models.Model):
    pipeline_type = models.CharField(max_length=30, db_index=True)
    source_id = models.IntegerField()
    error_message = models.TextField()
    traceback = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pipeline_error'

    def __str__(self):
        return f"{self.pipeline_type} #{self.source_id} - {'resolved' if self.resolved else 'unresolved'}"
