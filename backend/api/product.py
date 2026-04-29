"""Product Intelligence API endpoints."""
from django.db.models import Sum, Count, Avg, Max, Min
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from reports.models import ReportSales, ReportInventory, ReportPurchases
from .helpers import parse_filters, apply_common_filters


def _fmt_inr(value):
    v = abs(value)
    if v >= 10000000:
        return f'₹{v / 10000000:.2f}Cr'
    if v >= 100000:
        return f'₹{v / 100000:.2f}L'
    if v >= 1000:
        return f'₹{v / 1000:.1f}K'
    return f'₹{v:.0f}'


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    f = parse_filters(request)

    # Latest inventory snapshot
    latest = ReportInventory.objects.order_by('-snapshot_date').values('snapshot_date').first()
    inv_qs = ReportInventory.objects.filter(snapshot_date=latest['snapshot_date']) if latest else ReportInventory.objects.none()
    if 'location_id' in f:
        inv_qs = inv_qs.filter(location_id=f['location_id'])

    active_skus = inv_qs.filter(qty_on_hand__gt=0).values('product_id').distinct().count()
    fast_moving = inv_qs.filter(movement_status='fast').values('product_id').distinct().count()
    slow_moving = inv_qs.filter(movement_status__in=['slow', 'dead']).values('product_id').distinct().count()
    portfolio_value = float(inv_qs.aggregate(total=Sum('stock_value_cost'))['total'] or 0)

    # Avg margin from sales
    sales_qs = apply_common_filters(ReportSales.objects.all(), f)
    avg_margin = float(sales_qs.aggregate(avg=Avg('margin_percent'))['avg'] or 0)

    return Response({
        'active_skus': active_skus,
        'active_skus_subtitle': 'with stock > 0',
        'active_skus_trend': '0',
        'avg_margin_display': f'{avg_margin:.1f}%',
        'avg_margin_subtitle': 'across all products',
        'avg_margin_trend': '0pp',
        'fast_moving': fast_moving,
        'fast_moving_subtitle': 'high demand SKUs',
        'fast_moving_trend': '0',
        'slow_moving': slow_moving,
        'slow_moving_subtitle': 'slow + dead stock',
        'slow_moving_trend': '0',
        'portfolio_value_display': _fmt_inr(portfolio_value),
        'portfolio_value_subtitle': 'at cost',
        'portfolio_value_trend': '0%',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def lifecycle(request):
    """Classify products by lifecycle stage and aggregate counts per stage.
    The Pie chart on /product expects one slice per stage, not per product."""
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    products = list(
        qs.values('product_id', 'product_name', 'product_category')
        .annotate(
            revenue=Sum('line_total'),
            qty=Sum('quantity'),
            months_active=Count('sale_month', distinct=True),
        )
    )

    # Bucket each product into a stage, then aggregate counts + revenue.
    stage_buckets = {
        'Introduction': {'count': 0, 'revenue': 0.0},
        'Growth': {'count': 0, 'revenue': 0.0},
        'Maturity': {'count': 0, 'revenue': 0.0},
        'Decline': {'count': 0, 'revenue': 0.0},
    }
    for p in products:
        months = p['months_active'] or 1
        rev = float(p['revenue'] or 0)
        if months <= 2:
            stage = 'Introduction'
        elif rev > 0 and months <= 4:
            stage = 'Growth'
        elif rev > 0:
            stage = 'Maturity'
        else:
            stage = 'Decline'
        stage_buckets[stage]['count'] += 1
        stage_buckets[stage]['revenue'] += rev

    # Return one row per stage so the chart renders one slice per stage.
    return Response([
        {'stage': stage, 'count': v['count'], 'revenue': round(v['revenue'], 2)}
        for stage, v in stage_buckets.items()
    ])


@api_view(['GET'])
@permission_classes([AllowAny])
def pricing(request):
    f = parse_filters(request)

    # Average purchase rate and selling price per product. dict() over a
    # 3-column values_list raises ValueError ("dictionary update sequence
    # element #0 has length 3; 2 is required") — build a dict-of-dicts.
    purchase_data = {
        row['product_id']: {
            'avg_cost': float(row['avg_cost'] or 0),
            'avg_mrp': float(row['avg_mrp'] or 0),
        }
        for row in ReportPurchases.objects
        .filter(bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=False)
        .values('product_id')
        .annotate(avg_cost=Avg('purchase_rate'), avg_mrp=Avg('mrp'))
    }

    sales_qs = apply_common_filters(ReportSales.objects.all(), f)
    products = list(
        sales_qs.values('product_id', 'product_name', 'product_category')
        .annotate(
            avg_selling_price=Avg('unit_price'),
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total'),
        )
        .order_by('-total_revenue')[:f['limit']]
    )

    # Enrich with cost / MRP from purchase_data
    for p in products:
        purchase = purchase_data.get(p['product_id'], {})
        p['avg_cost'] = purchase.get('avg_cost', 0)
        p['avg_mrp'] = purchase.get('avg_mrp', 0)
        sp = float(p['avg_selling_price'] or 0)
        cost = p['avg_cost']
        p['margin_pct'] = round((sp - cost) / sp * 100, 1) if sp else 0

    return Response(products)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    data = list(
        qs.values(
            'product_id', 'product_name', 'product_code',
            'product_category', 'product_company', 'product_molecule',
        )
        .annotate(
            revenue=Sum('line_total'),
            qty=Sum('quantity'),
            margin=Sum('gross_margin'),
            avg_price=Avg('unit_price'),
            orders=Count('source_id', distinct=True),
        )
        .order_by('-revenue')
    )
    return Response(data)
