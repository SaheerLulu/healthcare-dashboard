"""pipeline_lock contention tests (sqlite/flock path).

The Postgres advisory-lock branch takes over automatically when
connection.vendor == 'postgresql' (deployed stacks); these tests pin the
non-blocking contract both backends must honour: holding the lock makes
a second acquisition raise PipelineLocked, and release makes it
acquirable again.
"""
import tempfile
from pathlib import Path

from django.test import TestCase

from pipeline.locking import PipelineLocked, pipeline_lock


class PipelineLockTests(TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.lock_file = str(Path(self._tmp.name) / "test.pipeline.lock")

    def tearDown(self):
        self._tmp.cleanup()

    def test_contended_lock_raises_pipeline_locked(self):
        with pipeline_lock(self.lock_file):
            with self.assertRaises(PipelineLocked):
                with pipeline_lock(self.lock_file):
                    pass

    def test_lock_is_reacquirable_after_release(self):
        with pipeline_lock(self.lock_file):
            pass
        # Must not raise — the previous holder released cleanly.
        with pipeline_lock(self.lock_file):
            pass

    def test_release_happens_even_when_body_raises(self):
        class Boom(Exception):
            pass

        try:
            with pipeline_lock(self.lock_file):
                raise Boom()
        except Boom:
            pass
        with pipeline_lock(self.lock_file):
            pass
