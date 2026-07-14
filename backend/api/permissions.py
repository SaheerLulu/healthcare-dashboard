"""Authentication / authorisation policy for the dashboard API.

Why: DASH-E00-A04 (Security NFR) requires every endpoint to enforce JWT +
permission before GA. Today every view declares
``@permission_classes([AllowAny])`` so that dev works without a token.
This module provides a single class that:

- Returns *AllowAny* behaviour when ``settings.DASHBOARD_REQUIRE_AUTH`` is
  False — keeps the dev workflow unchanged.
- Returns *IsAuthenticated* behaviour when it is True — closes risk
  **R-09** (AllowAny left in production by mistake).

``DASHBOARD_REQUIRE_AUTH`` is resolved in settings.py: explicit env value
wins; when the env var is unset it defaults to ``not DEBUG`` so a
production-ish run with a forgotten env file fails closed.

Endpoints route through this class, not through ``AllowAny``, so a single
environment toggle flips the entire surface area at once.

Usage::

    from .permissions import DashboardPermission

    @api_view(["GET"])
    @permission_classes([DashboardPermission])
    def my_view(request):
        ...
"""
from django.conf import settings
from rest_framework.permissions import BasePermission, IsAuthenticated


class DashboardPermission(BasePermission):
    """Allow all in dev, require JWT when ``DASHBOARD_REQUIRE_AUTH`` is set."""

    message = "Authentication required for this endpoint."

    def has_permission(self, request, view):
        if not getattr(settings, "DASHBOARD_REQUIRE_AUTH", False):
            return True
        return bool(IsAuthenticated().has_permission(request, view))


class PipelineTriggerPermission(BasePermission):
    """Destructive pipeline triggers need staff when auth is enforced.

    ``POST /api/pipeline/trigger/`` — especially with ``{"full": true}``,
    which wipes and rebuilds every report table — must not be available
    to any holder of a bare JWT. When ``DASHBOARD_REQUIRE_AUTH`` is
    effective, require ``is_staff`` or ``is_superuser`` on top of
    authentication; when auth is off (dev/DEBUG) keep the open behaviour,
    mirroring DashboardPermission.
    """

    message = "Staff or superuser privileges required to trigger pipeline runs."

    def has_permission(self, request, view):
        if not getattr(settings, "DASHBOARD_REQUIRE_AUTH", False):
            return True
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


class HealthCheckPermission(BasePermission):
    """Always allow — for liveness probes that LBs / oncall hit unauthed."""

    def has_permission(self, request, view):
        return True
