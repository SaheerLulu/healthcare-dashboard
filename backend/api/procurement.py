"""Procurement Intelligence API endpoints."""
from django.db.models import Sum, Count, Avg, Min, Max, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportPurchases
from .helpers import parse_filters


def _purchase_qs(f):
    qs = ReportPurchases.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=False,
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    return qs


@api_view(['GET'])
@permission_classes([AllowAny])
def supplier_scorecard(request):
    f = parse_filters(request)
    qs = _purchase_qs(f)

    data = list(
        qs.values('supplier_id', 'supplier_name', 'supplier_category', 'supplier_city')
        .annotate(
            total_orders=Count('source_id', distinct=True),
            total_value=Sum('line_total'),
            total_qty=Sum('quantity'),
            avg_lead_time=Avg('lead_time_days', filter=Q(lead_time_days__isnull=False)),
            products=Count('product_id', distinct=True),
        )
        .order_by('-total_value')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def cost_comparison(request):
    f = parse_filters(request)
    qs = _purchase_qs(f)

    data = list(
        qs.values('product_id', 'product_name', 'product_category')
        .annotate(
            min_rate=Min('purchase_rate'),
            avg_rate=Avg('purchase_rate'),
            max_rate=Max('purchase_rate'),
            avg_mrp=Avg('mrp'),
            avg_margin=Avg('margin_to_mrp'),
            suppliers=Count('supplier_id', distinct=True),
        )
        .order_by('-avg_rate')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def price_trend(request):
    f = parse_filters(request)
    qs = _purchase_qs(f)

    data = list(
        qs.values('purchase_month')
        .annotate(
            avg_rate=Avg('purchase_rate'),
            total_value=Sum('line_total'),
            total_qty=Sum('quantity'),
        )
        .order_by('purchase_month')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_terms(request):
    f = parse_filters(request)
    qs = _purchase_qs(f)

    data = list(
        qs.values('supplier_id', 'supplier_name', 'supplier_payment_terms', 'supplier_credit_days')
        .annotate(total_value=Sum('line_total'), orders=Count('source_id', distinct=True))
        .order_by('-total_value')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def lead_time(request):
    f = parse_filters(request)
    qs = _purchase_qs(f).filter(lead_time_days__isnull=False)

    data = list(
        qs.values('supplier_id', 'supplier_name')
        .annotate(
            min_days=Min('lead_time_days'),
            avg_days=Avg('lead_time_days'),
            max_days=Max('lead_time_days'),
            orders=Count('source_id', distinct=True),
        )
        .order_by('avg_days')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def returns(request):
    f = parse_filters(request)
    qs = ReportPurchases.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=True,
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    data = list(
        qs.values('product_category')
        .annotate(count=Count('id'), value=Sum('line_total'), qty=Sum('quantity'))
        .order_by('-value')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    """Procurement overview KPIs."""
    f = parse_filters(request)
    qs = _purchase_qs(f)

    total_orders = qs.values('source_id').distinct().count()
    total_value = float(qs.aggregate(total=Sum('line_total'))['total'] or 0)
    active_suppliers = qs.values('supplier_id').distinct().count()
    avg_lead = qs.filter(lead_time_days__isnull=False).aggregate(avg=Avg('lead_time_days'))['avg']

    from .helpers import parse_filters as _  # already imported
    from reports.models import ReportPurchases as RP
    ret_qs = RP.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=True,
    )
    returns_value = float(ret_qs.aggregate(total=Sum('line_total'))['total'] or 0)
    returns_count = ret_qs.count()

    best = qs.values('supplier_name').annotate(val=Sum('line_total')).order_by('-val').first()

    return Response({
        'total_pos': total_orders,
        'po_value': total_value,
        'active_suppliers': active_suppliers,
        'avg_lead_time': round(avg_lead or 0, 1),
        'returns_cost': abs(returns_value),
        'returns_count': returns_count,
        'best_supplier': best['supplier_name'] if best else '--',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def savings(request):
    """Placeholder savings endpoint."""
    return Response([])


@api_view(['GET'])
@permission_classes([AllowAny])
def po_status(request):
    """PO status distribution."""
    f = parse_filters(request)
    qs = ReportPurchases.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=False,
    )
    data = list(
        qs.values('state')
        .annotate(count=Count('source_id', distinct=True))
        .order_by('-count')
    )
    # Rename 'state' to 'status' for frontend
    for d in data:
        d['status'] = d.pop('state', '')
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = ReportPurchases.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'],
    ).order_by('-bill_date')
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = list(page.values(
        'bill_date', 'bill_no', 'supplier_name', 'product_name',
        'product_category', 'quantity', 'purchase_rate', 'mrp',
        'tax_percent', 'line_total', 'is_return', 'location_name',
    )) if page else []
    return paginator.get_paginated_response(data)
