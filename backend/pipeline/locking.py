"""Single-instance lock shared by every pipeline entry point.

The syncs are not transactional, so two concurrent writers reading the
same watermark would double-insert the same incremental window. EVERY
entry point (the scheduler container's run_all_pipelines loop, manual
run_all_pipelines / run_inventory_pipeline / run_financial_pipeline /
scheduled_pipeline, and the API trigger thread) must hold this lock for
the duration of the run.

Backend selection
-----------------
- PostgreSQL (any deployed stack): a session-scoped advisory lock
  (``pg_try_advisory_lock``) on a fixed key. The deploy runs MULTIPLE
  containers against one database — a ``scheduler`` looping
  run_all_pipelines plus gunicorn workers serving POST
  /api/pipeline/trigger/ — and a flock on a container-local file cannot
  exclude across containers. The advisory lock lives in the shared
  database server, so it can. If the holding session dies, Postgres
  releases the lock automatically.
- SQLite (local dev / single-host compose): the original non-blocking
  ``flock`` on a lock file. All writers share one filesystem there, so
  file locking is sufficient.

Both paths are non-blocking: a contended lock raises ``PipelineLocked``
and callers surface the existing "already running" signal.
"""
import errno
import fcntl
from contextlib import contextmanager
from pathlib import Path

from django.conf import settings
from django.db import connection

# Fixed application-wide advisory-lock key — zlib.crc32(b'healthcare-
# dashboard-pipeline'). Hardcoded so the value is greppable in pg_locks
# (objid) and can never drift between releases. Must not collide with
# advisory keys of other apps sharing the database server.
PG_ADVISORY_LOCK_KEY = 3278292222


class PipelineLocked(Exception):
    """Another pipeline run currently holds the lock."""


@contextmanager
def _postgres_lock():
    """Non-blocking session-level advisory lock on the default DB."""
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_try_advisory_lock(%s)', [PG_ADVISORY_LOCK_KEY])
        acquired = bool(cursor.fetchone()[0])
    if not acquired:
        raise PipelineLocked(f'pg_advisory_lock {PG_ADVISORY_LOCK_KEY}')
    try:
        yield
    finally:
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_unlock(%s)', [PG_ADVISORY_LOCK_KEY])
        except Exception:
            # Connection already gone — the session-scoped lock died
            # with it, so there is nothing left to release.
            pass


@contextmanager
def _file_lock(lock_file=None):
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


@contextmanager
def pipeline_lock(lock_file=None):
    """Cross-writer pipeline mutex; raises PipelineLocked when contended.

    ``lock_file`` only applies to the flock fallback (SQLite); on
    Postgres the advisory key is fixed so every container agrees on it.
    """
    if connection.vendor == 'postgresql':
        with _postgres_lock():
            yield
    else:
        with _file_lock(lock_file):
            yield
