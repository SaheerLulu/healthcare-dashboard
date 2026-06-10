"""Shared helpers for dashboard API views."""
from datetime import date, timedelta

from rest_framework.pagination import PageNumberPagination


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


# ---------------------------------------------------------------------------
# Dimension vocabulary (docs/DRILLTHROUGH_DESIGN.md §1).
#
# Every drill-through / page filter arrives as a query param named exactly
# like the dimension id the frontend emits. Values are CSV for multi-select.
# Parsed values are stored in the filters dict as LISTS under the param name
# (the legacy category/channel/payment_method single-vs-plural duality is
# kept for backward compatibility with existing call sites).
# ---------------------------------------------------------------------------
INT_CSV_DIMS = ('product_id', 'supplier_id', 'customer_id', 'doctor_id')
STR_CSV_DIMS = (
    'product_name', 'supplier_name', 'customer_name', 'doctor_name',
    'customer_type', 'speciality', 'molecule', 'company',
    'invoice_no', 'batch_no', 'month',
    'state', 'voucher_type', 'account_type', 'account_subtype',
    'account_name', 'party_type',
    'invoice_type', 'filing_status', 'source_table',
    'section', 'status', 'reason', 'return_type',
    'expiry_status', 'expiry_bucket', 'movement_status',
    'abc_class', 'ved_class', 'courier_partner',
)
NUM_CSV_DIMS = ('gst_rate',)
BOOL_DIMS = ('is_return', 'reorder_needed')


def _parse_csv(raw):
    return [x.strip() for x in str(raw).split(',') if x.strip()]


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

    for dim in INT_CSV_DIMS:
        raw = params.get(dim)
        if raw:
            vals = [int(x) for x in _parse_csv(raw) if x.lstrip('-').isdigit()]
            if vals:
                filters[dim] = vals
    for dim in STR_CSV_DIMS:
        raw = params.get(dim)
        if raw:
            vals = _parse_csv(raw)
            if vals:
                filters[dim] = vals
    for dim in NUM_CSV_DIMS:
        raw = params.get(dim)
        if raw:
            vals = []
            for x in _parse_csv(raw):
                try:
                    vals.append(float(x))
                except ValueError:
                    pass
            if vals:
                filters[dim] = vals
    for dim in BOOL_DIMS:
        raw = params.get(dim)
        if raw is not None and str(raw).lower() in ('true', 'false', '1', '0'):
            filters[dim] = str(raw).lower() in ('true', '1')

    ordering = params.get('ordering', '')
    if ordering:
        filters['ordering'] = ordering.strip()

    return filters


# `expiry_bucket` values → days_to_expiry ranges (lower, upper); None = open.
EXPIRY_BUCKETS = {
    'expired': (None, -1),
    'd0_30': (0, 30),
    'd31_60': (31, 60),
    'd61_90': (61, 90),
    'd90_plus': (91, None),
}


def apply_dim_filters(qs, filters, mapping):
    """Apply parsed dimension filters to a queryset.

    `mapping` is {param_name: column_name}. List values use __in, booleans use
    equality. `expiry_bucket` maps onto days_to_expiry ranges via
    EXPIRY_BUCKETS (column value in the mapping must be 'days_to_expiry').
    Params absent from the mapping or from filters are ignored, so it is safe
    to pass every request's filters through any module's mapping.
    """
    from django.db.models import Q

    for param, column in mapping.items():
        if param not in filters:
            continue
        value = filters[param]
        if param == 'expiry_bucket':
            q = Q()
            for bucket in value:
                rng = EXPIRY_BUCKETS.get(bucket)
                if not rng:
                    continue
                lo, hi = rng
                cond = Q()
                if lo is not None:
                    cond &= Q(**{f'{column}__gte': lo})
                if hi is not None:
                    cond &= Q(**{f'{column}__lte': hi})
                q |= cond
            if q:
                qs = qs.filter(q)
        elif isinstance(value, list):
            qs = qs.filter(**{f'{column}__in': value})
        else:
            qs = qs.filter(**{column: value})
    return qs


class DetailPagination(PageNumberPagination):
    """Pagination for row-level drill-through endpoints.

    Honors ?page= and ?page_size= (capped) so detail tables can page and
    export without unbounded payloads.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


def apply_ordering(qs, filters, allowed, default):
    """Apply a whitelisted ?ordering= column ('-' prefix = descending)."""
    ordering = filters.get('ordering', '')
    column = ordering.lstrip('-')
    if column in allowed:
        return qs.order_by(ordering)
    return qs.order_by(default)


def paginate_detail(request, qs):
    """Paginate a values() queryset with the DetailPagination contract."""
    paginator = DetailPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])


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
