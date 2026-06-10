"""Single-instance lock shared by every pipeline entry point.

The report tables have no unique constraint on (source_type, source_id,
source_line_id) and the syncs are not transactional, so two concurrent
writers reading the same watermark would double-insert the same incremental
window. EVERY entry point (cron's scheduled_pipeline, manual
run_all_pipelines / run_inventory_pipeline / run_financial_pipeline, and the
API trigger thread) must hold this flock for the duration of the run.
"""
import errno
import fcntl
from contextlib import contextmanager
from pathlib import Path

from django.conf import settings


class PipelineLocked(Exception):
    """Another pipeline run currently holds the lock."""


@contextmanager
def pipeline_lock(lock_file=None):
    """Exclusive non-blocking flock; raises PipelineLocked when contended."""
    lock_path = Path(lock_file or (Path(settings.BASE_DIR) / '.pipeline.lock'))
    fh = open(lock_path, 'w')
    try:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as exc:
        fh.close()
        if exc.errno in (errno.EAGAIN, errno.EWOULDBLOCK):
            raise PipelineLocked(str(lock_path))
        raise
    try:
        yield
    finally:
        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        fh.close()
