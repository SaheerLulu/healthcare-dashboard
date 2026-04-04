"""Executive Summary API endpoints."""
from decimal import Decimal
from django.db.models import Sum, Count, Q, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from reports.models import ReportSales, ReportFinancial, ReportGST, ReportInventory, ReportPurchases
from .helpers import parse_filters, apply_common_filters, apply_financial_filters


@api_view(['GET'])
@permission_classes([AllowAny])
def kpis(request):
    f = parse_filters(request)
    sales_qs = apply_common_filters(ReportSales.objects.all(), f)
    fin_qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    revenue = sales_qs.aggregate(total=Sum('line_total'))['total'] or 0

    # Gross profit: revenue - COGS (from expense accounts)
    cogs = fin_qs.filter(account_type='EXPENSE', account_subtype='Purchases').aggregate(
        total=Sum('debit') - Sum('credit')
    )
    cogs_val = cogs['total'] or 0
    gross_profit = Decimal(str(revenue)) - Decimal(str(cogs_val))

    # Cash position
    cash = fin_qs.filter(account_subtype__in=['Cash', 'Bank']).aggregate(
        total=Sum('debit') - Sum('credit')
    )['total'] or 0

    # GST liability
    gst_qs = ReportGST.objects.filter(source_table='gstr3b', period__gte=f['start_date'][:7])
    gst_liability = gst_qs.aggregate(
        total=Sum('net_payable_cgst') + Sum('net_payable_sgst') + Sum('net_payable_igst')
    )['total'] or 0

    return Response({
        'total_revenue': float(revenue),
        'gross_profit': float(gross_profit),
        'cash_position': float(cash),
        'gst_liability': float(gst_liability),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def revenue_trend(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    trend = list(
        qs.values('sale_month')
        .annotate(revenue=Sum('line_total'), profit=Sum('gross_margin'))
        .order_by('sale_month')
    )

    return Response(trend)


@api_view(['GET'])
@permission_classes([AllowAny])
def channel_mix(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    mix = list(
        qs.values('sale_month', 'channel')
        .annotate(revenue=Sum('line_total'))
        .order_by('sale_month', 'channel')
    )
    return Response(mix)


@api_view(['GET'])
@permission_classes([AllowAny])
def category_revenue(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    cats = list(
        qs.values('product_category')
        .annotate(revenue=Sum('line_total'), qty=Sum('quantity'))
        .order_by('-revenue')
    )
    return Response(cats)


@api_view(['GET'])
@permission_classes([AllowAny])
def top_products(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    products = list(
        qs.values('product_id', 'product_name', 'product_category')
        .annotate(revenue=Sum('line_total'), qty=Sum('quantity'), margin=Sum('gross_margin'))
        .order_by('-revenue')[:f['limit']]
    )
    return Response(products)


@api_view(['GET'])
@permission_classes([AllowAny])
def inventory_alerts(request):
    inv = ReportInventory.objects.filter(snapshot_date=ReportInventory.objects.values('snapshot_date').order_by('-snapshot_date').first()['snapshot_date']) if ReportInventory.objects.exists() else ReportInventory.objects.none()

    alerts = {
        'low_stock': inv.filter(reorder_needed=True).count(),
        'expiring_30d': inv.filter(expiry_status='critical_30').count(),
        'expired': inv.filter(expiry_status='expired').count(),
        'dead_stock': inv.filter(movement_status='dead').count(),
        'total_value': float(inv.aggregate(total=Sum('stock_value_cost'))['total'] or 0),
    }
    return Response(alerts)


@api_view(['GET'])
@permission_classes([AllowAny])
def pending_actions(request):
    from decimal import Decimal
    f = parse_filters(request)

    pending_po_qs = ReportPurchases.objects.filter(state='pending_approval')
    pending_po_count = pending_po_qs.count()
    pending_po_value = float(pending_po_qs.aggregate(total=Sum('line_total'))['total'] or 0)

    pending_gst = ReportGST.objects.filter(source_table='gstr3b', filing_status='draft').count()

    # Unpaid credit from sales
    credit_qs = apply_common_filters(ReportSales.objects.filter(payment_method='Credit', status='unpaid'), f)
    unpaid_credit_count = credit_qs.count()
    unpaid_credit_value = float(credit_qs.aggregate(total=Sum('line_total'))['total'] or 0)

    return Response({
        'pending_po_count': pending_po_count,
        'pending_po_value': pending_po_value,
        'unpaid_credit_count': unpaid_credit_count,
        'unpaid_credit_value': unpaid_credit_value,
        'pending_gst_filings': pending_gst,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def today_sales(request):
    from datetime import date as dt_date, timedelta as td
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.all(), f)

    agg = qs.aggregate(
        total_revenue=Sum('line_total'),
        total_qty=Sum('quantity'),
    )
    order_count = qs.values('source_id').distinct().count()
    revenue = float(agg['total_revenue'] or 0)
    avg_basket = round(revenue / order_count, 2) if order_count else 0

    # Compare with previous period of same length
    start = dt_date.fromisoformat(f['start_date'])
    end = dt_date.fromisoformat(f['end_date'])
    period_days = (end - start).days + 1
    prev_start = start - td(days=period_days)
    prev_end = start - td(days=1)
    prev_revenue = float(
        ReportSales.objects.filter(sale_date__gte=prev_start, sale_date__lte=prev_end)
        .aggregate(total=Sum('line_total'))['total'] or 0
    )
    growth = round((revenue - prev_revenue) / prev_revenue * 100, 1) if prev_revenue else 0

    # Build period label
    today = dt_date.today()
    if start == end == today:
        period_label = 'Today'
    elif start == end:
        period_label = start.strftime('%d %b %Y')
    elif start.month == end.month and start.year == end.year:
        period_label = start.strftime('%b %Y')
    else:
        period_label = f"{start.strftime('%d %b')} - {end.strftime('%d %b %Y')}"

    return Response({
        'orders': order_count,
        'revenue': revenue,
        'avg_basket': avg_basket,
        'growth_pct': growth,
        'period_label': period_label,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def filter_options(request):
    """Return dynamic filter options from the database."""
    locations = list(
        ReportSales.objects.values('location_id', 'location_name')
        .distinct().order_by('location_id')
    )
    categories = list(
        ReportSales.objects.values_list('product_category', flat=True)
        .distinct().order_by('product_category')
    )
    channels = list(
        ReportSales.objects.values_list('channel', flat=True)
        .distinct().order_by('channel')
    )
    payment_methods = list(
        ReportSales.objects.values_list('payment_method', flat=True)
        .distinct().order_by('payment_method')
    )

    return Response({
        'locations': [{'id': str(l['location_id']), 'name': l['location_name'] or f"Location {l['location_id']}"} for l in locations],
        'categories': [c for c in categories if c],
        'channels': [c for c in channels if c],
        'payment_methods': [p for p in payment_methods if p],
    })
