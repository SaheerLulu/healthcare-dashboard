"""PipelineTriggerPermission tests (security audit #8).

POST /api/pipeline/trigger/ (incl. {"full": true}, which wipes and
rebuilds the report tables) must require staff/superuser whenever
DASHBOARD_REQUIRE_AUTH is effective; with auth off (dev) the open
behaviour is preserved. The background thread is patched out so no real
ETL runs in tests.
"""
import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, Client, override_settings
from rest_framework_simplejwt.tokens import RefreshToken


def _bearer(user):
    return {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(user).access_token}"}


class PipelineTriggerPermissionTests(TestCase):
    def setUp(self):
        self.c = Client()
        self.user = User.objects.create_user(username="plainuser", password="x")
        self.staff = User.objects.create_user(username="staffuser", password="x", is_staff=True)
        self.superuser = User.objects.create_superuser(
            username="rootuser", password="x", email="root@example.com")

    def _trigger(self, extra=None):
        return self.c.post(
            "/api/pipeline/trigger/",
            data=json.dumps({"full": True}),
            content_type="application/json",
            **(extra or {}),
        )

    @override_settings(DASHBOARD_REQUIRE_AUTH=True)
    def test_anon_is_rejected_when_auth_on(self):
        resp = self._trigger()
        self.assertIn(resp.status_code, (401, 403))

    @override_settings(DASHBOARD_REQUIRE_AUTH=True)
    def test_authenticated_non_staff_is_rejected(self):
        resp = self._trigger(_bearer(self.user))
        self.assertEqual(resp.status_code, 403)

    @override_settings(DASHBOARD_REQUIRE_AUTH=True)
    def test_staff_can_trigger(self):
        with patch("api.pipeline_api.threading.Thread") as thread:
            resp = self._trigger(_bearer(self.staff))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "started")
        thread.assert_called_once()
        # reset module-global progress state for other tests
        from api import pipeline_api
        pipeline_api._pipeline_running["active"] = False

    @override_settings(DASHBOARD_REQUIRE_AUTH=True)
    def test_superuser_can_trigger(self):
        with patch("api.pipeline_api.threading.Thread") as thread:
            resp = self._trigger(_bearer(self.superuser))
        self.assertEqual(resp.status_code, 200)
        thread.assert_called_once()
        from api import pipeline_api
        pipeline_api._pipeline_running["active"] = False

    @override_settings(DASHBOARD_REQUIRE_AUTH=False)
    def test_auth_off_keeps_dev_behaviour_open(self):
        with patch("api.pipeline_api.threading.Thread") as thread:
            resp = self._trigger()
        self.assertEqual(resp.status_code, 200)
        thread.assert_called_once()
        from api import pipeline_api
        pipeline_api._pipeline_running["active"] = False

    @override_settings(DASHBOARD_REQUIRE_AUTH=True)
    def test_read_endpoints_stay_plain_jwt(self):
        """Progress/history need a JWT but NOT staff — tiers differ."""
        resp = self.c.get("/api/pipeline/history/", **_bearer(self.user))
        self.assertEqual(resp.status_code, 200)
        resp = self.c.get("/api/pipeline/progress/", **_bearer(self.user))
        self.assertEqual(resp.status_code, 200)
