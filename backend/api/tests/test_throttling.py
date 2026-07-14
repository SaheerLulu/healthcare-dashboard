"""Login/refresh throttling tests (security audit #11).

ScopedRateThrottle: 'login' 10/min, 'refresh' 60/min. Throttle state
lives in the default cache, so each test clears it to stay independent
of ordering (other suites also POST to /api/auth/login/).
"""
import json

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, Client


class LoginThrottleTests(TestCase):
    def setUp(self):
        self.c = Client()
        cache.clear()
        User.objects.create_user(username="throttled", password="right-pw")

    def tearDown(self):
        cache.clear()

    def _login(self, password="wrong-pw"):
        return self.c.post(
            "/api/auth/login/",
            data=json.dumps({"username": "throttled", "password": password}),
            content_type="application/json",
        )

    def test_eleventh_rapid_login_attempt_is_throttled(self):
        for i in range(10):
            resp = self._login()
            self.assertEqual(resp.status_code, 401, f"attempt {i + 1}")
        resp = self._login()
        self.assertEqual(resp.status_code, 429)

    def test_throttle_applies_even_with_valid_credentials(self):
        """The limit is on attempts, not failures — 429 wins over 200."""
        for _ in range(10):
            self._login()
        resp = self._login(password="right-pw")
        self.assertEqual(resp.status_code, 429)

    def test_refresh_scope_is_laxer_than_login(self):
        """11 rapid refresh posts must NOT trip the 60/min scope."""
        for i in range(11):
            resp = self.c.post(
                "/api/auth/refresh/",
                data=json.dumps({"refresh_token": "junk"}),
                content_type="application/json",
            )
            self.assertEqual(resp.status_code, 401, f"attempt {i + 1}")

    def test_refresh_throttles_at_its_own_limit(self):
        for _ in range(60):
            self.c.post(
                "/api/auth/refresh/",
                data=json.dumps({"refresh_token": "junk"}),
                content_type="application/json",
            )
        resp = self.c.post(
            "/api/auth/refresh/",
            data=json.dumps({"refresh_token": "junk"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 429)
