"""User dashboard preferences (DASH-E20-F02-US02).

GET /api/prefs/    → returns the current user's prefs blob (empty if
                     none yet).
PATCH /api/prefs/  → merges keys from the request body into the prefs
                     blob; unspecified keys are preserved.

When DASHBOARD_REQUIRE_AUTH=0 (dev), the endpoint operates on a
single shared user_id=0 row so the frontend pref behaviour is exercised
without forcing a login.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from reports.models import DashboardPref
from .permissions import DashboardPermission


def _user_id(request) -> int:
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return int(getattr(user, 'id', 0) or 0)
    return 0  # dev fallback


@api_view(['GET', 'PATCH'])
@permission_classes([DashboardPermission])
def prefs(request):
    uid = _user_id(request)
    obj, _ = DashboardPref.objects.get_or_create(user_id=uid, defaults={'prefs': {}})

    if request.method == 'GET':
        return Response({
            'user_id': uid,
            'prefs': obj.prefs or {},
            'updated_at': obj.updated_at.isoformat() if obj.updated_at else None,
        })

    # PATCH — merge non-null keys; explicit null deletes a key.
    body = request.data or {}
    if not isinstance(body, dict):
        return Response({'error': 'body must be a JSON object'}, status=400)

    current = dict(obj.prefs or {})
    for k, v in body.items():
        if v is None:
            current.pop(k, None)
        else:
            current[k] = v

    obj.prefs = current
    obj.save(update_fields=['prefs', 'updated_at'])

    return Response({
        'user_id': uid,
        'prefs': obj.prefs,
        'updated_at': obj.updated_at.isoformat(),
    })
