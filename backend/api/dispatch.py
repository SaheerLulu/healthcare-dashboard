"""Dispatch & Fulfillment API endpoints.
Source DB has zero rows in `DispatchEntryRO`, so when that's empty we derive
synthetic dispatch entries from `B2BSalesOrderRO` so the page is demo-able.
The synthesised entries are deterministic (hashed on order id) so two calls
with the same data return the same result."""
from datetime import timedelta
from django.db.models import Count, Avg, Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from source_models.models import DispatchEntryRO, B2BSalesOrderRO
from .helpers import parse_filters


_COURIERS = ['BlueDart', 'Delhivery', 'India Speed Post', 'Local Courier', 'Ekart']
_STATUSES = ['delivered', 'delivered', 'delivered', 'dispatched', 'in_transit', 'pending']


def _synthesise_dispatch(b2b_qs):
    """Yield dispatch-shaped dicts from B2B orders. Deterministic per order id."""
    for o in b2b_qs.iterator():
        oid_hash = hash(str(o.id))
        courier = _COURIERS[oid_hash % len(_COURIERS)]
        # Map B2B status → dispatch status; fall back to a hashed pick.
        b2b_status = (o.status or '').lower()
        if b2b_status in ('delivered',):
            status = 'delivered'
        elif b2b_status in ('dispatched',):
            status = 'dispatched'
        elif b2b_status in ('confirmed', 'pending'):
            status = _STATUSES[oid_hash % len(_STATUSES)]
        elif b2b_status in ('cancelled',):
            status = 'cancelled'
        else:
            status = _STATUSES[oid_hash % len(_STATUSES)]

        weight_kg = 1.5 + ((oid_hash >> 4) % 100) / 10  # 1.5 – 11.5 kg
        freight = 50 + ((oid_hash >> 8) % 200)  # ₹50 – ₹250
        dispatch_date = o.sale_date
        expected = o.delivery_date or (o.sale_date + timedelta(days=2) if o.sale_date else None)
        actual = expected + timedelta(days=(oid_hash % 4) - 1) if expected and status == 'delivered' else None

        yield {
            'id': o.id,
            'invoice_no': o.invoice_no or f'B2B-{o.id}',
            'customer_name': getattr(o.customer, 'customer_name', '') if o.customer_id else '',
            'city': getattr(o.customer, 'city', '') if o.customer_id else '',
            'state': getattr(o.customer, 'state', '') if o.customer_id else '',
            'location_id': o.location_id,
            'courier_partner': courier,
            'tracking_number': f'{courier[:3].upper()}{o.id:08d}',
            'status': status,
            'dispatch_date': dispatch_date,
            'expected_delivery_date': expected,
            'actual_delivery_date': actual,
            'invoice_amount': float(o.total_amount or 0),
            'freight_charge': float(freight),
            'weight_kg': float(weight_kg),
        }


def _entries(filters):
    """Return a list of dispatch entries (real + synth fallback)."""
    if DispatchEntryRO.objects.exists():
        qs = DispatchEntryRO.objects.all()
        if 'location_id' in filters:
            qs = qs.filter(location_id=filters['location_id'])
        return qs

    b2b_qs = B2BSalesOrderRO.objects.select_related('customer').all()
    if 'location_id' in filters:
        b2b_qs = b2b_qs.filter(location_id=filters['location_id'])
    return list(_synthesise_dispatch(b2b_qs))


@api_view(['GET'])
@permission_classes([AllowAny])
def pipeline(request):
    f = parse_filters(request)
    entries = _entries(f)

    if isinstance(entries, list):  # synth fallback
        buckets: dict = {}
        for e in entries:
            s = e['status']
            buckets.setdefault(s, {'status': s, 'count': 0, 'total_value': 0.0})
            buckets[s]['count'] += 1
            buckets[s]['total_value'] += e['invoice_amount']
        return Response(sorted(buckets.values(), key=lambda r: r['status']))

    data = list(
        entries.values('status')
        .annotate(count=Count('id'), total_value=Sum('invoice_amount'))
        .order_by('status')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def courier_performance(request):
    f = parse_filters(request)
    entries = _entries(f)

    if isinstance(entries, list):  # synth fallback
        buckets: dict = {}
        for e in entries:
            cp = e['courier_partner']
            b = buckets.setdefault(cp, {
                'courier_partner': cp, 'total_orders': 0, 'delivered_count': 0,
                'avg_weight': 0.0, 'total_freight': 0.0, '_w_sum': 0.0,
            })
            b['total_orders'] += 1
            if e['status'] == 'delivered':
                b['delivered_count'] += 1
            b['_w_sum'] += e['weight_kg']
            b['total_freight'] += e['freight_charge']
        for b in buckets.values():
            b['avg_weight'] = round(b['_w_sum'] / b['total_orders'], 2) if b['total_orders'] else 0
            b.pop('_w_sum', None)
        return Response(sorted(buckets.values(), key=lambda r: -r['total_orders']))

    qs = entries.filter(courier_partner__gt='')
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
    entries = _entries(f)

    if isinstance(entries, list):  # synth fallback
        rows = sorted(entries, key=lambda r: r['dispatch_date'] or '', reverse=True)[:50]
        return Response([
            {k: r[k] for k in (
                'invoice_no', 'customer_name', 'city', 'state',
                'courier_partner', 'tracking_number', 'status',
                'dispatch_date', 'expected_delivery_date', 'actual_delivery_date',
                'invoice_amount', 'freight_charge',
            )}
            for r in rows
        ])

    qs = entries.order_by('-created_at')
    data = list(
        qs.values(
            'invoice_no', 'customer_name', 'city', 'state',
            'courier_partner', 'tracking_number', 'status',
            'dispatch_date', 'expected_delivery_date', 'actual_delivery_date',
            'invoice_amount', 'freight_charge',
        )[:50]
    )
    return Response(data)
