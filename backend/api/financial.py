"""Financial Deep Dive API endpoints."""
from decimal import Decimal
from django.db.models import Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportFinancial
from .helpers import parse_filters, apply_financial_filters


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

    revenue_trend = list(
        qs.filter(account_type='REVENUE')
        .values('entry_month')
        .annotate(revenue=Sum('credit') - Sum('debit'))
        .order_by('entry_month')
    )
    expense_trend = list(
        qs.filter(account_type='EXPENSE')
        .values('entry_month')
        .annotate(expenses=Sum('debit') - Sum('credit'))
        .order_by('entry_month')
    )

    # Merge into unified trend
    months = {}
    for r in revenue_trend:
        months[r['entry_month']] = {'month': r['entry_month'], 'revenue': float(r['revenue'] or 0), 'expenses': 0}
    for e in expense_trend:
        if e['entry_month'] in months:
            months[e['entry_month']]['expenses'] = float(e['expenses'] or 0)
        else:
            months[e['entry_month']] = {'month': e['entry_month'], 'revenue': 0, 'expenses': float(e['expenses'] or 0)}
    for m in months.values():
        m['net_profit'] = m['revenue'] - m['expenses']

    return Response(sorted(months.values(), key=lambda x: x['month']))


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

    # Breakdown by subtype
    asset_breakdown = list(
        qs.filter(account_type='ASSET').values('account_subtype', 'account_name')
        .annotate(amount=Sum('debit') - Sum('credit')).order_by('-amount')
    )
    liability_breakdown = list(
        qs.filter(account_type='LIABILITY').values('account_subtype', 'account_name')
        .annotate(amount=Sum('credit') - Sum('debit')).order_by('-amount')
    )

    return Response({
        'total_assets': assets,
        'total_liabilities': liabilities,
        'total_equity': equity,
        'asset_breakdown': asset_breakdown,
        'liability_breakdown': liability_breakdown,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def cash_flow(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    operating = float(
        qs.filter(voucher_type__in=['SALE', 'PURCHASE', 'RECEIPT', 'PAYMENT'])
        .filter(account_subtype__in=['Cash', 'Bank'])
        .aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0
    )

    return Response({
        'operating': operating,
        'investing': 0,  # Would need fixed asset tracking
        'financing': 0,  # Would need loan/equity tracking
        'net_cash_flow': operating,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def ratios(request):
    f = parse_filters(request)
    qs = apply_financial_filters(ReportFinancial.objects.filter(is_posted=True), f)

    current_assets = float(qs.filter(account_type='ASSET', parent_account_name__icontains='Current').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)
    current_liabilities = float(qs.filter(account_type='LIABILITY', parent_account_name__icontains='Current').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    total_equity = float(qs.filter(account_type='EQUITY').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    total_liabilities = float(qs.filter(account_type='LIABILITY').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    total_assets = float(qs.filter(account_type='ASSET').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)
    revenue = float(qs.filter(account_type='REVENUE').aggregate(total=Sum('credit') - Sum('debit'))['total'] or 0)
    net_profit = revenue - float(qs.filter(account_type='EXPENSE').aggregate(total=Sum('debit') - Sum('credit'))['total'] or 0)

    return Response({
        'current_ratio': round(current_assets / current_liabilities, 2) if current_liabilities else 0,
        'debt_to_equity': round(total_liabilities / total_equity, 2) if total_equity else 0,
        'roe': round(net_profit / total_equity * 100, 2) if total_equity else 0,
        'roa': round(net_profit / total_assets * 100, 2) if total_assets else 0,
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
