"""Working Capital Analysis API endpoints."""
from datetime import date
from django.db.models import Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from reports.models import ReportFinancial, ReportSales, ReportPurchases, ReportInventory
from .helpers import parse_filters, apply_financial_filters


def _fmt_inr(value):
    """Format a number as Indian currency display string. Preserves sign so
    a negative working-capital balance renders as -₹3.97Cr, not ₹3.97Cr."""
    sign = '-' if value < 0 else ''
    v = abs(value)
    if v >= 10000000:
        return f'{sign}₹{v / 10000000:.2f}Cr'
    if v >= 100000:
        return f'{sign}₹{v / 100000:.2f}L'
    if v >= 1000:
        return f'{sign}₹{v / 1000:.1f}K'
    return f'{sign}₹{v:.0f}'


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    f = parse_filters(request)
    fin_qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    receivables_total = float(
        fin_qs.filter(party_type='Customer', account_subtype='Receivable')
        .aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0
    )
    payables_total = float(
        fin_qs.filter(party_type='Supplier', account_subtype='Payable')
        .aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0
    )
    working_capital = receivables_total - payables_total

    current_assets = float(
        fin_qs.filter(account_type='ASSET', parent_account_name__icontains='Current')
        .aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0
    )
    current_liabilities = float(
        fin_qs.filter(account_type='LIABILITY', parent_account_name__icontains='Current')
        .aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0
    )
    current_ratio = round(current_assets / current_liabilities, 2) if current_liabilities else 0

    # CCC approximation — use the entire ReportSales / ReportPurchases tables
    # (not the filter window) as the denominator since receivables/payables are
    # cumulative balances. Then cap DSO/DPO at 365 days because higher numbers
    # are nonsense for a healthy business and almost always indicate sparse
    # historical data, not a real 2-year collection cycle.
    all_sales = float(ReportSales.objects.aggregate(total=Sum('line_total'))['total'] or 0)
    all_purchases = float(ReportPurchases.objects.filter(is_return=False).aggregate(total=Sum('line_total'))['total'] or 0)

    # Detect data span (in days) and use that as the denominator basis.
    span_sales = ReportSales.objects.aggregate(mn=__import__('django').db.models.Min('sale_date'), mx=__import__('django').db.models.Max('sale_date'))
    span_purch = ReportPurchases.objects.filter(is_return=False).aggregate(mn=__import__('django').db.models.Min('bill_date'), mx=__import__('django').db.models.Max('bill_date'))
    sales_days = max(((span_sales['mx'] - span_sales['mn']).days if span_sales['mx'] and span_sales['mn'] else 365), 30)
    purch_days = max(((span_purch['mx'] - span_purch['mn']).days if span_purch['mx'] and span_purch['mn'] else 365), 30)
    daily_revenue = all_sales / sales_days if all_sales else 0
    daily_purchases = all_purchases / purch_days if all_purchases else 0

    raw_dso = receivables_total / daily_revenue if daily_revenue else 0
    raw_dpo = payables_total / daily_purchases if daily_purchases else 0
    dso = min(raw_dso, 365)
    dpo = min(raw_dpo, 365)
    ccc = dso - dpo

    return Response({
        'current_ratio_display': str(current_ratio),
        'current_ratio_subtitle': f'Assets: {_fmt_inr(current_assets)}',
        'current_ratio_trend': '0',
        'receivables_display': _fmt_inr(receivables_total),
        'receivables_subtitle': f'{int(dso)} days DSO',
        'receivables_trend': '0%',
        'payables_display': _fmt_inr(payables_total),
        'payables_subtitle': f'{int(dpo)} days DPO',
        'payables_trend': '0%',
        'ccc_display': f'{int(ccc)} days',
        'ccc_subtitle': f'DSO {int(dso)}d - DPO {int(dpo)}d',
        'ccc_trend': '0d',
        'working_capital_display': _fmt_inr(working_capital),
        'working_capital_subtitle': 'Receivables - Payables',
        'working_capital_trend': '0%',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def receivables(request):
    f = parse_filters(request)
    qs = apply_financial_filters(
        ReportFinancial.objects.filter(is_posted=True, party_type='Customer', account_subtype='Receivable'), f
    )

    # Group by party and compute outstanding
    by_customer = list(
        qs.values('party_id', 'party_name')
        .annotate(outstanding=Sum('debit') - Sum('credit'))
        .filter(outstanding__gt=0)
        .order_by('-outstanding')[:20]
    )

    # Aging buckets (approximate based on entry dates)
    today = date.today()
    total = float(qs.aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)

    return Response({
        'total_receivables': total,
        'by_customer': by_customer,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def payables(request):
    f = parse_filters(request)
    qs = apply_financial_filters(
        ReportFinancial.objects.filter(is_posted=True, party_type='Supplier', account_subtype='Payable'), f
    )

    by_supplier = list(
        qs.values('party_id', 'party_name')
        .annotate(outstanding=Sum('credit') - Sum('debit'))
        .filter(outstanding__gt=0)
        .order_by('-outstanding')[:20]
    )

    total = float(qs.aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)

    return Response({
        'total_payables': total,
        'by_supplier': by_supplier,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def ccc(request):
    """Cash conversion cycle: DIO + DSO - DPO."""
    f = parse_filters(request)

    # DIO (Days Inventory Outstanding) - avg from inventory snapshot
    inv_qs = ReportInventory.objects.filter(days_of_stock__lt=9999)
    avg_dio = inv_qs.aggregate(avg=Sum('days_of_stock'))
    dio = float(avg_dio['avg'] or 0) / max(inv_qs.count(), 1)

    # DSO (Days Sales Outstanding) - receivables / daily revenue
    sales_qs = ReportSales.objects.filter(
        sale_date__gte=f['start_date'], sale_date__lte=f['end_date'],
    )
    total_revenue = float(sales_qs.aggregate(total=Sum('line_total'))['total'] or 0)
    days_in_period = max((date.fromisoformat(f['end_date']) - date.fromisoformat(f['start_date'])).days, 1)
    daily_revenue = total_revenue / days_in_period

    fin_qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)
    receivables = float(
        fin_qs.filter(account_subtype='Receivable')
        .aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0
    )
    dso = receivables / daily_revenue if daily_revenue else 0

    # DPO (Days Payable Outstanding) - payables / daily COGS
    purchase_qs = ReportPurchases.objects.filter(
        bill_date__gte=f['start_date'], bill_date__lte=f['end_date'], is_return=False,
    )
    total_purchases = float(purchase_qs.aggregate(total=Sum('line_total'))['total'] or 0)
    daily_purchases = total_purchases / days_in_period

    payables = float(
        fin_qs.filter(account_subtype='Payable')
        .aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0
    )
    dpo = payables / daily_purchases if daily_purchases else 0

    ccc_val = dio + dso - dpo

    return Response({
        'dio': round(dio, 1),
        'dso': round(dso, 1),
        'dpo': round(dpo, 1),
        'ccc': round(ccc_val, 1),
    })
