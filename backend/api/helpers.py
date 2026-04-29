"""Shared helpers for dashboard API views."""
from datetime import date, timedelta
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


def prior_period_range(filters):
    """Same-duration window ending the day before start_date."""
    start = date.fromisoformat(filters['start_date'])
    end = date.fromisoformat(filters['end_date'])
    days = (end - start).days + 1
    return start - timedelta(days=days), start - timedelta(days=1)


def growth_pct(current, previous):
    """Signed percent change, rounded to 1 decimal.

    Returns 0 when previous is 0 — but ALSO when previous is so small relative
    to current that the percentage explodes into garbage (>500%). A 2,015%
    "growth" on a tiny seed period is misleading; clamp to 500 and let the
    consumer treat extreme values as 'insufficient prior data'.
    """
    current = float(current or 0)
    previous = float(previous or 0)
    if not previous:
        return 0.0
    raw = (current - previous) / previous * 100
    if raw > 500:
        return 500.0
    if raw < -500:
        return -500.0
    return round(raw, 1)


def parse_filters(request):
    """Extract common query params from request.

    Date inputs are validated as ISO YYYY-MM-DD; bad input falls back to the
    default 6-month window rather than raising a 500. Reverse ranges (end <
    start) are normalised by swapping. Unknown filter keys are ignored without
    a 500.
    """
    params = request.query_params
    today = date.today()
    six_months_ago = today - timedelta(days=180)

    def _safe_date(raw, fallback):
        if not raw:
            return fallback.isoformat()
        try:
            return date.fromisoformat(raw).isoformat()
        except (ValueError, TypeError):
            return fallback.isoformat()

    start_date = _safe_date(params.get('start_date'), six_months_ago)
    end_date = _safe_date(params.get('end_date'), today)
    # Normalise reverse range
    if start_date > end_date:
        start_date, end_date = end_date, start_date

    def _safe_int(raw, fallback):
        try:
            return int(raw) if raw is not None else fallback
        except (ValueError, TypeError):
            return fallback

    location_id = params.get('location_id')
    location_ids = params.get('location_ids', '')
    category = params.get('category', '')
    channel = params.get('channel', '')
    payment_method = params.get('payment_method', '')
    limit = _safe_int(params.get('limit'), 10)

    filters = {
        'start_date': start_date,
        'end_date': end_date,
        'limit': limit,
    }

    if location_id:
        try:
            filters['location_id'] = int(location_id)
        except (ValueError, TypeError):
            pass  # silently drop invalid location_id
    elif location_ids:
        filters['location_ids'] = [
            int(x) for x in location_ids.split(',')
            if x.strip().isdigit()
        ]
    if category:
        if ',' in category:
            filters['categories'] = [x.strip() for x in category.split(',') if x.strip()]
        else:
            filters['category'] = category
    if channel:
        if ',' in channel:
            filters['channels'] = [x.strip() for x in channel.split(',') if x.strip()]
        else:
            filters['channel'] = channel
    if payment_method:
        if ',' in payment_method:
            filters['payment_methods'] = [x.strip() for x in payment_method.split(',') if x.strip()]
        else:
            filters['payment_method'] = payment_method

    return filters


def apply_common_filters(qs, filters, date_field='sale_date'):
    """Apply common date/location/category filters to a queryset."""
    qs = qs.filter(**{f'{date_field}__gte': filters['start_date'], f'{date_field}__lte': filters['end_date']})

    if 'location_id' in filters:
        qs = qs.filter(location_id=filters['location_id'])
    elif 'location_ids' in filters:
        qs = qs.filter(location_id__in=filters['location_ids'])

    if 'categories' in filters:
        qs = qs.filter(product_category__in=filters['categories'])
    elif 'category' in filters:
        qs = qs.filter(product_category=filters['category'])
    if 'channels' in filters:
        qs = qs.filter(channel__in=filters['channels'])
    elif 'channel' in filters:
        qs = qs.filter(channel=filters['channel'])
    if 'payment_methods' in filters:
        qs = qs.filter(payment_method__in=filters['payment_methods'])
    elif 'payment_method' in filters:
        qs = qs.filter(payment_method=filters['payment_method'])

    return qs


def apply_financial_filters(qs, filters):
    """Apply filters for financial report queries."""
    qs = qs.filter(entry_date__gte=filters['start_date'], entry_date__lte=filters['end_date'])
    if 'location_id' in filters:
        qs = qs.filter(location_id=filters['location_id'])
    elif 'location_ids' in filters:
        qs = qs.filter(location_id__in=filters['location_ids'])
    return qs


def apply_common_filters_range(qs, filters, start, end, date_field='sale_date'):
    """Like apply_common_filters but with an explicit date range override.
    Used for prior-period comparison queries."""
    qs = qs.filter(**{f'{date_field}__gte': start, f'{date_field}__lte': end})

    if 'location_id' in filters:
        qs = qs.filter(location_id=filters['location_id'])
    elif 'location_ids' in filters:
        qs = qs.filter(location_id__in=filters['location_ids'])

    if 'categories' in filters:
        qs = qs.filter(product_category__in=filters['categories'])
    elif 'category' in filters:
        qs = qs.filter(product_category=filters['category'])
    if 'channels' in filters:
        qs = qs.filter(channel__in=filters['channels'])
    elif 'channel' in filters:
        qs = qs.filter(channel=filters['channel'])
    if 'payment_methods' in filters:
        qs = qs.filter(payment_method__in=filters['payment_methods'])
    elif 'payment_method' in filters:
        qs = qs.filter(payment_method=filters['payment_method'])

    return qs
