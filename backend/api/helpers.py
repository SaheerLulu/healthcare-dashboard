"""Shared helpers for dashboard API views."""
from datetime import date, timedelta
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


def parse_filters(request):
    """Extract common query params from request."""
    params = request.query_params
    today = date.today()
    six_months_ago = today - timedelta(days=180)

    start_date = params.get('start_date', six_months_ago.isoformat())
    end_date = params.get('end_date', today.isoformat())
    location_id = params.get('location_id')
    location_ids = params.get('location_ids', '')
    category = params.get('category', '')
    channel = params.get('channel', '')
    payment_method = params.get('payment_method', '')
    limit = int(params.get('limit', 10))

    filters = {
        'start_date': start_date,
        'end_date': end_date,
        'limit': limit,
    }

    if location_id:
        filters['location_id'] = int(location_id)
    elif location_ids:
        filters['location_ids'] = [int(x) for x in location_ids.split(',') if x.strip()]
    if category:
        filters['category'] = category
    if channel:
        filters['channel'] = channel
    if payment_method:
        filters['payment_method'] = payment_method

    return filters


def apply_common_filters(qs, filters, date_field='sale_date'):
    """Apply common date/location/category filters to a queryset."""
    qs = qs.filter(**{f'{date_field}__gte': filters['start_date'], f'{date_field}__lte': filters['end_date']})

    if 'location_id' in filters:
        qs = qs.filter(location_id=filters['location_id'])
    elif 'location_ids' in filters:
        qs = qs.filter(location_id__in=filters['location_ids'])

    if 'category' in filters:
        qs = qs.filter(product_category=filters['category'])
    if 'channel' in filters:
        qs = qs.filter(channel=filters['channel'])
    if 'payment_method' in filters:
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
