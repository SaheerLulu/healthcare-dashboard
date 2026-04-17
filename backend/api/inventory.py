"""Inventory Operations API endpoints."""
from datetime import date as _date, timedelta as _timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Avg, Q, F, Max, Min, StdDev
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportInventory, ReportSales, ReportPurchases
from .helpers import parse_filters


HOLDING_RATE = 0.25  # Annual inventory carrying rate (industry standard)
COST_COMPONENTS = {
    'storage': 0.07,
    'insurance': 0.02,
    'obsolescence': 0.10,
    'financing': 0.06,
}

MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def _month_label(period):
    """'2025-10' -> 'Oct'."""
    if not period or '-' not in str(period):
        return str(period or '')
    try:
        mm = int(str(period).split('-')[1])
        return MONTH_SHORT[mm] if 1 <= mm <= 12 else period
    except (ValueError, IndexError):
        return str(period)


def _recent_months(n=6):
    """List of ('YYYY-MM', 'Mon') for the last n months including current, oldest first."""
    today = _date.today()
    months = []
    y, m = today.year, today.month
    for _ in range(n):
        months.append((f"{y:04d}-{m:02d}", MONTH_SHORT[m]))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(months))


def _latest_snapshot():
    """Get queryset for the latest inventory snapshot."""
    latest = ReportInventory.objects.order_by('-snapshot_date').values('snapshot_date').first()
    if not latest:
        return ReportInventory.objects.none()
    return ReportInventory.objects.filter(snapshot_date=latest['snapshot_date'])


def _apply_inventory_filters(qs, f):
    """Apply location + category filters to ReportInventory queryset."""
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
    qs = _apply_inventory_filters(_latest_snapshot(), f)

    agg = qs.aggregate(
        total_value=Sum('stock_value_cost'),
        total_mrp_value=Sum('stock_value_mrp'),
        total_items=Count('product_id', distinct=True),
        total_qty=Sum('qty_on_hand'),
        low_stock_count=Count('id', filter=Q(reorder_needed=True)),
        dead_stock_count=Count('id', filter=Q(movement_status='dead')),
        dead_stock_value=Sum('stock_value_cost', filter=Q(movement_status='dead')),
        fast_moving_items=Count('product_id', distinct=True, filter=Q(movement_status='fast')),
        stockout_alerts=Count('id', filter=Q(qty_on_hand=0) | Q(reorder_needed=True)),
        near_expiry_value=Sum(
            'stock_value_cost',
            filter=Q(expiry_status__in=['expired', 'critical_30', 'critical_60']),
        ),
        near_expiry_items=Count(
            'product_id', distinct=True,
            filter=Q(expiry_status__in=['expired', 'critical_30', 'critical_60']),
        ),
        avg_dsi=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
        avg_turnover=Avg('inventory_turnover', filter=Q(inventory_turnover__gt=0)),
        avg_gmroi=Avg('gmroi', filter=Q(gmroi__gt=0)),
        avg_fill_rate=Avg('fill_rate'),
    )
    agg = {k: float(v or 0) for k, v in agg.items()}
    total_value = agg['total_value']

    # Aliases for flexible frontend access
    agg['total_stock_value'] = total_value
    agg['fast_moving'] = agg['fast_moving_items']
    agg['stock_out_alerts'] = agg['stockout_alerts']
    agg['inventory_turnover'] = agg['avg_turnover']
    agg['turnover'] = agg['avg_turnover']
    agg['dsi'] = agg['avg_dsi']
    agg['stock_turns'] = agg['avg_turnover']
    agg['gmroi'] = agg['avg_gmroi']

    # Carrying cost (25% annual, split across components)
    carrying_annual = total_value * HOLDING_RATE
    agg['carrying_cost_annual'] = round(carrying_annual, 2)
    agg['carrying_cost_monthly'] = round(carrying_annual / 12, 2)
    agg['carrying_cost'] = agg['carrying_cost_monthly']

    # Write-offs this month = stock value of items marked expired for current month
    this_month = _date.today().strftime('%Y-%m')
    write_offs = float(
        qs.filter(expiry_status='expired', expiry_month=this_month)
        .aggregate(w=Sum('stock_value_cost'))['w'] or 0
    )
    # If no exact-month match (pipeline may lag), fall back to all expired
    if write_offs == 0:
        write_offs = float(
            qs.filter(expiry_status='expired').aggregate(w=Sum('stock_value_cost'))['w'] or 0
        )
    agg['write_offs'] = write_offs
    agg['writeoffs_this_month'] = write_offs

    # Stockout lost sales (approx): products with qty=0 and positive demand
    lost_sales = float(
        qs.filter(qty_on_hand=0, avg_daily_demand__gt=0)
        .aggregate(l=Sum(F('mrp') * F('avg_daily_demand') * 30))['l'] or 0
    )
    agg['stockout_lost_sales'] = lost_sales
    agg['lost_sales'] = lost_sales

    # Optimization potential = ~60% recoverable from dead stock + overstock
    tied_capital = float(
        qs.filter(
            Q(movement_status='dead') |
            Q(days_of_stock__gt=180, days_of_stock__lt=9999)
        ).aggregate(o=Sum('stock_value_cost'))['o'] or 0
    )
    agg['optimization_potential'] = round(tied_capital * 0.6, 2)

    return Response(agg)


@api_view(['GET'])
@permission_classes([AllowAny])
def by_category(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)

    data = list(
        qs.values('product_category')
        .annotate(
            value=Sum('stock_value_cost'),
            mrp_value=Sum('stock_value_mrp'),
            qty=Sum('qty_on_hand'),
            items=Count('product_id', distinct=True),
            fast_moving=Count(
                'product_id', distinct=True,
                filter=Q(movement_status='fast'),
            ),
        )
        .order_by('-value')
    )
    for d in data:
        d['category'] = d['product_category'] or 'Uncategorized'
        d['fastMoving'] = int(d['fast_moving'] or 0)
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def expiry(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)

    # Bucket by days_to_expiry; stock with no days_to_expiry signal lands in Safe
    buckets = [
        ('Expired',   'critical',  Q(expiry_status='expired') | Q(days_to_expiry__lt=0)),
        ('0-30 days', 'critical',  Q(days_to_expiry__gte=0, days_to_expiry__lte=30)),
        ('31-60 days', 'warning',  Q(days_to_expiry__gt=30, days_to_expiry__lte=60)),
        ('61-90 days', 'attention', Q(days_to_expiry__gt=60, days_to_expiry__lte=90)),
        ('>90 days',  'safe',      Q(days_to_expiry__gt=90)),
    ]
    data = []
    for label, status, condition in buckets:
        agg = qs.filter(condition).aggregate(
            qty=Sum('qty_on_hand'),
            value=Sum('stock_value_cost'),
            count=Count('id'),
        )
        data.append({
            'range': label,
            'expiry_range': label,
            'status': status,
            'qty': int(agg['qty'] or 0),
            'value': float(agg['value'] or 0),
            'count': int(agg['count'] or 0),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def movement_trend(request):
    f = parse_filters(request)

    p_qs = ReportPurchases.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=False,
    )
    s_qs = ReportSales.objects.filter(
        sale_date__gte=f['start_date'], sale_date__lte=f['end_date'],
    )
    if 'location_id' in f:
        p_qs = p_qs.filter(location_id=f['location_id'])
        s_qs = s_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        p_qs = p_qs.filter(location_id__in=f['location_ids'])
        s_qs = s_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        p_qs = p_qs.filter(product_category__in=f['categories'])
        s_qs = s_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        p_qs = p_qs.filter(product_category=f['category'])
        s_qs = s_qs.filter(product_category=f['category'])

    inbound_rows = list(
        p_qs.values('purchase_month')
        .annotate(qty=Sum('quantity'), value=Sum('line_total'))
    )
    outbound_rows = list(
        s_qs.values('sale_month')
        .annotate(qty=Sum('quantity'), value=Sum('line_total'))
    )

    inbound_by_month = {r['purchase_month']: r for r in inbound_rows if r['purchase_month']}
    outbound_by_month = {r['sale_month']: r for r in outbound_rows if r['sale_month']}

    months = sorted(set(list(inbound_by_month.keys()) + list(outbound_by_month.keys())))
    if not months:
        months = [m for m, _ in _recent_months(6)]

    # Closing stock derivation: start from current snapshot total, walk backwards
    current_qty = int(
        _apply_inventory_filters(_latest_snapshot(), f)
        .aggregate(q=Sum('qty_on_hand'))['q'] or 0
    )
    flat = []
    # Build newest-first so we can back out qty_on_hand
    closing_by_month = {}
    running = current_qty
    for m in reversed(months):
        inb = inbound_by_month.get(m, {})
        outb = outbound_by_month.get(m, {})
        closing_by_month[m] = running
        running = running - int(inb.get('qty') or 0) + int(outb.get('qty') or 0)

    for m in months:
        inb = inbound_by_month.get(m, {})
        outb = outbound_by_month.get(m, {})
        flat.append({
            'period': m,
            'month': _month_label(m),
            'inbound': int(inb.get('qty') or 0),
            'outbound': int(outb.get('qty') or 0),
            'inbound_value': float(inb.get('value') or 0),
            'outbound_value': float(outb.get('value') or 0),
            'closing': max(0, closing_by_month.get(m, 0)),
        })

    # Legacy shape for any callers that still destructure {inbound, outbound}
    return Response({
        'data': flat,
        'inbound': [
            {'purchase_month': r['period'], 'qty': r['inbound'], 'value': r['inbound_value']}
            for r in flat
        ],
        'outbound': [
            {'sale_month': r['period'], 'qty': r['outbound'], 'value': r['outbound_value']}
            for r in flat
        ],
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def abc_ved(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)

    # Priority ranking of the 9 ABC x VED cells
    # (A = high revenue, V = vital medicine)
    priority = {
        ('A', 'V'): 'high-priority',
        ('A', 'E'): 'high',
        ('B', 'V'): 'high',
        ('A', 'D'): 'medium',
        ('B', 'E'): 'medium',
        ('C', 'V'): 'medium',
        ('B', 'D'): 'low',
        ('C', 'E'): 'low',
        ('C', 'D'): 'low',
    }

    raw = list(
        qs.values('abc_class', 'product_ved_class')
        .annotate(count=Count('product_id', distinct=True), value=Sum('stock_value_cost'))
        .order_by('abc_class', 'product_ved_class')
    )
    data = []
    for r in raw:
        abc = (r['abc_class'] or '').upper() or 'C'
        ved = (r['product_ved_class'] or '').upper() or 'D'
        classification = f"{abc}-{ved}"
        data.append({
            'classification': classification,
            'abc_class': abc,
            'product_ved_class': ved,
            'items': int(r['count'] or 0),
            'value': float(r['value'] or 0),
            'count': int(r['count'] or 0),
            'status': priority.get((abc, ved), 'low'),
        })
    data.sort(key=lambda x: (-x['value'],))
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def dead_stock(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f).filter(
        movement_status='dead', qty_on_hand__gt=0,
    )

    data = list(
        qs.values(
            'product_id', 'product_name', 'product_category',
            'qty_on_hand', 'stock_value_cost', 'days_since_last_sale',
            'last_sale_date', 'location_name',
        )
        .order_by('-stock_value_cost')[:f['limit']]
    )
    for r in data:
        days = int(r.get('days_since_last_sale') or 0)
        r['product'] = r.get('product_name') or ''
        r['qty'] = int(r.get('qty_on_hand') or 0)
        r['value'] = float(r.get('stock_value_cost') or 0)
        r['lastSold'] = f"{days}d ago" if days else 'Never'
        r['last_sold'] = r['lastSold']
        r['category'] = r.get('product_category') or 'Uncategorized'
        if days >= 180:
            r['reason'] = f"No sales in {days}d — discontinue"
        elif days >= 90:
            r['reason'] = f"Slow-moving {days}d — liquidate"
        else:
            r['reason'] = "Marked dead by pipeline"
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def forecast(request):
    """Demand forecast, seasonality, accuracy and safety-stock analysis."""
    f = parse_filters(request)
    inv_qs = _apply_inventory_filters(_latest_snapshot(), f)

    # Sales history (last 12 months)
    today = _date.today()
    horizon_start = today.replace(day=1) - _timedelta(days=365)
    sales_qs = ReportSales.objects.filter(sale_date__gte=horizon_start)
    if 'location_id' in f:
        sales_qs = sales_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        sales_qs = sales_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        sales_qs = sales_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        sales_qs = sales_qs.filter(product_category=f['category'])

    monthly_sales = {
        r['sale_month']: float(r['q'] or 0)
        for r in sales_qs.values('sale_month').annotate(q=Sum('quantity'))
    }

    months = _recent_months(12)
    period_keys = [p for p, _ in months]
    actual_series = [monthly_sales.get(p, 0) for p in period_keys]

    # Forecast = 3-month moving average, applied across the series
    def moving_avg(series, window=3):
        out = []
        for i in range(len(series)):
            start = max(0, i - window + 1)
            window_vals = series[start:i + 1]
            out.append(sum(window_vals) / len(window_vals) if window_vals else 0)
        return out
    forecast_series = moving_avg(actual_series, 3)

    demand = []
    for (period, label), actual, pred in zip(months, actual_series, forecast_series):
        demand.append({
            'period': period,
            'month': label,
            'actual': round(actual, 2),
            'forecast': round(pred, 2),
            'upper': round(pred * 1.15, 2),
            'lower': round(pred * 0.85, 2),
        })

    # Seasonal index: monthly sales / avg monthly * 100
    avg_month = sum(actual_series) / len(actual_series) if actual_series else 0
    # Top category per month
    top_cat_by_month = {}
    for r in (
        sales_qs.values('sale_month', 'product_category')
        .annotate(q=Sum('quantity')).order_by('sale_month', '-q')
    ):
        top_cat_by_month.setdefault(r['sale_month'], r['product_category'] or 'Mixed')
    seasonal = []
    for (period, label), actual in zip(months, actual_series):
        idx = round((actual / avg_month * 100), 1) if avg_month else 100.0
        seasonal.append({
            'period': period,
            'month': label,
            'index': idx,
            'peakCategory': top_cat_by_month.get(period, 'Mixed'),
        })

    # Forecast accuracy per category (using last 3 months' actual vs 3-month prior MA)
    cat_monthly = {}
    for r in sales_qs.values('sale_month', 'product_category').annotate(q=Sum('quantity')):
        cat_monthly.setdefault(r['product_category'] or 'Uncategorized', {})[r['sale_month']] = float(r['q'] or 0)

    accuracy = []
    mape_total = []
    for cat, by_m in cat_monthly.items():
        series = [by_m.get(p, 0) for p in period_keys]
        pred_series = moving_avg(series, 3)
        # last 6 months comparison
        errors = []
        for a, p in zip(series[-6:], pred_series[-6:]):
            if a > 0:
                errors.append(abs(a - p) / a * 100)
        if not errors:
            continue
        mape = sum(errors) / len(errors)
        mape = min(mape, 100.0)
        bias = round(
            (sum(series[-6:]) - sum(pred_series[-6:])) /
            (sum(pred_series[-6:]) or 1) * 100, 1
        )
        accuracy.append({
            'category': cat,
            'mape': round(mape, 1),
            'bias': bias,
            'accuracy': round(100 - mape, 1),
        })
        mape_total.append(mape)
    accuracy.sort(key=lambda x: -x['accuracy'])
    accuracy = accuracy[:10]

    overall_mape = sum(mape_total) / len(mape_total) if mape_total else 0
    accuracy_pct = round(100 - overall_mape, 1)

    # Safety stock: one row per product with demand, using snapshot fields
    LEAD_TIME_DAYS = 7
    SERVICE_LEVEL = 95
    safety_stock_rows = list(
        inv_qs.filter(avg_daily_demand__gt=0)
        .values(
            'product_id', 'product_name', 'avg_daily_demand', 'safety_stock',
            'qty_on_hand', 'days_of_stock', 'reorder_needed',
        )
        .order_by('days_of_stock')[:f.get('limit', 10) or 10]
    )
    safety_stock = []
    for r in safety_stock_rows:
        demand_per_day = float(r.get('avg_daily_demand') or 0)
        ss = float(r.get('safety_stock') or 0)
        if ss == 0:
            ss = round(demand_per_day * 1.65 * (LEAD_TIME_DAYS ** 0.5), 0)  # 95% service
        rop = round(demand_per_day * LEAD_TIME_DAYS + ss, 0)
        qty = int(r.get('qty_on_hand') or 0)
        if qty == 0:
            status = 'stockout'
        elif qty < rop:
            status = 'below-rop'
        elif qty > rop * 3:
            status = 'overstock'
        else:
            status = 'healthy'
        safety_stock.append({
            'product': r.get('product_name') or '',
            'avgDemand': round(demand_per_day, 2),
            'leadTime': LEAD_TIME_DAYS,
            'serviceLevel': SERVICE_LEVEL,
            'safetyStock': ss,
            'reorderPoint': rop,
            'currentStock': qty,
            'status': status,
        })

    # KPI summaries
    next_label = demand[-1]['month'] if demand else ''
    next_forecast = demand[-1]['forecast'] if demand else 0
    peak = max(seasonal, key=lambda r: r['index']) if seasonal else None
    seasonal_peak = peak['month'] if peak else ''
    seasonal_peak_note = (
        f"Index {peak['index']:.0f} — top: {peak['peakCategory']}"
        if peak else ''
    )
    reorder_alerts = inv_qs.filter(reorder_needed=True).count()
    overstock_risk = inv_qs.filter(
        days_of_stock__gt=180, days_of_stock__lt=9999,
    ).count()

    return Response({
        'demand': demand,
        'seasonal': seasonal,
        'accuracy': accuracy,
        'safety_stock': safety_stock,
        'accuracy_pct': accuracy_pct,
        'mape': round(overall_mape, 1),
        'next_month_demand': next_forecast,
        'next_month_label': next_label,
        'seasonal_peak': seasonal_peak,
        'seasonal_peak_note': seasonal_peak_note,
        'reorder_alerts': reorder_alerts,
        'reorder_note': f"{reorder_alerts} SKUs at/below ROP",
        'overstock_risk': overstock_risk,
        'overstock_note': f"{overstock_risk} SKUs with >180d stock",
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def efficiency(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)

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
    for d in data:
        d['category'] = d['product_category'] or 'Uncategorized'
        d['turnover'] = round(float(d.get('avg_turnover') or 0), 2)
        d['dsi'] = round(float(d.get('avg_dos') or 0), 1)
        d['gmroi'] = round(float(d.get('avg_gmroi') or 0), 2)
        d['fillRate'] = round(float(d.get('avg_fill_rate') or 0), 2)
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def batches(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f).filter(batch_no__gt='')

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
    """Investment snapshot: by category + location, enriched with monthly profit and ROI."""
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)

    # Last 30 days gross margin, grouped by the same dimensions
    today = _date.today()
    sales_qs = ReportSales.objects.filter(
        sale_date__gte=today - _timedelta(days=30),
    )
    if 'location_id' in f:
        sales_qs = sales_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        sales_qs = sales_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        sales_qs = sales_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        sales_qs = sales_qs.filter(product_category=f['category'])

    margin_by_cat = {
        r['product_category']: float(r['m'] or 0)
        for r in sales_qs.values('product_category').annotate(m=Sum('gross_margin'))
    }
    revenue_by_cat = {
        r['product_category']: float(r['v'] or 0)
        for r in sales_qs.values('product_category').annotate(v=Sum('line_total'))
    }
    margin_by_loc = {
        r['location_id']: float(r['m'] or 0)
        for r in sales_qs.values('location_id').annotate(m=Sum('gross_margin'))
    }
    revenue_by_loc = {
        r['location_id']: float(r['v'] or 0)
        for r in sales_qs.values('location_id').annotate(v=Sum('line_total'))
    }

    by_category = []
    for r in (
        qs.values('product_category')
        .annotate(
            investment=Sum('stock_value_cost'),
            mrp_value=Sum('stock_value_mrp'),
            avg_gmroi=Avg('gmroi'),
        )
        .order_by('-investment')
    ):
        inv = float(r['investment'] or 0)
        profit = margin_by_cat.get(r['product_category'], 0)
        roi = round(profit / inv * 100, 1) if inv else 0
        by_category.append({
            'product_category': r['product_category'],
            'category': r['product_category'] or 'Uncategorized',
            'investment': inv,
            'mrp_value': float(r['mrp_value'] or 0),
            'avg_gmroi': float(r['avg_gmroi'] or 0),
            'monthlyRevenue': revenue_by_cat.get(r['product_category'], 0),
            'monthlyProfit': profit,
            'roi': roi,
        })

    by_location = []
    for r in (
        qs.values('location_id', 'location_name')
        .annotate(investment=Sum('stock_value_cost'), avg_gmroi=Avg('gmroi'))
        .order_by('-investment')
    ):
        inv = float(r['investment'] or 0)
        profit = margin_by_loc.get(r['location_id'], 0)
        revenue = revenue_by_loc.get(r['location_id'], 0)
        roi = round(profit / inv * 100, 1) if inv else 0
        if roi >= 10:
            efficiency = 'Profitable'
        elif roi >= 0:
            efficiency = 'Underperforming'
        else:
            efficiency = 'Loss'
        by_location.append({
            'location_id': r['location_id'],
            'location': r['location_name'] or f"Location {r['location_id']}",
            'location_name': r['location_name'],
            'investment': inv,
            'avg_gmroi': float(r['avg_gmroi'] or 0),
            'monthlyRevenue': revenue,
            'monthlyProfit': profit,
            'roi': roi,
            'efficiency': efficiency,
        })

    return Response({
        'by_category': by_category,
        'by_location': by_location,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def stock_alerts(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)

    alerts = list(
        qs.filter(
            Q(qty_on_hand=0) |
            Q(reorder_needed=True) |
            Q(expiry_status__in=['expired', 'critical_30']) |
            Q(days_of_stock__gt=180, days_of_stock__lt=9999)
        )
        .values(
            'product_id', 'product_name', 'product_category',
            'qty_on_hand', 'reorder_needed', 'expiry_status',
            'days_to_expiry', 'days_of_stock', 'location_name',
            'safety_stock', 'avg_daily_demand', 'last_sale_date',
            'movement_status',
        )
        .order_by('qty_on_hand', 'days_to_expiry')[:50]
    )
    for a in alerts:
        qty = int(a.get('qty_on_hand') or 0)
        dos = int(a.get('days_of_stock') or 0)
        if qty == 0:
            a['status'] = 'stockout'
            a['alert_type'] = 'stockout'
        elif a.get('expiry_status') in ('expired', 'critical_30'):
            a['status'] = 'low'
            a['alert_type'] = 'expiry'
        elif a.get('reorder_needed'):
            a['status'] = 'low'
            a['alert_type'] = 'reorder'
        elif 0 < dos < 9999 and dos > 180:
            a['status'] = 'overstock'
            a['alert_type'] = 'overstock'
        else:
            a['status'] = 'low'
            a['alert_type'] = 'reorder'
        a['product'] = a.get('product_name') or ''
        a['qty'] = qty
        a['reorder_level'] = float(a.get('safety_stock') or 0)
        a['reorder'] = a['reorder_level']
        last = a.get('last_sale_date')
        a['last_sale'] = last.isoformat() if last else ''
        a['lastSale'] = a['last_sale']
    return Response(alerts)


@api_view(['GET'])
@permission_classes([AllowAny])
def carrying_cost(request):
    """Monthly carrying cost trend for the last 6 months.

    Reconstructs month-end stock value from current snapshot + purchase/sales
    flows, then splits 25% annual holding into storage/insurance/obsolescence/
    financing components.
    """
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f)
    current_value = float(qs.aggregate(v=Sum('stock_value_cost'))['v'] or 0)

    # Apply same filters on purchases/sales to derive monthly flows
    months = _recent_months(6)
    period_keys = [p for p, _ in months]

    p_qs = ReportPurchases.objects.filter(
        purchase_month__in=period_keys, is_return=False,
    )
    s_qs = ReportSales.objects.filter(sale_month__in=period_keys)
    if 'location_id' in f:
        p_qs = p_qs.filter(location_id=f['location_id'])
        s_qs = s_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        p_qs = p_qs.filter(location_id__in=f['location_ids'])
        s_qs = s_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        p_qs = p_qs.filter(product_category__in=f['categories'])
        s_qs = s_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        p_qs = p_qs.filter(product_category=f['category'])
        s_qs = s_qs.filter(product_category=f['category'])

    purchase_by_month = {
        r['purchase_month']: float(r['v'] or 0)
        for r in p_qs.values('purchase_month').annotate(v=Sum('line_total'))
    }
    cogs_by_month = {
        r['sale_month']: float(r['v'] or 0)
        for r in s_qs.values('sale_month').annotate(v=Sum(F('purchase_rate') * F('quantity')))
    }

    # Walk backwards from current value
    stock_by_month = {}
    running = current_value
    for period in reversed(period_keys):
        stock_by_month[period] = max(0.0, running)
        running = running - purchase_by_month.get(period, 0) + cogs_by_month.get(period, 0)

    data = []
    for period, label in months:
        sv = stock_by_month.get(period, current_value)
        monthly_holding = sv * HOLDING_RATE / 12
        storage = sv * COST_COMPONENTS['storage'] / 12
        insurance = sv * COST_COMPONENTS['insurance'] / 12
        obsolescence = sv * COST_COMPONENTS['obsolescence'] / 12
        financing = sv * COST_COMPONENTS['financing'] / 12
        data.append({
            'month': label,
            'period': period,
            'stock_value': round(sv, 2),
            'storageCost': round(storage, 2),
            'storage_cost': round(storage, 2),
            'insuranceCost': round(insurance, 2),
            'insurance_cost': round(insurance, 2),
            'obsolescenceCost': round(obsolescence, 2),
            'obsolescence_cost': round(obsolescence, 2),
            'financingCost': round(financing, 2),
            'financing_cost': round(financing, 2),
            'total': round(monthly_holding, 2),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def optimization(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f).filter(qty_on_hand__gt=0)

    # Raw overstock / understock (kept for backward compatibility)
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

    # Inventory-to-Sales Ratio: stock value vs last-30d sales per category
    today = _date.today()
    sales_qs = ReportSales.objects.filter(
        sale_date__gte=today - _timedelta(days=30), sale_date__lte=today,
    )
    if 'location_id' in f:
        sales_qs = sales_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        sales_qs = sales_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        sales_qs = sales_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        sales_qs = sales_qs.filter(product_category=f['category'])

    monthly_sales_by_cat = {
        r['product_category']: float(r['v'] or 0)
        for r in sales_qs.values('product_category').annotate(v=Sum('line_total'))
    }
    inv_by_cat = list(
        qs.values('product_category')
        .annotate(inv=Sum('stock_value_cost'), dos=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)))
        .order_by('-inv')
    )
    sales_ratio = []
    for row in inv_by_cat[:10]:
        cat = row['product_category'] or 'Uncategorized'
        inv = float(row['inv'] or 0)
        sales = monthly_sales_by_cat.get(row['product_category'], 0)
        ratio = (inv / sales) if sales else 0
        sales_ratio.append({
            'category': cat,
            'inventoryValue': inv,
            'monthlySales': sales,
            'ratio': round(ratio, 2),
        })

    # Recommendations: derived from overstock (reduce) + understock (replenish)
    recommendations = []
    for row in inv_by_cat:
        cat = row['product_category'] or 'Uncategorized'
        dos = float(row['dos'] or 0)
        inv = float(row['inv'] or 0)
        monthly_sales = monthly_sales_by_cat.get(row['product_category'], 0)
        target_days = 45  # target days of supply
        if dos > 120 and inv > 0:
            # Overstock: recommend reduction
            potential_saving = round((inv * HOLDING_RATE / 12) * 0.6, 2)
            priority = 'high' if dos > 180 else 'medium'
            recommendations.append({
                'action': 'Reduce Stock',
                'category': cat,
                'currentDays': int(dos),
                'targetDays': target_days,
                'potentialSaving': potential_saving,
                'priority': priority,
                'impact': f"Free ₹{int(inv * 0.3):,} capital",
            })
        elif monthly_sales > 0 and dos > 0 and dos < 15:
            # Understock: recommend replenishment
            recommendations.append({
                'action': 'Replenish',
                'category': cat,
                'currentDays': int(dos),
                'targetDays': target_days,
                'potentialSaving': round(monthly_sales * 0.05, 2),
                'priority': 'high',
                'impact': f"Avoid stockouts of ~₹{int(monthly_sales * 0.15):,}/mo",
            })
    # Sort by priority then potentialSaving
    priority_rank = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda r: (priority_rank.get(r['priority'], 9), -r['potentialSaving']))
    recommendations = recommendations[:15]

    return Response({
        'overstock': overstock,
        'understock': understock,
        'sales_ratio': sales_ratio,
        'recommendations': recommendations,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def turnover(request):
    """Turnover & GMROI dashboard with trend, category, velocity, working-capital and radar."""
    f = parse_filters(request)
    inv_qs = _apply_inventory_filters(_latest_snapshot(), f)

    # Overall KPIs
    overall = inv_qs.aggregate(
        total_value=Sum('stock_value_cost'),
        avg_turnover=Avg('inventory_turnover', filter=Q(inventory_turnover__gt=0)),
        avg_gmroi=Avg('gmroi', filter=Q(gmroi__gt=0)),
        avg_dsi=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
        fill_rate=Avg('fill_rate'),
    )
    total_value = float(overall['total_value'] or 0)
    avg_turnover = float(overall['avg_turnover'] or 0)
    avg_gmroi = float(overall['avg_gmroi'] or 0)
    avg_dsi = float(overall['avg_dsi'] or 0)
    fill_rate = float(overall['fill_rate'] or 0)

    TURNOVER_TARGET = 8.0
    INDUSTRY_DSI = 45
    FILL_RATE_TARGET = 98.0

    # Per-category
    cat_rows = list(
        inv_qs.values('product_category')
        .annotate(
            turnover=Avg('inventory_turnover', filter=Q(inventory_turnover__gt=0)),
            dsi=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
            gmroi=Avg('gmroi', filter=Q(gmroi__gt=0)),
            fill=Avg('fill_rate'),
            working_cap=Sum('stock_value_cost'),
            stockout_days=Count('id', filter=Q(qty_on_hand=0)),
        )
        .order_by('-turnover')
    )
    category = []
    for r in cat_rows:
        category.append({
            'category': r['product_category'] or 'Uncategorized',
            'turnover': round(float(r['turnover'] or 0), 2),
            'dsi': round(float(r['dsi'] or 0), 1),
            'gmroi': round(float(r['gmroi'] or 0), 2),
            'fillRate': round(float(r['fill'] or 0), 2),
            'stockoutDays': int(r['stockout_days'] or 0),
            'workingCapital': float(r['working_cap'] or 0),
        })

    # Monthly trend: turnover proxy = monthly_cogs / avg_stock_value_across_months
    # We don't have monthly inventory snapshots, so approximate by assuming
    # stock value is relatively stable and use monthly sales volume to scale.
    months = _recent_months(6)
    period_keys = [p for p, _ in months]
    sales_qs = ReportSales.objects.filter(sale_month__in=period_keys)
    if 'location_id' in f:
        sales_qs = sales_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        sales_qs = sales_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        sales_qs = sales_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        sales_qs = sales_qs.filter(product_category=f['category'])
    monthly_agg = {
        r['sale_month']: r
        for r in sales_qs.values('sale_month').annotate(
            cogs=Sum(F('purchase_rate') * F('quantity')),
            margin=Sum('gross_margin'),
        )
    }
    trend = []
    for period, label in months:
        row = monthly_agg.get(period, {})
        cogs = float(row.get('cogs') or 0)
        margin = float(row.get('margin') or 0)
        # annualized turns for the month
        monthly_turnover = (cogs / total_value * 12) if total_value else 0
        month_gmroi = (margin / total_value * 12) if total_value else 0
        trend.append({
            'period': period,
            'month': label,
            'turnover': round(monthly_turnover, 2),
            'gmroi': round(month_gmroi, 2),
            'fillRate': round(fill_rate, 2),
        })

    # Velocity segmentation (by movement_status)
    velocity_rows = list(
        inv_qs.values('movement_status')
        .annotate(
            skus=Count('product_id', distinct=True),
            value=Sum('stock_value_cost'),
            dsi=Avg('days_of_stock', filter=Q(days_of_stock__lt=9999)),
            gmroi=Avg('gmroi', filter=Q(gmroi__gt=0)),
        )
    )
    # Map to revenue per segment (last 30 days)
    today = _date.today()
    seg_sales_qs = ReportSales.objects.filter(
        sale_date__gte=today - _timedelta(days=30),
    )
    if 'location_id' in f:
        seg_sales_qs = seg_sales_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        seg_sales_qs = seg_sales_qs.filter(location_id__in=f['location_ids'])
    product_status = dict(
        inv_qs.values_list('product_id', 'movement_status').distinct()
    )
    revenue_by_status = {}
    for r in seg_sales_qs.values('product_id').annotate(rev=Sum('line_total')):
        s = product_status.get(r['product_id'])
        if s:
            revenue_by_status[s] = revenue_by_status.get(s, 0) + float(r['rev'] or 0)
    total_revenue = sum(revenue_by_status.values()) or 1

    seg_display = {'fast': 'Fast Movers (A)', 'medium': 'Medium Movers (B)',
                   'slow': 'Slow Movers (C)', 'dead': 'Dead Stock'}
    velocity = []
    for r in velocity_rows:
        key = r['movement_status'] or 'unknown'
        rev = revenue_by_status.get(key, 0)
        velocity.append({
            'segment': seg_display.get(key, key.title()),
            'skus': int(r['skus'] or 0),
            'revenue': rev,
            'contribution': round(rev / total_revenue * 100, 1) if total_revenue else 0,
            'avgDSI': round(float(r['dsi'] or 0), 1),
            'gmroi': round(float(r['gmroi'] or 0), 2),
        })
    velocity.sort(key=lambda v: {'Fast Movers (A)': 0, 'Medium Movers (B)': 1,
                                 'Slow Movers (C)': 2, 'Dead Stock': 3}.get(v['segment'], 4))

    # Working capital impact
    excess_threshold_days = 45
    excess_value = float(
        inv_qs.filter(days_of_stock__gt=excess_threshold_days, days_of_stock__lt=9999)
        .aggregate(v=Sum('stock_value_cost'))['v'] or 0
    )
    dead_value = float(
        inv_qs.filter(movement_status='dead')
        .aggregate(v=Sum('stock_value_cost'))['v'] or 0
    )
    annual_carrying = excess_value * HOLDING_RATE
    annual_waste = dead_value * 0.7
    opportunity_cost = (excess_value + dead_value) * 0.10  # 10% opportunity cost
    working_capital = [
        {'item': 'Excess Stock Value (>45d)', 'value': excess_value},
        {'item': 'Dead Stock Value', 'value': dead_value},
        {'item': 'Annual Carrying Cost on Excess', 'value': annual_carrying},
        {'item': 'Annual Waste (Dead Stock)', 'value': annual_waste},
        {'item': 'Opportunity Cost (10%)', 'value': opportunity_cost},
    ]

    # Radar: top 4 categories x 5 normalized metrics
    top_cats = [r['category'] for r in category[:4]]
    metrics = [
        ('Turnover', 'turnover'),
        ('GMROI', 'gmroi'),
        ('Fill Rate', 'fillRate'),
        ('DSI (inv)', 'dsi'),  # inverted — lower is better
        ('Stock Health', '_health'),
    ]
    cat_lookup = {r['category']: r for r in category}
    radar = []
    for label, key in metrics:
        row = {'metric': label}
        for cat in top_cats:
            r = cat_lookup.get(cat, {})
            if key == '_health':
                # composite: turnover normalized + gmroi + fill rate
                val = (
                    min((r.get('turnover') or 0) / 12 * 33, 33) +
                    min((r.get('gmroi') or 0) / 4 * 33, 33) +
                    min((r.get('fillRate') or 0) / 100 * 34, 34)
                )
            elif key == 'dsi':
                # Invert: 90d -> 10, 30d -> 90
                d = r.get('dsi') or 0
                val = max(0, 100 - d)
            elif key == 'turnover':
                val = min((r.get('turnover') or 0) / 12 * 100, 100)
            elif key == 'gmroi':
                val = min((r.get('gmroi') or 0) / 4 * 100, 100)
            elif key == 'fillRate':
                val = r.get('fillRate') or 0
            else:
                val = 0
            row[cat] = round(val, 1)
        radar.append(row)

    return Response({
        'trend': trend,
        'category': category,
        'velocity': velocity,
        'working_capital': working_capital,
        'radar': radar,
        'avg_turnover': round(avg_turnover, 2),
        'turnover_target': TURNOVER_TARGET,
        'gmroi': round(avg_gmroi, 2),
        'avg_dsi': round(avg_dsi, 1),
        'industry_dsi': INDUSTRY_DSI,
        'fill_rate': round(fill_rate, 2),
        'fill_rate_target': FILL_RATE_TARGET,
        'working_capital_excess': excess_value,
        'annual_waste': annual_waste,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def batch_detail(request):
    """Batch tracking dashboard — aging distribution, FIFO trend, supplier scorecard, batch list."""
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f).filter(batch_no__gt='')

    # KPI aggregates
    active_batches = qs.count()
    total_skus = qs.values('product_id').distinct().count()

    # Aging distribution: buckets by days_to_expiry
    today = _date.today()
    aging_buckets = [
        ('0-30d',   Q(days_to_expiry__gte=0, days_to_expiry__lte=30)),
        ('31-90d',  Q(days_to_expiry__gt=30, days_to_expiry__lte=90)),
        ('91-180d', Q(days_to_expiry__gt=90, days_to_expiry__lte=180)),
        ('180d+',   Q(days_to_expiry__gt=180)),
        ('Expired', Q(days_to_expiry__lt=0)),
    ]
    aging = []
    for label, cond in aging_buckets:
        bucket = qs.filter(cond).aggregate(
            value=Sum('stock_value_cost'),
            batches=Count('id'),
        )
        # Approx margin: (mrp - purchase_rate) / mrp
        margins = list(
            qs.filter(cond).exclude(mrp=0)
            .annotate(m=(F('mrp') - F('purchase_rate')) / F('mrp') * 100)
            .values_list('m', flat=True)[:500]
        )
        avg_margin = (sum(float(x or 0) for x in margins) / len(margins)) if margins else 0
        aging.append({
            'ageRange': label,
            'value': float(bucket['value'] or 0),
            'batches': int(bucket['batches'] or 0),
            'avgMargin': round(avg_margin, 1),
        })

    # FIFO compliance trend: approximate per-month
    # Batch is "compliant" if sold/consumed before expiry; approximate:
    #   qty_remaining = qty_on_hand, received = purchase_rate * (qty_remaining + sold_qty)
    # We don't have batch-level sales, so compute from ReportPurchases vs current batch qty
    months = _recent_months(6)
    period_keys = [p for p, _ in months]
    purchase_by_month_value = {
        r['purchase_month']: float(r['v'] or 0)
        for r in ReportPurchases.objects.filter(
            purchase_month__in=period_keys, is_return=False,
        ).values('purchase_month').annotate(v=Sum('line_total'))
    }
    # Waste = stock value of expired batches per month (using expiry_month on snapshot)
    expired_value_by_month = {
        r['expiry_month']: float(r['v'] or 0)
        for r in qs.filter(expiry_status='expired')
        .values('expiry_month')
        .annotate(v=Sum('stock_value_cost'))
    }
    fifo = []
    for period, label in months:
        waste = expired_value_by_month.get(period, 0)
        total_purchased = purchase_by_month_value.get(period, 0)
        non_compliant_pct = min(100, (waste / total_purchased * 100)) if total_purchased else 0
        compliant = round(100 - non_compliant_pct, 1)
        fifo.append({
            'period': period,
            'month': label,
            'compliant': compliant,
            'nonCompliant': round(non_compliant_pct, 1),
            'wasteFromNonFIFO': round(waste, 2),
        })
    overall_waste = sum(f_['wasteFromNonFIFO'] for f_ in fifo)
    overall_compliance = (sum(f_['compliant'] for f_ in fifo) / len(fifo)) if fifo else 100

    # Lot profitability by supplier — use ReportPurchases to build scorecard
    p_qs = ReportPurchases.objects.filter(is_return=False)
    if 'location_id' in f:
        p_qs = p_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        p_qs = p_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        p_qs = p_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        p_qs = p_qs.filter(product_category=f['category'])
    lot_profitability = []
    supplier_rows = list(
        p_qs.values('supplier_name')
        .annotate(
            lots=Count('batch_no', distinct=True),
            avg_margin=Avg('margin_to_mrp'),
            purchase_value=Sum('line_total'),
        )
        .order_by('-purchase_value')[:10]
    )
    for s in supplier_rows:
        supplier_inv = qs.filter(product_company=s['supplier_name']).aggregate(
            inv=Sum('stock_value_cost'),
            expired=Sum('stock_value_cost', filter=Q(expiry_status='expired')),
        )
        inv_val = float(supplier_inv['inv'] or 0)
        expired_val = float(supplier_inv['expired'] or 0)
        avg_turnover = round(float(s['purchase_value'] or 0) / inv_val, 2) if inv_val else 0
        return_rate = round(expired_val / inv_val * 100, 2) if inv_val else 0
        quality = max(0, min(100, 100 - return_rate * 5))
        lot_profitability.append({
            'supplier': s['supplier_name'] or 'Unknown',
            'lots': int(s['lots'] or 0),
            'avgMargin': round(float(s['avg_margin'] or 0), 1),
            'avgTurnover': avg_turnover,
            'qualityScore': round(quality, 1),
            'returnRate': return_rate,
        })

    supplier_quality = (
        sum(r['qualityScore'] for r in lot_profitability) / len(lot_profitability)
    ) if lot_profitability else 0
    avg_batch_margin = (
        sum(r['avgMargin'] for r in lot_profitability) / len(lot_profitability)
    ) if lot_profitability else 0

    # Batch-level analysis: top 50 batches sorted by risk (expiring soon + high value)
    batch_rows = list(
        qs.order_by('days_to_expiry')
        .values(
            'product_name', 'batch_no', 'product_company', 'expiry_month',
            'days_to_expiry', 'qty_on_hand', 'stock_value_cost',
            'mrp', 'purchase_rate',
        )[:50]
    )
    batch_analysis = []
    for r in batch_rows:
        qty_on_hand = int(r.get('qty_on_hand') or 0)
        mrp = float(r.get('mrp') or 0)
        pr = float(r.get('purchase_rate') or 0)
        margin = round((mrp - pr) / mrp * 100, 1) if mrp else 0
        dte = int(r.get('days_to_expiry') or 0)
        batch_analysis.append({
            'batchNo': r.get('batch_no') or '',
            'product': r.get('product_name') or '',
            'supplier': r.get('product_company') or 'Unknown',
            'receiptDate': '',
            'expiryDate': r.get('expiry_month') or '',
            'qtyReceived': qty_on_hand,  # approx; no historical received qty in snapshot
            'qtySold': 0,  # unknown at snapshot level
            'qtyRemaining': qty_on_hand,
            'margin': margin,
            'fifoCompliant': dte >= 0,
            'daysToExpiry': dte,
        })

    return Response({
        'aging': aging,
        'fifo': fifo,
        'lot_profitability': lot_profitability,
        'batch_analysis': batch_analysis,
        'active_batches': active_batches,
        'total_skus': total_skus,
        'fifo_compliance': round(overall_compliance, 1),
        'non_compliant_pct': round(100 - overall_compliance, 1),
        'waste_from_non_fifo': round(overall_waste, 2),
        'avg_batch_margin': round(avg_batch_margin, 1),
        'supplier_quality_score': round(supplier_quality, 1),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def investment_detail(request):
    """Investment & ROI dashboard: supplier/location/velocity splits, ROI trend, scatter, benchmarks, optimization."""
    f = parse_filters(request)
    inv_qs = _apply_inventory_filters(_latest_snapshot(), f)
    total_investment = float(inv_qs.aggregate(v=Sum('stock_value_cost'))['v'] or 0)
    total_qty = int(inv_qs.aggregate(q=Sum('qty_on_hand'))['q'] or 0)

    today = _date.today()
    sales_qs = ReportSales.objects.filter(
        sale_date__gte=today - _timedelta(days=30),
    )
    if 'location_id' in f:
        sales_qs = sales_qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        sales_qs = sales_qs.filter(location_id__in=f['location_ids'])
    if 'categories' in f:
        sales_qs = sales_qs.filter(product_category__in=f['categories'])
    elif 'category' in f:
        sales_qs = sales_qs.filter(product_category=f['category'])

    monthly_profit = float(sales_qs.aggregate(m=Sum('gross_margin'))['m'] or 0)
    monthly_revenue = float(sales_qs.aggregate(r=Sum('line_total'))['r'] or 0)
    monthly_roi = round(monthly_profit / total_investment * 100, 1) if total_investment else 0
    annualized_roi = round(monthly_roi * 12, 1)
    gmroi = float(inv_qs.aggregate(g=Avg('gmroi', filter=Q(gmroi__gt=0)))['g'] or 0)
    payback_days = round(total_investment / (monthly_profit / 30), 0) if monthly_profit else 9999

    # By supplier (from inventory snapshot - supplier = product_company)
    supplier_margins = {
        r['product_category']: float(r['m'] or 0)
        for r in sales_qs.values('product_category').annotate(m=Sum('gross_margin'))
    }
    # Calculate supplier-level investment and last-30d profit by cross-joining on product_id
    supplier_products = {}
    for r in inv_qs.values('product_id', 'product_company').annotate(
        inv=Sum('stock_value_cost'),
        qty=Sum('qty_on_hand'),
        avg_margin=Avg('gmroi', filter=Q(gmroi__gt=0)),
    ):
        sup = r['product_company'] or 'Unknown'
        bucket = supplier_products.setdefault(sup, {
            'investment': 0, 'qty': 0, 'margin_sum': 0, 'margin_count': 0,
            'skus': set(), 'product_ids': set(),
        })
        bucket['investment'] += float(r['inv'] or 0)
        bucket['qty'] += int(r['qty'] or 0)
        if r['avg_margin']:
            bucket['margin_sum'] += float(r['avg_margin'])
            bucket['margin_count'] += 1
        bucket['skus'].add(r['product_id'])
        bucket['product_ids'].add(r['product_id'])
    # Map product -> margin from sales
    product_profit_30d = {
        r['product_id']: float(r['m'] or 0)
        for r in sales_qs.values('product_id').annotate(m=Sum('gross_margin'))
    }
    by_supplier = []
    for sup, b in supplier_products.items():
        profit = sum(product_profit_30d.get(pid, 0) for pid in b['product_ids'])
        roi = round(profit / b['investment'] * 100, 1) if b['investment'] else 0
        avg_margin = b['margin_sum'] / b['margin_count'] if b['margin_count'] else 0
        turnover = round(profit * 12 / b['investment'], 2) if b['investment'] else 0
        by_supplier.append({
            'supplier': sup,
            'investment': b['investment'],
            'monthlyReturn': profit,
            'roi': roi,
            'avgMargin': round(avg_margin, 1),
            'turnover': turnover,
            'skus': len(b['skus']),
        })
    by_supplier.sort(key=lambda r: -r['investment'])
    by_supplier = by_supplier[:10]

    # By location
    by_location = []
    loc_margins = {
        r['location_id']: float(r['m'] or 0)
        for r in sales_qs.values('location_id').annotate(m=Sum('gross_margin'))
    }
    loc_revs = {
        r['location_id']: float(r['v'] or 0)
        for r in sales_qs.values('location_id').annotate(v=Sum('line_total'))
    }
    for r in (
        inv_qs.values('location_id', 'location_name')
        .annotate(investment=Sum('stock_value_cost'))
        .order_by('-investment')
    ):
        inv = float(r['investment'] or 0)
        profit = loc_margins.get(r['location_id'], 0)
        revenue = loc_revs.get(r['location_id'], 0)
        roi = round(profit / inv * 100, 1) if inv else 0
        if roi >= 10:
            eff = 'Profitable'
        elif roi >= 0:
            eff = 'Underperforming'
        else:
            eff = 'Loss'
        by_location.append({
            'location': r['location_name'] or f"Location {r['location_id']}",
            'investment': inv,
            'monthlyRevenue': revenue,
            'monthlyProfit': profit,
            'roi': roi,
            'efficiency': eff,
        })

    # ROI trend (last 6 months)
    months = _recent_months(6)
    period_keys = [p for p, _ in months]
    month_rows = {
        r['sale_month']: r
        for r in ReportSales.objects.filter(sale_month__in=period_keys)
        .values('sale_month').annotate(
            margin=Sum('gross_margin'),
            revenue=Sum('line_total'),
        )
    }
    roi_trend = []
    for period, label in months:
        m = float((month_rows.get(period) or {}).get('margin') or 0)
        roi_trend.append({
            'period': period,
            'month': label,
            'roi': round(m / total_investment * 100, 1) if total_investment else 0,
            'monthlyProfit': m,
            'investmentValue': total_investment,
        })

    # By velocity segment
    product_status = dict(
        inv_qs.values_list('product_id', 'movement_status').distinct()
    )
    inv_by_status = {}
    for r in inv_qs.values('movement_status').annotate(inv=Sum('stock_value_cost')):
        inv_by_status[r['movement_status']] = float(r['inv'] or 0)
    profit_by_status = {}
    for pid, p in product_profit_30d.items():
        s = product_status.get(pid)
        if s:
            profit_by_status[s] = profit_by_status.get(s, 0) + p
    total_profit = sum(profit_by_status.values()) or 1
    by_velocity = []
    seg_order = [('fast', 'Fast Movers'), ('medium', 'Medium'), ('slow', 'Slow Movers'), ('dead', 'Dead Stock')]
    for key, label in seg_order:
        inv_v = inv_by_status.get(key, 0)
        profit_v = profit_by_status.get(key, 0)
        roi = round(profit_v / inv_v * 100, 1) if inv_v else 0
        contribution = round(profit_v / total_profit * 100, 1) if total_profit else 0
        by_velocity.append({
            'segment': label,
            'roi': roi,
            'contributionToProfit': contribution,
            'investment': inv_v,
            'monthlyProfit': profit_v,
        })

    # Scatter: per-product investment vs return (top 40 by investment)
    scatter = []
    for r in (
        inv_qs.values('product_id', 'product_name', 'product_category')
        .annotate(inv=Sum('stock_value_cost'), qty=Sum('qty_on_hand'))
        .order_by('-inv')[:40]
    ):
        inv = float(r['inv'] or 0)
        profit = product_profit_30d.get(r['product_id'], 0)
        if inv < 1:
            continue
        roi = round(profit / inv * 100, 1)
        scatter.append({
            'product': r['product_name'] or '',
            'category': r['product_category'] or 'Uncategorized',
            'investment': inv,
            'monthlyReturn': profit,
            'size': int(r['qty'] or 0),
            'roi': roi,
        })

    # Efficiency metrics vs benchmarks
    BENCHMARKS = {
        'Monthly ROI %': (monthly_roi, 8.0, '%'),
        'Annualized ROI %': (annualized_roi, 96.0, '%'),
        'GMROI': (round(gmroi, 2), 3.0, 'x'),
        'Inventory Turnover': (
            round(float(inv_qs.aggregate(t=Avg('inventory_turnover', filter=Q(inventory_turnover__gt=0)))['t'] or 0), 2),
            8.0, 'x'
        ),
        'Fill Rate': (
            round(float(inv_qs.aggregate(f=Avg('fill_rate'))['f'] or 0), 2),
            98.0, '%'
        ),
    }
    efficiency_metrics = []
    for name, (value, benchmark, unit) in BENCHMARKS.items():
        pct_diff = ((value - benchmark) / benchmark * 100) if benchmark else 0
        if pct_diff >= -5:
            status = 'on-track' if pct_diff < 5 else 'above'
        else:
            status = 'below'
        efficiency_metrics.append({
            'metric': name,
            'value': value,
            'unit': unit,
            'benchmark': benchmark,
            'status': status,
        })

    # Optimization opportunities: derived from over/under-performing segments
    optimization_list = []
    for seg in by_velocity:
        if seg['segment'] == 'Dead Stock' and seg['investment'] > 0:
            free_cap = seg['investment'] * 0.6
            optimization_list.append({
                'action': 'Liquidate dead stock',
                'currentInvestment': seg['investment'],
                'targetInvestment': round(seg['investment'] * 0.4, 2),
                'capitalFreed': round(free_cap, 2),
                'impactOnProfit': round(-seg['investment'] * 0.15, 2),
                'netBenefit': round(free_cap * 0.1 - seg['investment'] * 0.15, 2),
            })
        if seg['segment'] == 'Slow Movers' and seg['investment'] > 0 and seg['roi'] < 5:
            free_cap = seg['investment'] * 0.3
            optimization_list.append({
                'action': 'Reduce slow movers',
                'currentInvestment': seg['investment'],
                'targetInvestment': round(seg['investment'] * 0.7, 2),
                'capitalFreed': round(free_cap, 2),
                'impactOnProfit': round(-seg['monthlyProfit'] * 0.2, 2),
                'netBenefit': round(free_cap * 0.1 - seg['monthlyProfit'] * 0.2, 2),
            })
    if by_velocity and by_velocity[0]['investment'] > 0:
        fast = by_velocity[0]
        optimization_list.append({
            'action': 'Increase fast-mover coverage',
            'currentInvestment': fast['investment'],
            'targetInvestment': round(fast['investment'] * 1.2, 2),
            'capitalFreed': -round(fast['investment'] * 0.2, 2),
            'impactOnProfit': round(fast['monthlyProfit'] * 0.15, 2),
            'netBenefit': round(fast['monthlyProfit'] * 0.15 - fast['investment'] * 0.2 * 0.02, 2),
        })
    optimization_list.sort(key=lambda r: -r['netBenefit'])

    # Banner: best/worst ROI category
    by_cat_roi = []
    margin_by_cat_30d = {
        r['product_category']: float(r['m'] or 0)
        for r in sales_qs.values('product_category').annotate(m=Sum('gross_margin'))
    }
    for r in inv_qs.values('product_category').annotate(inv=Sum('stock_value_cost')):
        inv = float(r['inv'] or 0)
        if inv < 100:
            continue
        profit = margin_by_cat_30d.get(r['product_category'], 0)
        roi = round(profit / inv * 100, 1)
        by_cat_roi.append((r['product_category'] or 'Uncategorized', roi, inv))
    by_cat_roi.sort(key=lambda x: -x[1])
    best = by_cat_roi[0] if by_cat_roi else None
    worst = by_cat_roi[-1] if by_cat_roi else None

    excess_capital = float(
        inv_qs.filter(days_of_stock__gt=180, days_of_stock__lt=9999)
        .aggregate(v=Sum('stock_value_cost'))['v'] or 0
    )
    annual_opportunity_cost = excess_capital * HOLDING_RATE

    return Response({
        'by_supplier': by_supplier,
        'by_location': by_location,
        'roi_trend': roi_trend,
        'by_velocity': by_velocity,
        'scatter': scatter,
        'efficiency_metrics': efficiency_metrics,
        'optimization': optimization_list,
        'monthly_roi': monthly_roi,
        'annualized_roi': annualized_roi,
        'gmroi': round(gmroi, 2),
        'payback_days': int(payback_days) if payback_days < 99999 else 9999,
        'total_investment': total_investment,
        'total_qty': total_qty,
        'best_roi_category': best[0] if best else '',
        'worst_roi_category': worst[0] if worst else '',
        'best_roi_note': f"{best[1]}% ROI" if best else '',
        'worst_roi_note': f"{worst[1]}% ROI" if worst else '',
        'annual_opportunity_cost': round(annual_opportunity_cost, 2),
        'opportunity_cost_note': f"25% holding on ₹{int(excess_capital):,} excess",
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def detail_view(request):
    f = parse_filters(request)
    qs = _apply_inventory_filters(_latest_snapshot(), f).order_by('-stock_value_cost')
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
