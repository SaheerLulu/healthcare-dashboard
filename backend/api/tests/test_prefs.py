"""Prefs endpoint caps (security finding: unbounded merged JSON blob)."""
import json

from django.test import TestCase, Client, override_settings

from reports.models import DashboardPref


@override_settings(DASHBOARD_REQUIRE_AUTH=False)
class PrefsCapTests(TestCase):
    def setUp(self):
        self.c = Client()

    def _patch(self, payload):
        return self.c.patch(
            "/api/prefs/", data=json.dumps(payload),
            content_type="application/json",
        )

    def test_normal_patch_still_works(self):
        resp = self._patch({"theme": "dark", "sidebar_open": True})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["prefs"]["theme"], "dark")

    def test_too_many_keys_rejected_with_400(self):
        resp = self._patch({f"key_{i}": i for i in range(101)})
        self.assertEqual(resp.status_code, 400)
        # Nothing persisted
        self.assertEqual(DashboardPref.objects.get(user_id=0).prefs, {})

    def test_merge_overflow_rejected_not_just_single_payload(self):
        """The cap applies to the MERGED blob: two payloads of 60 keys
        each must fail on the second, even though each alone is small."""
        self.assertEqual(self._patch({f"a_{i}": i for i in range(60)}).status_code, 200)
        resp = self._patch({f"b_{i}": i for i in range(60)})
        self.assertEqual(resp.status_code, 400)

    def test_oversized_payload_rejected_with_400(self):
        resp = self._patch({"blob": "x" * (33 * 1024)})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(DashboardPref.objects.get(user_id=0).prefs, {})

    def test_null_still_deletes_keys(self):
        self._patch({"theme": "dark"})
        resp = self._patch({"theme": None})
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("theme", resp.json()["prefs"])
