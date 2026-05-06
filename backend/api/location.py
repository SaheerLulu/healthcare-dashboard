"""Location Benchmarking API endpoints."""
from django.db.models import Sum, Count, Avg
from rest_framework.decorators import api_view, permission_classes
from .permissions import DashboardPermission
from rest_framework.response import Response

from reports.models import ReportSales, ReportInventory
from .helpers import parse_filters, apply_common_filters


@api_view(['GET'])
@permission_classes([DashboardPermission])
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
@permission_classes([DashboardPermission])
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
@permission_classes([DashboardPermission])
def radar(request):
    """Per-store profitability radar (DASH-E12-F01-US02).

    Returns one entry per location with five normalised metrics on a
    0-100 scale so the frontend can plot them on a radar chart without
    further normalisation:

      - revenue_score        : revenue / max(revenue across stores)
      - margin_score         : margin_pct (already 0-100ish, capped)
      - basket_score         : avg basket / max basket
      - turnover_score       : avg inventory turnover (capped at 12)
      - return_health_score  : 100 - returns_share (lower returns = better)
    """
    f = parse_filters(request)
    sales_qs = apply_common_filters(ReportSales.objects.all(), f)

    rows = list(
        sales_qs.values('location_id', 'location_name')
        .annotate(
            revenue=Sum('line_total'),
            profit=Sum('gross_margin'),
            orders=Count('source_id', distinct=True),
            qty=Sum('quantity'),
        )
    )
    if not rows:
        return Response({'metrics': ['Revenue', 'Margin', 'Basket', 'Turnover', 'Return health'], 'series': []})

    # Per-store inventory turnover (avg across SKUs at this location).
    inv_by_loc = {
        x['location_id']: float(x['avg_turnover'] or 0)
        for x in ReportInventory.objects.values('location_id')
        .annotate(avg_turnover=Avg('inventory_turnover'))
    }
    # Returns share — % of revenue offset by returns at the same store.
    from reports.models import ReportSalesReturns
    returns_by_loc = {
        x['location_id']: float(x['return_total'] or 0)
        for x in ReportSalesReturns.objects.filter(
            return_date__gte=f['start_date'], return_date__lte=f['end_date']
        ).values('location_id').annotate(return_total=Sum('line_total'))
    }

    max_revenue = max(float(r['revenue'] or 0) for r in rows) or 1.0
    max_basket = 0.0
    for r in rows:
        revenue = float(r['revenue'] or 0)
        orders = int(r['orders'] or 0)
        basket = revenue / orders if orders else 0
        if basket > max_basket:
            max_basket = basket
    max_basket = max_basket or 1.0

    series = []
    for r in rows:
        revenue = float(r['revenue'] or 0)
        profit = float(r['profit'] or 0)
        orders = int(r['orders'] or 0)
        margin_pct = (profit / revenue * 100.0) if revenue else 0.0
        basket = (revenue / orders) if orders else 0.0
        turnover = inv_by_loc.get(r['location_id'], 0.0)
        returns = returns_by_loc.get(r['location_id'], 0.0)
        returns_share = (returns / revenue * 100.0) if revenue else 0.0

        series.append({
            'location_id': r['location_id'],
            'location_name': r['location_name'] or f"Location {r['location_id']}",
            'revenue': revenue,
            'profit': profit,
            'orders': orders,
            'qty': int(r['qty'] or 0),
            'margin_pct': round(margin_pct, 2),
            'basket': round(basket, 2),
            'turnover': round(turnover, 2),
            'returns_share': round(returns_share, 2),
            # Radar axes: all on 0-100.
            'scores': {
                'revenue': round(revenue / max_revenue * 100.0, 1),
                'margin': round(min(max(margin_pct, 0), 60) / 60.0 * 100.0, 1),
                'basket': round(basket / max_basket * 100.0, 1),
                'turnover': round(min(turnover, 12) / 12.0 * 100.0, 1),
                'return_health': round(max(0.0, 100.0 - returns_share), 1),
            },
        })

    series.sort(key=lambda r: r['revenue'], reverse=True)
    return Response({
        'metrics': ['Revenue', 'Margin', 'Basket', 'Turnover', 'Return health'],
        'series': series,
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
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
