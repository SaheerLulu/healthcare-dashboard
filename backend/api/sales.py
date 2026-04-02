"""Sales Command Center API endpoints."""
from django.db.models import Sum, Count, Avg, Max, F, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportSales, ReportSalesReturns, ReportFinancial
from .helpers import parse_filters, apply_common_filters, apply_financial_filters


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    agg = qs.aggregate(
        total_revenue=Sum('line_total'),
        total_orders=Count('source_id', distinct=True),
        total_qty=Sum('quantity'),
        avg_order_value=Avg('line_total'),
    )
    agg = {k: float(v or 0) for k, v in agg.items()}

    # Daily trend
    daily = list(
        qs.values('sale_date')
        .annotate(revenue=Sum('line_total'), orders=Count('source_id', distinct=True))
        .order_by('sale_date')
    )

    # Monthly trend
    monthly = list(
        qs.values('sale_month')
        .annotate(revenue=Sum('line_total'), orders=Count('source_id', distinct=True))
        .order_by('sale_month')
    )

    return Response({
        'kpis': agg,
        'daily_trend': daily,
        'monthly_trend': monthly,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def hourly(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('sale_hour')
        .annotate(revenue=Sum('line_total'), orders=Count('source_id', distinct=True))
        .order_by('sale_hour')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_mix(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('payment_method')
        .annotate(revenue=Sum('line_total'), orders=Count('source_id', distinct=True))
        .order_by('-revenue')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def products(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('product_id', 'product_name', 'product_category', 'product_company')
        .annotate(
            revenue=Sum('line_total'),
            qty=Sum('quantity'),
            margin=Sum('gross_margin'),
            avg_margin_pct=Avg('margin_percent'),
        )
        .order_by('-revenue')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def categories(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('product_category')
        .annotate(revenue=Sum('line_total'), qty=Sum('quantity'), margin=Sum('gross_margin'))
        .order_by('-revenue')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def slow_movers(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('product_id', 'product_name', 'product_category')
        .annotate(revenue=Sum('line_total'), qty=Sum('quantity'))
        .order_by('qty')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def customers(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.filter(customer_id__isnull=False)
        .values('customer_id', 'customer_name', 'customer_type', 'customer_city')
        .annotate(
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
            avg_order=Avg('line_total'),
        )
        .order_by('-revenue')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def customer_segments(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.filter(customer_id__isnull=False)
        .values('customer_type')
        .annotate(
            count=Count('customer_id', distinct=True),
            revenue=Sum('line_total'),
        )
        .order_by('-revenue')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def doctors(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.filter(doctor_id__isnull=False)
        .values('doctor_id', 'doctor_name', 'doctor_specialization', 'doctor_hospital')
        .annotate(
            revenue=Sum('line_total'),
            prescriptions=Count('source_id', distinct=True),
            avg_rx_value=Avg('line_total'),
        )
        .order_by('-revenue')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def doctor_specialties(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.filter(doctor_id__isnull=False)
        .values('doctor_specialization')
        .annotate(revenue=Sum('line_total'), prescriptions=Count('source_id', distinct=True))
        .order_by('-revenue')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def returns_overview(request):
    f = parse_filters(request)
    qs = ReportSalesReturns.objects.filter(
        return_date__gte=f['start_date'], return_date__lte=f['end_date'],
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])

    agg = qs.aggregate(
        total_returns=Count('source_id', distinct=True),
        total_value=Sum('line_total'),
        total_qty=Sum('quantity'),
    )
    agg = {k: float(v or 0) for k, v in agg.items()}

    trend = list(qs.values('return_month').annotate(
        value=Sum('line_total'), count=Count('source_id', distinct=True),
    ).order_by('return_month'))

    by_reason = list(qs.values('reason').annotate(
        count=Count('id'), value=Sum('line_total'),
    ).order_by('-count')[:10])

    return Response({
        'kpis': agg,
        'trend': trend,
        'by_reason': by_reason,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def returns_by_category(request):
    f = parse_filters(request)
    qs = ReportSalesReturns.objects.filter(
        return_date__gte=f['start_date'], return_date__lte=f['end_date'],
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
def product_profitability(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('product_id', 'product_name', 'product_category')
        .annotate(
            revenue=Sum('line_total'),
            cost=Sum(F('purchase_rate') * F('quantity')),
            margin=Sum('gross_margin'),
            qty=Sum('quantity'),
        )
        .order_by('-margin')[:f['limit']]
    )
    for d in data:
        rev = float(d['revenue'] or 0)
        d['margin_pct'] = round(float(d['margin'] or 0) / rev * 100, 1) if rev else 0
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def customer_growth(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    data = list(
        qs.values('sale_month')
        .annotate(
            total_customers=Count('customer_id', distinct=True),
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
        )
        .order_by('sale_month')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def outstanding_aging(request):
    f = parse_filters(request)
    fin_qs = apply_financial_filters(
        ReportFinancial.objects.filter(is_posted=True, party_type='Customer', account_subtype='Receivable'), f
    )

    by_customer = list(
        fin_qs.values('party_id', 'party_name')
        .annotate(outstanding=Sum('debit') - Sum('credit'))
        .filter(outstanding__gt=0)
        .order_by('-outstanding')[:20]
    )
    total = float(fin_qs.aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)

    return Response({
        'total_outstanding': total,
        'by_customer': by_customer,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def doctor_prescription_trend(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(doctor_id__isnull=False), f)

    data = list(
        qs.values('sale_month')
        .annotate(
            prescriptions=Count('source_id', distinct=True),
            revenue=Sum('line_total'),
            doctors=Count('doctor_id', distinct=True),
        )
        .order_by('sale_month')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def doctor_radar(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(doctor_id__isnull=False), f)

    data = list(
        qs.values('doctor_id', 'doctor_name', 'doctor_specialization')
        .annotate(
            revenue=Sum('line_total'),
            prescriptions=Count('source_id', distinct=True),
            avg_rx_value=Avg('line_total'),
            product_diversity=Count('product_id', distinct=True),
            patient_count=Count('customer_id', distinct=True),
        )
        .order_by('-revenue')[:f['limit']]
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def returns_profit_impact(request):
    f = parse_filters(request)
    returns_qs = ReportSalesReturns.objects.filter(
        return_date__gte=f['start_date'], return_date__lte=f['end_date'],
    )
    if 'location_id' in f:
        returns_qs = returns_qs.filter(location_id=f['location_id'])

    sales_qs = apply_common_filters(ReportSales.objects.all(), f)

    returns_by_cat = {
        r['product_category']: float(r['return_value'] or 0)
        for r in returns_qs.values('product_category')
        .annotate(return_value=Sum('line_total'))
    }
    sales_by_cat = {
        s['product_category']: float(s['sales_value'] or 0)
        for s in sales_qs.values('product_category')
        .annotate(sales_value=Sum('line_total'))
    }

    data = []
    for cat in set(list(returns_by_cat.keys()) + list(sales_by_cat.keys())):
        rv = returns_by_cat.get(cat, 0)
        sv = sales_by_cat.get(cat, 0)
        data.append({
            'category': cat or 'Unknown',
            'return_value': rv,
            'sales_value': sv,
            'impact_pct': round(rv / sv * 100, 1) if sv else 0,
        })
    data.sort(key=lambda x: x['return_value'], reverse=True)

    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f).order_by('-sale_date')

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)

    data = list(page.values(
        'sale_date', 'invoice_no', 'channel', 'customer_name',
        'product_name', 'product_category', 'quantity', 'unit_price',
        'discount_amount', 'tax_percent', 'line_total', 'payment_method',
    )) if page else []
    return paginator.get_paginated_response(data)
