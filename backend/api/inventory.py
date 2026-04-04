"""Inventory Operations API endpoints."""
from django.db.models import Sum, Count, Avg, Q, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportInventory, ReportSales, ReportPurchases
from .helpers import parse_filters


def _latest_snapshot():
    """Get queryset for the latest inventory snapshot."""
    latest = ReportInventory.objects.order_by('-snapshot_date').values('snapshot_date').first()
    if not latest:
        return ReportInventory.objects.none()
    return ReportInventory.objects.filter(snapshot_date=latest['snapshot_date'])


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    agg = qs.aggregate(
        total_value=Sum('stock_value_cost'),
        total_mrp_value=Sum('stock_value_mrp'),
        total_items=Count('product_id', distinct=True),
        low_stock_count=Count('id', filter=Q(reorder_needed=True)),
        dead_stock_count=Count('id', filter=Q(movement_status='dead')),
        avg_days_of_stock=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
    )
    agg = {k: float(v or 0) for k, v in agg.items()}

    # Stock turns (annualized)
    avg_turnover = qs.filter(inventory_turnover__gt=0).aggregate(avg=Avg('inventory_turnover'))['avg'] or 0
    agg['stock_turns'] = float(avg_turnover)

    return Response(agg)


@api_view(['GET'])
@permission_classes([AllowAny])
def by_category(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('product_category')
        .annotate(
            value=Sum('stock_value_cost'),
            mrp_value=Sum('stock_value_mrp'),
            qty=Sum('qty_on_hand'),
            items=Count('product_id', distinct=True),
        )
        .order_by('-value')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def expiry(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('expiry_status')
        .annotate(count=Count('id'), value=Sum('stock_value_cost'), qty=Sum('qty_on_hand'))
        .order_by('expiry_status')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def movement_trend(request):
    f = parse_filters(request)

    inbound = list(
        ReportPurchases.objects
        .filter(bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=False)
        .values('purchase_month')
        .annotate(qty=Sum('quantity'), value=Sum('line_total'))
        .order_by('purchase_month')
    )

    outbound = list(
        ReportSales.objects
        .filter(sale_date__gte=f['start_date'], sale_date__lte=f['end_date'])
        .values('sale_month')
        .annotate(qty=Sum('quantity'), value=Sum('line_total'))
        .order_by('sale_month')
    )

    return Response({'inbound': inbound, 'outbound': outbound})


@api_view(['GET'])
@permission_classes([AllowAny])
def abc_ved(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('abc_class', 'product_ved_class')
        .annotate(count=Count('product_id', distinct=True), value=Sum('stock_value_cost'))
        .order_by('abc_class', 'product_ved_class')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def dead_stock(request):
    qs = _latest_snapshot().filter(movement_status='dead', qty_on_hand__gt=0)
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values(
            'product_id', 'product_name', 'product_category',
            'qty_on_hand', 'stock_value_cost', 'days_since_last_sale',
            'last_sale_date', 'location_name',
        )
        .order_by('-stock_value_cost')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def forecast(request):
    qs = _latest_snapshot().filter(avg_daily_demand__gt=0)
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values(
            'product_id', 'product_name', 'product_category',
            'avg_daily_demand', 'days_of_stock', 'safety_stock',
            'qty_on_hand', 'reorder_needed',
        )
        .order_by('days_of_stock')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def efficiency(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('product_category')
        .annotate(
            avg_turnover=Avg('inventory_turnover'),
            avg_dos=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
            avg_gmroi=Avg('gmroi'),
            avg_fill_rate=Avg('fill_rate'),
            items=Count('product_id', distinct=True),
        )
        .order_by('-avg_turnover')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def batches(request):
    qs = _latest_snapshot().filter(batch_no__gt='')
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values(
            'product_name', 'batch_no', 'expiry_month', 'days_to_expiry',
            'expiry_status', 'qty_on_hand', 'purchase_rate', 'mrp',
            'stock_value_cost', 'location_name',
        )
        .order_by('days_to_expiry')[:50]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def investment(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    by_category = list(
        qs.values('product_category')
        .annotate(
            investment=Sum('stock_value_cost'),
            mrp_value=Sum('stock_value_mrp'),
            avg_gmroi=Avg('gmroi'),
        )
        .order_by('-investment')
    )

    by_location = list(
        qs.values('location_id', 'location_name')
        .annotate(investment=Sum('stock_value_cost'), avg_gmroi=Avg('gmroi'))
        .order_by('-investment')
    )

    return Response({
        'by_category': by_category,
        'by_location': by_location,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def stock_alerts(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    alerts = list(
        qs.filter(Q(reorder_needed=True) | Q(expiry_status__in=['expired', 'critical_30']))
        .values(
            'product_id', 'product_name', 'product_category',
            'qty_on_hand', 'reorder_needed', 'expiry_status',
            'days_to_expiry', 'days_of_stock', 'location_name',
        )
        .order_by('days_to_expiry')[:50]
    )
    for a in alerts:
        if a['expiry_status'] in ('expired', 'critical_30'):
            a['alert_type'] = 'expiry'
        else:
            a['alert_type'] = 'reorder'
    return Response(alerts)


@api_view(['GET'])
@permission_classes([AllowAny])
def carrying_cost(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    HOLDING_RATE = 0.25  # 25% annual holding cost
    data = list(
        qs.values('product_category')
        .annotate(
            stock_value=Sum('stock_value_cost'),
            items=Count('product_id', distinct=True),
            avg_dos=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
        )
        .order_by('-stock_value')
    )
    for d in data:
        sv = float(d['stock_value'] or 0)
        d['carrying_cost'] = round(sv * HOLDING_RATE, 2)
        d['monthly_cost'] = round(sv * HOLDING_RATE / 12, 2)
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def optimization(request):
    qs = _latest_snapshot().filter(qty_on_hand__gt=0)
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    overstock = list(
        qs.filter(days_of_stock__gt=180, days_of_stock__lt=9999)
        .values('product_id', 'product_name', 'product_category',
                'qty_on_hand', 'days_of_stock', 'stock_value_cost', 'avg_daily_demand')
        .order_by('-stock_value_cost')[:20]
    )
    understock = list(
        qs.filter(reorder_needed=True, movement_status__in=['fast', 'medium'])
        .values('product_id', 'product_name', 'product_category',
                'qty_on_hand', 'days_of_stock', 'stock_value_cost', 'avg_daily_demand')
        .order_by('days_of_stock')[:20]
    )

    return Response({
        'overstock': overstock,
        'understock': understock,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def turnover(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('product_category')
        .annotate(
            avg_turnover=Avg('inventory_turnover', filter=Q(inventory_turnover__gt=0)),
            avg_gmroi=Avg('gmroi', filter=Q(gmroi__gt=0)),
            avg_dos=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
            total_value=Sum('stock_value_cost'),
            items=Count('product_id', distinct=True),
        )
        .order_by('-avg_turnover')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def batch_detail(request):
    qs = _latest_snapshot().filter(batch_no__gt='')
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    qs = qs.order_by('days_to_expiry').values(
        'product_name', 'product_category', 'batch_no',
        'expiry_month', 'days_to_expiry', 'expiry_status',
        'qty_on_hand', 'purchase_rate', 'mrp',
        'stock_value_cost', 'location_name',
    )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])


@api_view(['GET'])
@permission_classes([AllowAny])
def investment_detail(request):
    qs = _latest_snapshot()
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('product_id', 'product_name', 'product_category', 'product_company')
        .annotate(
            investment=Sum('stock_value_cost'),
            mrp_value=Sum('stock_value_mrp'),
            qty=Sum('qty_on_hand'),
            avg_gmroi=Avg('gmroi'),
        )
        .order_by('-investment')[:50]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail_view(request):
    qs = _latest_snapshot().order_by('-stock_value_cost')
    f = parse_filters(request)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    # Support drill-through filters from Executive Summary
    params = request.query_params
    if params.get('reorder_needed'):
        qs = qs.filter(reorder_needed=True)
    if params.get('expiry_status'):
        qs = qs.filter(expiry_status=params['expiry_status'])
    if params.get('movement_status'):
        qs = qs.filter(movement_status=params['movement_status'])
    qs = qs.values(
        'product_name', 'product_code', 'product_category',
        'batch_no', 'expiry_month', 'expiry_status',
        'qty_on_hand', 'purchase_rate', 'mrp',
        'stock_value_cost', 'movement_status', 'abc_class',
        'days_of_stock', 'location_name',
    )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])
