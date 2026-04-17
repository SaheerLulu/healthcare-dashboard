"""Financial Deep Dive API endpoints."""
from datetime import date as _date, timedelta as _timedelta
from decimal import Decimal

from django.db.models import Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportFinancial
from .helpers import parse_filters, apply_financial_filters


_MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def _month_label(period):
    """'2025-10' -> 'Oct'."""
    if not period or '-' not in str(period):
        return str(period or '')
    try:
        mm = int(str(period).split('-')[1])
        return _MONTH_SHORT[mm] if 1 <= mm <= 12 else period
    except (ValueError, IndexError):
        return str(period)


def _recent_months(start_date_iso, end_date_iso):
    """List of YYYY-MM periods falling inside the [start, end] window, oldest first.
    Caps at 12 entries."""
    start = _date.fromisoformat(start_date_iso)
    end = _date.fromisoformat(end_date_iso)
    periods = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        periods.append((f"{y:04d}-{m:02d}", _MONTH_SHORT[m]))
        m += 1
        if m == 13:
            m = 1
            y += 1
    return periods[-12:]  # Cap to 12 months


@api_view(['GET'])
@permission_classes([AllowAny])
def pnl(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    revenue = float(qs.filter(account_type='REVENUE').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    cogs = float(qs.filter(account_type='EXPENSE', account_subtype='Purchases').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)
    gross_profit = revenue - cogs

    expenses = float(qs.filter(account_type='EXPENSE').exclude(account_subtype='Purchases').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)
    net_profit = gross_profit - expenses

    return Response({
        'revenue': revenue,
        'cogs': cogs,
        'gross_profit': gross_profit,
        'gross_margin_pct': round(gross_profit / revenue * 100, 2) if revenue else 0,
        'operating_expenses': expenses,
        'net_profit': net_profit,
        'net_margin_pct': round(net_profit / revenue * 100, 2) if revenue else 0,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def pnl_trend(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    revenue_trend = {
        r['entry_month']: float(r['v'] or 0)
        for r in qs.filter(account_type='REVENUE')
        .values('entry_month')
        .annotate(v=Sum('credit') - Sum('debit'))
    }
    expense_trend = {
        r['entry_month']: float(r['v'] or 0)
        for r in qs.filter(account_type='EXPENSE')
        .values('entry_month')
        .annotate(v=Sum('debit') - Sum('credit'))
    }

    periods = sorted(set(list(revenue_trend.keys()) + list(expense_trend.keys())))
    if not periods:
        periods = [p for p, _ in _recent_months(f['start_date'], f['end_date'])]

    data = []
    for period in periods:
        if not period:
            continue
        rev = revenue_trend.get(period, 0)
        exp = expense_trend.get(period, 0)
        data.append({
            'period': period,
            'month': _month_label(period),
            'entry_month': period,
            'revenue': rev,
            'expenses': exp,
            'net_profit': rev - exp,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def expense_breakdown(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True, account_type='EXPENSE'), f)

    data = list(
        qs.values('account_name', 'account_code', 'account_subtype')
        .annotate(amount=Sum('debit') - Sum('credit'))
        .order_by('-amount')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def balance_sheet(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    assets = float(qs.filter(account_type='ASSET').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)
    liabilities = float(qs.filter(account_type='LIABILITY').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    equity = float(qs.filter(account_type='EQUITY').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)

    # Breakdown by subtype only (roll up account_name rows for a cleaner chart)
    asset_breakdown = [
        {
            'account_subtype': r['account_subtype'] or 'Other',
            'account_name': r['account_subtype'] or 'Other',
            'amount': float(r['amount'] or 0),
        }
        for r in qs.filter(account_type='ASSET')
        .values('account_subtype')
        .annotate(amount=Sum('debit') - Sum('credit'))
        .order_by('-amount')
        if (r['amount'] or 0) != 0
    ]
    liability_breakdown = [
        {
            'account_subtype': r['account_subtype'] or 'Other',
            'account_name': r['account_subtype'] or 'Other',
            'amount': float(r['amount'] or 0),
        }
        for r in qs.filter(account_type='LIABILITY')
        .values('account_subtype')
        .annotate(amount=Sum('credit') - Sum('debit'))
        .order_by('-amount')
        if (r['amount'] or 0) != 0
    ]
    # Include equity in liability-side breakdown so the chart actually balances
    equity_breakdown = [
        {
            'account_subtype': r['account_subtype'] or 'Equity',
            'account_name': r['account_subtype'] or 'Equity',
            'amount': float(r['amount'] or 0),
        }
        for r in qs.filter(account_type='EQUITY')
        .values('account_subtype')
        .annotate(amount=Sum('credit') - Sum('debit'))
        .order_by('-amount')
        if (r['amount'] or 0) != 0
    ]

    return Response({
        'total_assets': assets,
        'total_liabilities': liabilities,
        'total_equity': equity,
        'asset_breakdown': asset_breakdown,
        'liability_breakdown': liability_breakdown + equity_breakdown,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def cash_flow(request):
    """Cash-flow statement split into operating / investing / financing buckets,
    returned as both overall totals and a month-by-month trend."""
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    # Cash-touching lines (money actually moved in or out of Cash/Bank accounts)
    cash_qs = qs.filter(account_subtype__in=['Cash', 'Bank'])

    # Classify each entry by counterparty account on the SAME voucher
    # Simplification: use voucher_type + account_subtype patterns.
    # Operating: SALE / PURCHASE / RECEIPT / PAYMENT on trading flows
    # Investing: vouchers touching Fixed Asset / Investment subtypes
    # Financing: vouchers touching Loan / Capital / Equity / Reserve subtypes
    INVESTING_HINT = Q(narration__icontains='asset') | Q(narration__icontains='invest')
    FINANCING_HINT = Q(narration__icontains='loan') | Q(narration__icontains='capital') | Q(narration__icontains='equity') | Q(narration__icontains='dividend')

    # Counterpart lines (non-cash legs) in the same vouchers tell us classification.
    # To avoid expensive joins, approximate:
    #   investing = cash lines for voucher_type in ('JOURNAL', 'PAYMENT') with investing hint
    #   financing = cash lines for voucher_type in ('JOURNAL', 'PAYMENT', 'RECEIPT') with financing hint
    #   operating = all other cash lines

    def _net(q):
        return float(q.aggregate(t=Sum('debit') - Sum('credit'))['t'] or 0)

    overall_operating = _net(
        cash_qs.exclude(INVESTING_HINT).exclude(FINANCING_HINT)
    )
    overall_investing = _net(cash_qs.filter(INVESTING_HINT))
    overall_financing = _net(cash_qs.filter(FINANCING_HINT))

    # Monthly trend
    months = _recent_months(f['start_date'], f['end_date'])
    period_keys = [p for p, _ in months]

    trend_rows = []
    # Pull monthly sums in three queries
    op_by_month = {
        r['entry_month']: float(r['t'] or 0)
        for r in cash_qs.exclude(INVESTING_HINT).exclude(FINANCING_HINT)
        .values('entry_month').annotate(t=Sum('debit') - Sum('credit'))
    }
    inv_by_month = {
        r['entry_month']: float(r['t'] or 0)
        for r in cash_qs.filter(INVESTING_HINT)
        .values('entry_month').annotate(t=Sum('debit') - Sum('credit'))
    }
    fin_by_month = {
        r['entry_month']: float(r['t'] or 0)
        for r in cash_qs.filter(FINANCING_HINT)
        .values('entry_month').annotate(t=Sum('debit') - Sum('credit'))
    }
    for period, label in months:
        op = op_by_month.get(period, 0)
        inv = inv_by_month.get(period, 0)
        fin = fin_by_month.get(period, 0)
        trend_rows.append({
            'period': period,
            'month': label,
            'operating': op,
            'investing': inv,
            'financing': fin,
            'net_cash_flow': op + inv + fin,
            'net': op + inv + fin,
        })

    return Response({
        'operating': overall_operating,
        'investing': overall_investing,
        'financing': overall_financing,
        'net_cash_flow': overall_operating + overall_investing + overall_financing,
        'trend': trend_rows,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def ratios(request):
    """Financial ratios — returns current values plus a month-by-month trend."""
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    def _agg(q, field_a, field_b):
        return float(q.aggregate(t=Sum(field_a) - Sum(field_b))['t'] or 0)

    # Overall totals
    current_assets = _agg(qs.filter(account_type='ASSET', parent_account_name__icontains='Current'), 'debit', 'credit')
    current_liabilities = _agg(qs.filter(account_type='LIABILITY', parent_account_name__icontains='Current'), 'credit', 'debit')
    total_equity = _agg(qs.filter(account_type='EQUITY'), 'credit', 'debit')
    total_liabilities = _agg(qs.filter(account_type='LIABILITY'), 'credit', 'debit')
    total_assets = _agg(qs.filter(account_type='ASSET'), 'debit', 'credit')
    revenue = _agg(qs.filter(account_type='REVENUE'), 'credit', 'debit')
    expenses = _agg(qs.filter(account_type='EXPENSE'), 'debit', 'credit')
    net_profit = revenue - expenses

    current_ratio = round(current_assets / current_liabilities, 2) if current_liabilities else 0
    debt_to_equity = round(total_liabilities / total_equity, 2) if total_equity else 0
    roe = round(net_profit / total_equity * 100, 2) if total_equity else 0
    roa = round(net_profit / total_assets * 100, 2) if total_assets else 0

    # Monthly trend — compute ratios per-period using entry_month rollups
    months = _recent_months(f['start_date'], f['end_date'])

    # Gather monthly sums for each account class
    def _monthly(filt, pos, neg):
        return {
            r['entry_month']: float(r['t'] or 0)
            for r in qs.filter(filt).values('entry_month')
            .annotate(t=Sum(pos) - Sum(neg))
        }

    rev_m = _monthly(Q(account_type='REVENUE'), 'credit', 'debit')
    exp_m = _monthly(Q(account_type='EXPENSE'), 'debit', 'credit')
    ca_m = _monthly(Q(account_type='ASSET', parent_account_name__icontains='Current'), 'debit', 'credit')
    cl_m = _monthly(Q(account_type='LIABILITY', parent_account_name__icontains='Current'), 'credit', 'debit')
    ta_m = _monthly(Q(account_type='ASSET'), 'debit', 'credit')
    tl_m = _monthly(Q(account_type='LIABILITY'), 'credit', 'debit')
    te_m = _monthly(Q(account_type='EQUITY'), 'credit', 'debit')

    trend = []
    # Balances are cumulative in principle; our monthly sums reflect posted
    # deltas per period, which is the best we can do without opening-balance
    # data. Use running totals to approximate "as-of-month-end" stance.
    running = {'ca': 0, 'cl': 0, 'ta': 0, 'tl': 0, 'te': 0}
    for period, label in months:
        running['ca'] += ca_m.get(period, 0)
        running['cl'] += cl_m.get(period, 0)
        running['ta'] += ta_m.get(period, 0)
        running['tl'] += tl_m.get(period, 0)
        running['te'] += te_m.get(period, 0)
        rev_p = rev_m.get(period, 0)
        exp_p = exp_m.get(period, 0)
        net_p = rev_p - exp_p

        cr = round(running['ca'] / running['cl'], 2) if running['cl'] else 0
        de = round(running['tl'] / running['te'], 2) if running['te'] else 0
        roe_p = round(net_p / running['te'] * 100, 2) if running['te'] else 0
        roa_p = round(net_p / running['ta'] * 100, 2) if running['ta'] else 0
        trend.append({
            'period': period,
            'month': label,
            'currentRatio': cr,
            'current_ratio': cr,
            'debtEquity': de,
            'debt_to_equity': de,
            'roe': roe_p,
            'roa': roa_p,
        })

    return Response({
        'current_ratio': current_ratio,
        'debt_to_equity': debt_to_equity,
        'roe': roe,
        'roa': roa,
        'trend': trend,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def profit_bridge(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    revenue = float(qs.filter(account_type='REVENUE').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    cogs = float(qs.filter(account_type='EXPENSE', account_subtype='Purchases').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)
    gross_profit = revenue - cogs

    # Individual expense categories (excluding COGS/Purchases)
    expense_cats = list(
        qs.filter(account_type='EXPENSE').exclude(account_subtype='Purchases')
        .values('account_subtype')
        .annotate(amount=Sum('debit') - Sum('credit'))
        .order_by('-amount')
    )

    total_expenses = sum(float(e['amount'] or 0) for e in expense_cats)
    net_profit = gross_profit - total_expenses

    bridge = [
        {'name': 'Revenue', 'value': revenue, 'type': 'positive'},
        {'name': 'COGS', 'value': -cogs, 'type': 'negative'},
        {'name': 'Gross Profit', 'value': gross_profit, 'type': 'subtotal'},
    ]
    for cat in expense_cats[:8]:
        amt = float(cat['amount'] or 0)
        bridge.append({
            'name': cat['account_subtype'] or 'Other',
            'value': -amt,
            'type': 'negative',
        })
    bridge.append({'name': 'Net Profit', 'value': net_profit, 'type': 'total'})

    return Response(bridge)


@api_view(['GET'])
@permission_classes([AllowAny])
def expense_detail(request):
    f = parse_filters(request)
    qs = apply_financial_filters(
        ReportFinancial.objects.filter(is_posted=True, account_type='EXPENSE'), f
    ).order_by('-entry_date').values(
        'entry_date', 'account_name', 'narration', 'debit',
        'party_name', 'voucher_type',
    )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.all(), f).order_by('-entry_date').values(
        'entry_date', 'entry_no', 'voucher_type', 'account_code',
        'account_name', 'account_type', 'debit', 'credit', 'narration',
        'party_name', 'location_name',
    )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(list(page) if page else [])
