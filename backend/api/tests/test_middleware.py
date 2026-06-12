"""AuditMiddleware credential-scrubbing tests (security finding: plaintext
passwords / refresh tokens persisted to audit_log with 8-year retention).

Contract under test:
- /api/auth/* requests still produce an AuditLog row (who/when/status),
  but the body is NEVER recorded.
- Other mutating requests keep a body summary, with the VALUES of
  sensitive keys (password/token/refresh/authorization/secret/api_key)
  replaced by ``[redacted]`` — not just the key names mangled.
"""
import json
from unittest.mock import MagicMock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, Client, override_settings

from api.middleware import AuditMiddleware
from reports.models import AuditLog

PASSWORD = "S3cret-Hunter2-Pa55word"


class AuditAuthBodyTests(TestCase):
    def setUp(self):
        self.c = Client()
        cache.clear()  # login throttle state must not leak between tests
        User.objects.create_user(username="audituser", password=PASSWORD)

    def tearDown(self):
        cache.clear()

    def test_login_post_records_row_without_password(self):
        resp = self.c.post(
            "/api/auth/login/",
            data=json.dumps({"username": "audituser", "password": PASSWORD}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        row = AuditLog.objects.get(path="/api/auth/login/")
        self.assertEqual(row.body_summary, "")
        self.assertNotIn(PASSWORD, row.body_summary)

    def test_failed_login_also_leaves_no_password(self):
        self.c.post(
            "/api/auth/login/",
            data=json.dumps({"username": "audituser", "password": "wrong-" + PASSWORD}),
            content_type="application/json",
        )
        for row in AuditLog.objects.filter(path__startswith="/api/auth/"):
            self.assertNotIn(PASSWORD, row.body_summary)

    def test_refresh_post_leaves_no_token(self):
        login = self.c.post(
            "/api/auth/login/",
            data=json.dumps({"username": "audituser", "password": PASSWORD}),
            content_type="application/json",
        )
        refresh_token = login.json()["data"]["refresh_token"]
        resp = self.c.post(
            "/api/auth/refresh/",
            data=json.dumps({"refresh_token": refresh_token}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        row = AuditLog.objects.get(path="/api/auth/refresh/")
        self.assertEqual(row.body_summary, "")
        self.assertNotIn(refresh_token, row.body_summary)


@override_settings(DASHBOARD_REQUIRE_AUTH=False)
class AuditBodyMaskingTests(TestCase):
    """Non-auth mutations keep a summary, with sensitive VALUES redacted."""

    def setUp(self):
        self.c = Client()

    def test_patch_body_masks_sensitive_values_keeps_rest(self):
        self.c.patch(
            "/api/prefs/",
            data=json.dumps({"theme": "dark", "api_token": "super-secret-value-123"}),
            content_type="application/json",
        )
        row = AuditLog.objects.get(path="/api/prefs/", method="PATCH")
        self.assertNotIn("super-secret-value-123", row.body_summary)
        self.assertIn("api_token", row.body_summary)   # key survives
        self.assertIn("[redacted]", row.body_summary)
        self.assertIn("dark", row.body_summary)        # benign value survives


class SummariseBodyUnitTests(TestCase):
    """Direct unit tests over the masking helper (no HTTP round-trip)."""

    def _summary(self, path, body: bytes):
        mw = AuditMiddleware(lambda r: None)
        request = MagicMock()
        request.path = path
        request.body = body
        return mw._summarise_body(request)

    def test_auth_paths_record_nothing(self):
        out = self._summary("/api/auth/login/", b'{"username":"u","password":"pw"}')
        self.assertEqual(out, "")

    def test_nested_json_values_redacted(self):
        body = json.dumps({
            "outer": {"refresh_token": "tok-abc", "items": [{"secret_key": "sk-1"}]},
            "note": "keep-me",
        }).encode()
        out = self._summary("/api/pipeline/trigger/", body)
        self.assertNotIn("tok-abc", out)
        self.assertNotIn("sk-1", out)
        self.assertIn("keep-me", out)
        self.assertIn("[redacted]", out)

    def test_form_encoded_fallback_redacts_values(self):
        out = self._summary(
            "/api/something/", b"password=plaintextpw&note=hello"
        )
        self.assertNotIn("plaintextpw", out)
        self.assertIn("hello", out)

    def test_malformed_json_fallback_redacts_values(self):
        out = self._summary(
            "/api/something/", b'{"token": "abc-def", "x": 1,'  # truncated JSON
        )
        self.assertNotIn("abc-def", out)
