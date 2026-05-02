"""Sales Command Center API endpoints."""
from datetime import date as _date, timedelta as _timedelta

from django.db.models import Sum, Count, Avg, Max, F, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportSales, ReportSalesReturns, ReportFinancial, ReportInventory
from source_models.models import (
    POSOrderRO, POSOrderLineRO,
    B2BSalesOrderRO, B2BSalesOrderLineRO,
)
from .helpers import (
    parse_filters,
    apply_common_filters,
    apply_financial_filters,
    apply_common_filters_range,
    prior_period_range,
    growth_pct,
)


def _apply_returns_filters(qs, f):
    """Date + location + category filter for ReportSalesReturns.
    (The returns table has no channel/payment_method columns.)"""
    qs = qs.filter(return_date__gte=f['start_date'], return_date__lte=f['end_date'])
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        qs = qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        qs = qs.filter(product_category=f['category'])
    return qs


def _returns_range(qs, f, start, end):
    """Apply returns filters with explicit date override (for prior-period)."""
    qs = qs.filter(return_date__gte=start, return_date__lte=end)
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        qs = qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        qs = qs.filter(product_category=f['category'])
    return qs


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
        cogs=Sum(F('purchase_rate') * F('quantity')),
        gross_profit=Sum('gross_margin'),
    )
    total_revenue = float(agg['total_revenue'] or 0)
    total_orders = int(agg['total_orders'] or 0)
    total_qty = int(agg['total_qty'] or 0)
    avg_order_value = float(agg['avg_order_value'] or 0)
    cogs = float(agg['cogs'] or 0)
    gross_profit = float(agg['gross_profit'] or 0)

    cogs_pct = round(cogs / total_revenue * 100, 1) if total_revenue else 0.0
    gross_margin_pct = round(gross_profit / total_revenue * 100, 1) if total_revenue else 0.0
    avg_basket = round(total_revenue / total_orders, 2) if total_orders else 0.0

    # Returns impact (same filter set — date + location + category)
    returns_qs = _apply_returns_filters(ReportSalesReturns.objects.all(), f)
    returns_value = float(returns_qs.aggregate(v=Sum('line_total'))['v'] or 0)
    returns_impact = -returns_value
    net_profit = gross_profit - returns_value
    net_margin_pct = round(net_profit / total_revenue * 100, 1) if total_revenue else 0.0

    # Today revenue/orders
    today = _date.today()
    today_agg = qs.filter(sale_date=today).aggregate(
        rev=Sum('line_total'), ords=Count('source_id', distinct=True)
    )
    today_revenue = float(today_agg['rev'] or 0)
    today_orders = int(today_agg['ords'] or 0)
    yesterday_rev = float(
        qs.filter(sale_date=today - _timedelta(days=1))
        .aggregate(rev=Sum('line_total'))['rev'] or 0
    )
    today_revenue_growth_pct = growth_pct(today_revenue, yesterday_rev)

    # Prior-period comparison
    prev_start, prev_end = prior_period_range(f)
    prev_qs = apply_common_filters_range(ReportSales.objects.all(), f, prev_start, prev_end)
    prev_agg = prev_qs.aggregate(
        rev=Sum('line_total'),
        ords=Count('source_id', distinct=True),
        cogs=Sum(F('purchase_rate') * F('quantity')),
        gp=Sum('gross_margin'),
    )
    prev_rev = float(prev_agg['rev'] or 0)
    prev_ords = int(prev_agg['ords'] or 0)
    prev_cogs = float(prev_agg['cogs'] or 0)
    prev_gp = float(prev_agg['gp'] or 0)
    prev_basket = (prev_rev / prev_ords) if prev_ords else 0.0
    prev_margin_pct = (prev_gp / prev_rev * 100) if prev_rev else 0.0

    revenue_growth_pct = growth_pct(total_revenue, prev_rev)
    cogs_growth_pct = growth_pct(cogs, prev_cogs)
    avg_basket_growth_pct = growth_pct(avg_basket, prev_basket)
    margin_change_pp = round(gross_margin_pct - prev_margin_pct, 1)

    # Top margin product + its revenue growth
    top_margin_row = (
        qs.values('product_id', 'product_name')
        .annotate(m=Sum('gross_margin'), r=Sum('line_total'))
        .order_by('-m')
        .first()
    )
    top_margin_product = ''
    top_margin_product_growth = 0.0
    top_margin_product_pct = 0.0
    if top_margin_row:
        top_margin_product = top_margin_row.get('product_name') or ''
        cur_r = float(top_margin_row.get('r') or 0)
        cur_m = float(top_margin_row.get('m') or 0)
        top_margin_product_pct = round(cur_m / cur_r * 100, 1) if cur_r else 0.0
        prev_r = float(
            prev_qs.filter(product_id=top_margin_row['product_id'])
            .aggregate(r=Sum('line_total'))['r'] or 0
        )
        top_margin_product_growth = growth_pct(cur_r, prev_r)

    # Slow movers count from latest inventory snapshot
    slow_movers_count = 0
    latest_snapshot = (
        ReportInventory.objects.order_by('-snapshot_date')
        .values('snapshot_date').first()
    )
    if latest_snapshot:
        inv_qs = ReportInventory.objects.filter(
            snapshot_date=latest_snapshot['snapshot_date'],
            movement_status__in=['slow', 'dead'],
            qty_on_hand__gt=0,
        )
        if 'location_id' in f:
            inv_qs = inv_qs.filter(location_id=f['location_id'])
        elif 'location_ids' in f:
            inv_qs = inv_qs.filter(location_id__in=f['location_ids'])
        slow_movers_count = inv_qs.values('product_id').distinct().count()

    kpis = {
        'total_revenue': total_revenue,
        'total_orders': total_orders,
        'total_qty': total_qty,
        'avg_order_value': avg_order_value,
        'avg_basket': avg_basket,
        'cogs': cogs,
        'cogs_pct': cogs_pct,
        'gross_profit': gross_profit,
        'gross_margin_pct': gross_margin_pct,
        'net_profit': net_profit,
        'net_margin_pct': net_margin_pct,
        'returns_impact': returns_impact,
        'today_revenue': today_revenue,
        'today_orders': today_orders,
        'today_revenue_growth_pct': today_revenue_growth_pct,
        'revenue_growth_pct': revenue_growth_pct,
        'cogs_growth_pct': cogs_growth_pct,
        'avg_basket_growth_pct': avg_basket_growth_pct,
        'margin_change_pp': margin_change_pp,
        'top_margin_product': top_margin_product,
        'top_margin_product_pct': top_margin_product_pct,
        'top_margin_product_growth': top_margin_product_growth,
        'slow_movers_count': slow_movers_count,
    }

    daily = list(
        qs.values('sale_date')
        .annotate(revenue=Sum('line_total'), orders=Count('source_id', distinct=True))
        .order_by('sale_date')
    )
    monthly = list(
        qs.values('sale_month')
        .annotate(
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
            profit=Sum('gross_margin'),
        )
        .order_by('sale_month')
    )
    for m in monthly:
        rev = float(m['revenue'] or 0)
        prof = float(m['profit'] or 0)
        m['margin'] = round(prof / rev * 100, 1) if rev else 0.0

    return Response({
        'kpis': kpis,
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
            cost=Sum(F('purchase_rate') * F('quantity')),
            profit=Sum('gross_margin'),
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

    product_ids = [r['product_id'] for r in data]
    inv_map = {}
    status_map = {}
    if product_ids:
        latest = (
            ReportInventory.objects.order_by('-snapshot_date')
            .values('snapshot_date').first()
        )
        if latest:
            inv_qs = ReportInventory.objects.filter(
                snapshot_date=latest['snapshot_date'],
                product_id__in=product_ids,
            )
            if 'location_id' in f:
                inv_qs = inv_qs.filter(location_id=f['location_id'])
            elif 'location_ids' in f:
                inv_qs = inv_qs.filter(location_id__in=f['location_ids'])
            for row in inv_qs.values('product_id').annotate(
                stock_qty=Sum('qty_on_hand'),
                days_last_sold=Max('days_since_last_sale'),
            ):
                inv_map[row['product_id']] = row
            for row in (
                inv_qs.values('product_id', 'movement_status')
                .annotate(s=Sum('qty_on_hand'))
                .order_by('product_id', '-s')
            ):
                status_map.setdefault(row['product_id'], row['movement_status'])

    status_display = {'dead': 'declining', 'slow': 'stagnant'}
    for row in data:
        pid = row['product_id']
        inv = inv_map.get(pid, {})
        row['daysLastSold'] = inv.get('days_last_sold') or 0
        row['stockQty'] = inv.get('stock_qty') or 0
        ms = status_map.get(pid, '')
        row['status'] = status_display.get(ms, 'reviving')

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
    qs = _apply_returns_filters(ReportSalesReturns.objects.all(), f)
    sales_qs = apply_common_filters(ReportSales.objects.all(), f)

    agg = qs.aggregate(
        total_returns=Count('source_id', distinct=True),
        total_value=Sum('line_total'),
        total_qty=Sum('quantity'),
    )
    total_returns = int(agg['total_returns'] or 0)
    total_value = float(agg['total_value'] or 0)
    total_qty = int(agg['total_qty'] or 0)

    sales_agg = sales_qs.aggregate(
        rev=Sum('line_total'),
        gm=Sum('gross_margin'),
    )
    sales_value = float(sales_agg['rev'] or 0)
    sales_gm = float(sales_agg['gm'] or 0)

    return_rate_pct = round(total_value / sales_value * 100, 2) if sales_value else 0.0
    profit_impact_pct = round(total_value / sales_gm * 100, 1) if sales_gm else 0.0

    # Prior period for change metrics
    prev_start, prev_end = prior_period_range(f)
    prev_returns = float(
        _returns_range(ReportSalesReturns.objects.all(), f, prev_start, prev_end)
        .aggregate(v=Sum('line_total'))['v'] or 0
    )
    prev_sales = float(
        apply_common_filters_range(ReportSales.objects.all(), f, prev_start, prev_end)
        .aggregate(v=Sum('line_total'))['v'] or 0
    )
    prev_rate = (prev_returns / prev_sales * 100) if prev_sales else 0.0
    return_rate_change_pp = round(return_rate_pct - prev_rate, 2)
    profit_impact_change = round((-total_value) - (-prev_returns), 2)

    # by_reason (needed for top_action before returning)
    by_reason = list(qs.values('reason').annotate(
        count=Count('id'),
        value=Sum('line_total'),
        qty=Sum('quantity'),
    ).order_by('-count')[:10])

    top_reason = by_reason[0]['reason'] if by_reason else ''
    top_action = f"Address '{top_reason}' returns" if top_reason else ''

    kpis = {
        'total_returns': total_returns,
        'total_value': total_value,
        'total_return_value': total_value,
        'total_qty': total_qty,
        'return_rate_pct': return_rate_pct,
        'return_rate_change_pp': return_rate_change_pp,
        'net_profit_impact': -total_value,
        'profit_impact_pct': profit_impact_pct,
        'profit_impact_change': profit_impact_change,
        'top_action': top_action,
    }

    # Trend with rate per month
    sales_by_month = {
        r['sale_month']: float(r['v'] or 0)
        for r in sales_qs.values('sale_month').annotate(v=Sum('line_total'))
    }
    trend = list(qs.values('return_month').annotate(
        value=Sum('line_total'), count=Count('source_id', distinct=True),
    ).order_by('return_month'))
    for t in trend:
        val = float(t['value'] or 0)
        t['value'] = val
        sv = sales_by_month.get(t['return_month'], 0)
        t['rate'] = round(val / sv * 100, 2) if sv else 0.0

    # Prior-period reason counts for trend direction
    prior_counts = {
        r['reason']: int(r['c'] or 0)
        for r in _returns_range(ReportSalesReturns.objects.all(), f, prev_start, prev_end)
        .values('reason').annotate(c=Count('id'))
    }
    for r in by_reason:
        r['value'] = float(r['value'] or 0)
        r['percent'] = round(r['value'] / total_value * 100, 1) if total_value else 0
        prev_c = prior_counts.get(r['reason'], 0)
        cur_c = int(r['count'] or 0)
        if cur_c > prev_c * 1.1:
            r['trend'] = 'up'
        elif cur_c < prev_c * 0.9:
            r['trend'] = 'down'
        else:
            r['trend'] = 'stable'

    return Response({
        'kpis': kpis,
        'trend': trend,
        'by_reason': by_reason,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def returns_by_category(request):
    f = parse_filters(request)
    qs = _apply_returns_filters(ReportSalesReturns.objects.all(), f)
    sales_qs = apply_common_filters(ReportSales.objects.all(), f)

    sales_by_cat = {
        r['product_category']: float(r['v'] or 0)
        for r in sales_qs.values('product_category').annotate(v=Sum('line_total'))
    }

    data = list(
        qs.values('product_category')
        .annotate(count=Count('id'), value=Sum('line_total'), qty=Sum('quantity'))
        .order_by('-value')
    )
    for d in data:
        d['value'] = float(d['value'] or 0)
        d['returns'] = int(d['count'] or 0)
        sv = sales_by_cat.get(d['product_category'], 0)
        d['totalSales'] = sv
        d['rate'] = round(d['value'] / sv * 100, 2) if sv else 0.0
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def product_profitability(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    total_margin = float(qs.aggregate(m=Sum('gross_margin'))['m'] or 0)

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
        marg = float(d['margin'] or 0)
        d['margin_pct'] = round(marg / rev * 100, 1) if rev else 0
        d['profitContrib'] = round(marg / total_margin * 100, 1) if total_margin else 0
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

    top = list(
        qs.values('doctor_id', 'doctor_name', 'doctor_specialization')
        .annotate(
            revenue=Sum('line_total'),
            prescriptions=Count('source_id', distinct=True),
            avg_rx_value=Avg('line_total'),
            product_diversity=Count('product_id', distinct=True),
            patient_count=Count('customer_id', distinct=True),
        )
        .order_by('-revenue')[:3]
    )

    if not top:
        return Response([])

    metrics = [
        ('Revenue', 'revenue'),
        ('Prescriptions', 'prescriptions'),
        ('Avg Rx Value', 'avg_rx_value'),
        ('Product Diversity', 'product_diversity'),
        ('Patient Count', 'patient_count'),
    ]
    data = []
    for label, key in metrics:
        vals = [float(d[key] or 0) for d in top]
        max_val = max(vals) if max(vals) > 0 else 1
        row = {'metric': label}
        for d, v in zip(top, vals):
            name = d['doctor_name'] or f"Doctor {d['doctor_id']}"
            row[name] = round(v / max_val * 100, 1)
        data.append(row)
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def returns_profit_impact(request):
    f = parse_filters(request)
    sales_qs = apply_common_filters(ReportSales.objects.all(), f)
    returns_qs = _apply_returns_filters(ReportSalesReturns.objects.all(), f)

    gross_profit = float(sales_qs.aggregate(m=Sum('gross_margin'))['m'] or 0)
    returns_value = float(returns_qs.aggregate(v=Sum('line_total'))['v'] or 0)
    net_impact = gross_profit - returns_value

    data = [
        {'item': 'Gross Profit', 'value': gross_profit},
        {'item': 'Returns Revenue Loss', 'value': -returns_value},
        {'item': 'Net Profit Impact', 'value': net_impact},
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f).order_by('-sale_date').values(
        'sale_date', 'invoice_no', 'channel', 'customer_name',
        'product_name', 'product_category', 'quantity', 'unit_price',
        'discount_amount', 'discount_percent', 'tax_percent', 'line_total', 'payment_method',
    )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])


@api_view(['GET'])
@permission_classes([AllowAny])
def returns_detail(request):
    f = parse_filters(request)
    qs = _apply_returns_filters(ReportSalesReturns.objects.all(), f)
    qs = qs.order_by('-return_date').values(
        'return_date', 'return_no', 'return_type', 'original_invoice_no',
        'customer_name', 'product_name', 'product_category', 'batch_no',
        'quantity', 'unit_price', 'line_total', 'reason', 'status',
    )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])


# ──────────────────────────────────────────────────────────────────────────────
# Bill-level endpoints (Reports → Sales Bills page)
# ──────────────────────────────────────────────────────────────────────────────

def _channels_filter(f):
    """Returns set of normalised channel tokens or None when all-channels."""
    raw = f.get('channels') or ([f['channel']] if 'channel' in f else None)
    if not raw:
        return None
    return {c.strip().lower() for c in raw}


@api_view(['GET'])
@permission_classes([AllowAny])
def bills(request):
    """Bill-level list for Reports → Sales Bills (POS + B2B unioned)."""
    f = parse_filters(request)
    chans = _channels_filter(f)
    include_pos = chans is None or any('pos' in c for c in chans)
    include_b2b = chans is None or any('b2b' in c or 'wholesale' in c for c in chans)

    rows = []

    if include_pos:
        pos_qs = POSOrderRO.objects.filter(
            sale_date__date__gte=f['start_date'],
            sale_date__date__lte=f['end_date'],
        )
        if 'location_id' in f:
            pos_qs = pos_qs.filter(location_id=f['location_id'])
        elif 'location_ids' in f:
            pos_qs = pos_qs.filter(location_id__in=f['location_ids'])
        if 'payment_method' in f:
            pos_qs = pos_qs.filter(payment_type=f['payment_method'])
        elif 'payment_methods' in f:
            pos_qs = pos_qs.filter(payment_type__in=f['payment_methods'])

        pos_qs = pos_qs.values(
            'id', 'invoice_no', 'sale_date', 'customer_id', 'location_id',
            'payment_type', 'subtotal', 'discount_amount', 'gst_percent',
            'round_off', 'total_amount', 'status',
            'customer__customer_name', 'location__name',
        )
        for o in pos_qs:
            net = float(o['total_amount'] or 0)
            sub = float(o['subtotal'] or 0)
            disc = float(o['discount_amount'] or 0)
            roff = float(o['round_off'] or 0)
            gst = round(net - sub + disc - roff, 2)
            rows.append({
                'id': f"POS-{o['id']}",
                'type': 'POS',
                'invoice_no': o['invoice_no'] or f"POS-{o['id']}",
                'date': o['sale_date'].date().isoformat() if o['sale_date'] else None,
                'customer_id': o['customer_id'],
                'customer_name': o['customer__customer_name'] or 'Walk-in',
                'location_id': o['location_id'],
                'location_name': o['location__name'] or '',
                'subtotal': sub,
                'discount': disc,
                'gst': gst,
                'round_off': roff,
                'net_amount': net,
                'payment': o['payment_type'] or '',
                'status': (o['status'] or '').title() or 'Completed',
            })

    if include_b2b:
        b2b_qs = B2BSalesOrderRO.objects.filter(
            sale_date__gte=f['start_date'],
            sale_date__lte=f['end_date'],
        )
        if 'location_id' in f:
            b2b_qs = b2b_qs.filter(location_id=f['location_id'])
        elif 'location_ids' in f:
            b2b_qs = b2b_qs.filter(location_id__in=f['location_ids'])
        if 'payment_method' in f:
            b2b_qs = b2b_qs.filter(payment_type=f['payment_method'])
        elif 'payment_methods' in f:
            b2b_qs = b2b_qs.filter(payment_type__in=f['payment_methods'])

        b2b_qs = b2b_qs.values(
            'id', 'invoice_no', 'sale_date', 'customer_id', 'location_id',
            'payment_type', 'subtotal', 'discount_amount',
            'total_cgst', 'total_sgst', 'total_igst',
            'round_off', 'total_amount', 'status',
            'customer__customer_name', 'location__name',
        )
        for o in b2b_qs:
            gst = float((o['total_cgst'] or 0)) + float((o['total_sgst'] or 0)) + float((o['total_igst'] or 0))
            rows.append({
                'id': f"B2B-{o['id']}",
                'type': 'B2B',
                'invoice_no': o['invoice_no'] or f"B2B-{o['id']}",
                'date': o['sale_date'].isoformat() if o['sale_date'] else None,
                'customer_id': o['customer_id'],
                'customer_name': o['customer__customer_name'] or '',
                'location_id': o['location_id'],
                'location_name': o['location__name'] or '',
                'subtotal': float(o['subtotal'] or 0),
                'discount': float(o['discount_amount'] or 0),
                'gst': round(gst, 2),
                'round_off': float(o['round_off'] or 0),
                'net_amount': float(o['total_amount'] or 0),
                'payment': o['payment_type'] or '',
                'status': (o['status'] or '').title() or 'Confirmed',
            })

    rows.sort(key=lambda r: (r['date'] or '', r['invoice_no']), reverse=True)

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(rows, request)
    return paginator.get_paginated_response(page if page is not None else [])


@api_view(['GET'])
@permission_classes([AllowAny])
def bill_lines(request):
    """Line items for a single sales bill. Query params: type=POS|B2B, id=<int>."""
    bill_type = (request.query_params.get('type') or '').upper()
    raw_id = request.query_params.get('id', '')
    try:
        bill_id = int(raw_id)
    except (ValueError, TypeError):
        return Response({'detail': 'invalid id'}, status=400)

    if bill_type == 'POS':
        lines_qs = POSOrderLineRO.objects.filter(pos_order_id=bill_id).values(
            'id', 'product__name', 'batch_no', 'expiry_month',
            'quantity', 'unit_price', 'discount_percent', 'discount_amount',
            'tax_percent', 'line_total',
        )
        results = [
            {
                'sno': i + 1,
                'product_name': l['product__name'] or '',
                'batch': l['batch_no'] or '',
                'expiry': l['expiry_month'] or '',
                'qty': l['quantity'],
                'price': float(l['unit_price'] or 0),
                'mrp': 0,
                'discount_pct': float(l['discount_percent'] or 0),
                'gst_rate': float(l['tax_percent'] or 0),
                'gst_amt': 0,
                'line_total': float(l['line_total'] or 0),
            }
            for i, l in enumerate(lines_qs)
        ]
    elif bill_type == 'B2B':
        lines_qs = B2BSalesOrderLineRO.objects.filter(sales_order_id=bill_id).values(
            'id', 'product__name', 'service_description', 'batch_no', 'expiry_month',
            'quantity', 'unit_price', 'discount_percent',
            'tax_percent', 'cgst_amount', 'sgst_amount', 'igst_amount', 'line_total',
        )
        results = [
            {
                'sno': i + 1,
                'product_name': l['product__name'] or l['service_description'] or '',
                'batch': l['batch_no'] or '',
                'expiry': l['expiry_month'] or '',
                'qty': l['quantity'],
                'price': float(l['unit_price'] or 0),
                'mrp': 0,
                'discount_pct': float(l['discount_percent'] or 0),
                'gst_rate': float(l['tax_percent'] or 0),
                'gst_amt': float((l['cgst_amount'] or 0) + (l['sgst_amount'] or 0) + (l['igst_amount'] or 0)),
                'line_total': float(l['line_total'] or 0),
            }
            for i, l in enumerate(lines_qs)
        ]
    else:
        return Response({'detail': 'type must be POS or B2B'}, status=400)

    return Response({'results': results})
