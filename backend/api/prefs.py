"""User dashboard preferences (DASH-E20-F02-US02).

GET /api/prefs/    → returns the current user's prefs blob (empty if
                     none yet).
PATCH /api/prefs/  → merges keys from the request body into the prefs
                     blob; unspecified keys are preserved.

When DASHBOARD_REQUIRE_AUTH=0 (dev), the endpoint operates on a
single shared user_id=0 row so the frontend pref behaviour is exercised
without forcing a login.
"""
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from reports.models import DashboardPref
from .permissions import DashboardPermission

# Caps on the MERGED prefs blob — the endpoint merges request keys into
# the stored JSON, so without a bound a client could grow one row without
# limit (storage abuse + slow loads of every later request).
MAX_PREFS_KEYS = 100
MAX_PREFS_BYTES = 32 * 1024


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

    if len(current) > MAX_PREFS_KEYS:
        return Response(
            {'error': f'too many preference keys (max {MAX_PREFS_KEYS})'},
            status=400,
        )
    try:
        blob_bytes = len(json.dumps(current).encode('utf-8'))
    except (TypeError, ValueError):
        return Response({'error': 'prefs must be JSON-serialisable'}, status=400)
    if blob_bytes > MAX_PREFS_BYTES:
        return Response(
            {'error': f'prefs payload too large (max {MAX_PREFS_BYTES} bytes)'},
            status=400,
        )

    obj.prefs = current
    obj.save(update_fields=['prefs', 'updated_at'])

    return Response({
        'user_id': uid,
        'prefs': obj.prefs,
        'updated_at': obj.updated_at.isoformat(),
    })
