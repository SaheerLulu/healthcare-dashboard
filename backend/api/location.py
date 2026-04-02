"""Location Benchmarking API endpoints."""
from django.db.models import Sum, Count, Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from reports.models import ReportSales, ReportInventory
from .helpers import parse_filters, apply_common_filters


@api_view(['GET'])
@permission_classes([AllowAny])
def comparison(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('location_id', 'location_name')
        .annotate(
            revenue=Sum('line_total'),
            profit=Sum('gross_margin'),
            orders=Count('source_id', distinct=True),
            customers=Count('customer_id', distinct=True),
            avg_margin_pct=Avg('margin_percent'),
        )
        .order_by('-revenue')
    )

    # Calculate margin % from profit/revenue
    for d in data:
        d['margin_pct'] = round(float(d['profit'] or 0) / float(d['revenue'] or 1) * 100, 2)

    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def trend(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('sale_month', 'location_id', 'location_name')
        .annotate(revenue=Sum('line_total'))
        .order_by('sale_month', 'location_name')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values('location_id', 'location_name', 'sale_month')
        .annotate(
            revenue=Sum('line_total'),
            profit=Sum('gross_margin'),
            orders=Count('source_id', distinct=True),
            qty=Sum('quantity'),
        )
        .order_by('location_name', 'sale_month')
    )
    return Response(data)
