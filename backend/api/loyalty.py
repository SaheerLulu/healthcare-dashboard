"""Loyalty Analytics API endpoints."""
from django.db.models import Sum, Count, Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from reports.models import ReportSales
from .helpers import parse_filters, apply_common_filters


def _fmt_num(value):
    v = abs(value)
    if v >= 10000000:
        return f'{v / 10000000:.2f}Cr'
    if v >= 100000:
        return f'{v / 100000:.2f}L'
    if v >= 1000:
        return f'{v / 1000:.1f}K'
    return str(int(v))


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    total_members = qs.values('customer_id').distinct().count()
    agg = qs.aggregate(
        points_issued=Sum('customer_loyalty_points'),
        points_redeemed=Sum('loyalty_points_redeemed'),
    )
    issued = float(agg['points_issued'] or 0)
    redeemed = float(agg['points_redeemed'] or 0)
    balance = issued - redeemed
    avg_redemption = round(redeemed / issued * 100, 1) if issued else 0

    return Response({
        'total_members_display': _fmt_num(total_members),
        'total_members_subtitle': 'unique customers',
        'total_members_trend': '0%',
        'points_issued_display': _fmt_num(issued),
        'points_issued_subtitle': 'total earned',
        'points_issued_trend': '0%',
        'points_redeemed_display': _fmt_num(redeemed),
        'points_redeemed_subtitle': f'{avg_redemption}% redemption',
        'points_redeemed_trend': '0pp',
        'points_balance_display': _fmt_num(balance),
        'points_balance_subtitle': 'outstanding liability',
        'points_balance_trend': '0%',
        'avg_redemption_display': f'{avg_redemption}%',
        'avg_redemption_subtitle': 'redemption rate',
        'avg_redemption_trend': '0pp',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def tiers(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    data = list(
        qs.values('customer_type')
        .annotate(
            members=Count('customer_id', distinct=True),
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
            avg_order_value=Avg('line_total'),
        )
        .order_by('-revenue')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def redemption(request):
    f = parse_filters(request)
    qs = apply_common_filters(
        ReportSales.objects.filter(loyalty_points_redeemed__gt=0), f
    )

    trend = list(
        qs.values('sale_month')
        .annotate(
            points_redeemed=Sum('loyalty_points_redeemed'),
            redemption_value=Sum('loyalty_redemption_amount'),
            transactions=Count('source_id', distinct=True),
        )
        .order_by('sale_month')
    )
    return Response(trend)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    data = list(
        qs.values('customer_id', 'customer_name', 'customer_type', 'customer_loyalty_points')
        .annotate(
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
            points_redeemed=Sum('loyalty_points_redeemed'),
        )
        .order_by('-revenue')
    )
    return Response(data)
