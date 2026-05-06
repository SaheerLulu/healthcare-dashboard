"""Product Intelligence API endpoints."""
from django.db.models import Sum, Count, Avg, Max, Min
from rest_framework.decorators import api_view, permission_classes
from .permissions import DashboardPermission
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
@permission_classes([DashboardPermission])
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
@permission_classes([DashboardPermission])
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
@permission_classes([DashboardPermission])
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
@permission_classes([DashboardPermission])
def substitutability(request):
    """Substitutability / generic share (DASH-E13-F01-US02).

    For each molecule (active ingredient) compute:
      - companies        : distinct count of brands selling it
      - revenue          : total in the period
      - top_company      : highest-revenue brand for that molecule
      - top_share_pct    : top brand's share of the molecule's revenue
      - is_generic_market: companies >= 2 (multiple brands compete)

    Headline numbers:
      - generic_revenue_share : % of revenue in molecules with >=2 brands
      - top1_concentration_avg: avg(top brand share) across molecules
        (lower = more substitutable, higher = more brand-locked)

    Molecules with empty / null are excluded so the report stays clean.
    """
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f).exclude(product_molecule='')

    # Per-molecule × per-brand revenue.
    rows = list(
        qs.values('product_molecule', 'product_company')
        .annotate(revenue=Sum('line_total'), qty=Sum('quantity'))
    )
    if not rows:
        return Response({
            'generic_revenue_share': 0.0,
            'top1_concentration_avg': 0.0,
            'molecules': [],
        })

    by_mol: dict = {}
    for r in rows:
        mol = r['product_molecule']
        by_mol.setdefault(mol, []).append(r)

    molecules = []
    grand_total = 0.0
    generic_total = 0.0
    top_share_sum = 0.0
    top_share_n = 0
    for mol, brands in by_mol.items():
        brand_count = len(brands)
        rev = sum(float(b['revenue'] or 0) for b in brands)
        if rev <= 0:
            continue
        brands_sorted = sorted(brands, key=lambda b: float(b['revenue'] or 0), reverse=True)
        top = brands_sorted[0]
        top_rev = float(top['revenue'] or 0)
        top_share = (top_rev / rev * 100.0) if rev else 0.0
        is_generic = brand_count >= 2

        grand_total += rev
        if is_generic:
            generic_total += rev
        top_share_sum += top_share
        top_share_n += 1

        molecules.append({
            'molecule': mol,
            'companies': brand_count,
            'revenue': round(rev, 2),
            'top_company': top['product_company'] or '—',
            'top_share_pct': round(top_share, 2),
            'is_generic_market': is_generic,
        })

    molecules.sort(key=lambda m: m['revenue'], reverse=True)

    return Response({
        'generic_revenue_share': round(generic_total / grand_total * 100.0, 2) if grand_total else 0.0,
        'top1_concentration_avg': round(top_share_sum / top_share_n, 2) if top_share_n else 0.0,
        'molecules_total': len(molecules),
        'molecules': molecules[:int(request.query_params.get('limit') or 50)],
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
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
