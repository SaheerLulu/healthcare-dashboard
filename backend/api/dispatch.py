"""Dispatch & Fulfillment API endpoints (queries source table directly)."""
from django.db.models import Count, Avg, Sum, Q, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from source_models.models import DispatchEntryRO
from .helpers import parse_filters


@api_view(['GET'])
@permission_classes([AllowAny])
def pipeline(request):
    f = parse_filters(request)
    qs = DispatchEntryRO.objects.all()
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('status')
        .annotate(count=Count('id'), total_value=Sum('invoice_amount'))
        .order_by('status')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def courier_performance(request):
    f = parse_filters(request)
    qs = DispatchEntryRO.objects.filter(courier_partner__gt='')
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    delivered = qs.filter(status='delivered')

    data = list(
        qs.values('courier_partner')
        .annotate(
            total_orders=Count('id'),
            delivered_count=Count('id', filter=Q(status='delivered')),
            avg_weight=Avg('weight_kg'),
            total_freight=Sum('freight_charge'),
        )
        .order_by('-total_orders')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = DispatchEntryRO.objects.all().order_by('-created_at')
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values(
            'invoice_no', 'customer_name', 'city', 'state',
            'courier_partner', 'tracking_number', 'status',
            'dispatch_date', 'expected_delivery_date', 'actual_delivery_date',
            'invoice_amount', 'freight_charge',
        )[:50]
    )
    return Response(data)
