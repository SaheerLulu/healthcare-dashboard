"""Reconciliation endpoints — DASH-E00-A07 (Compliance NFR).

The compliance NFR mandates three reconciliation widgets before GA:

  - Sales (dashboard) ↔ Sales (inventory app)        : variance ≤ 0.01 %
  - GST liability (dashboard) ↔ GSTR-3B preview      : variance ≤ ₹1
  - Cash position (dashboard) ↔ Bank book (accounting): variance = 0

These endpoints compare the denormalised dashboard reporting tables
against the upstream source tables (``source_models``) over the same
date range. They return a small JSON envelope so the frontend can render
a green/amber/red tile without doing math client-side.

Auditors (P-AUDIT) load these for a period and click into the variance
to find the offending row.

Internal computation lives in ``_compute_*`` helpers; the
``@api_view``-decorated wrappers handle HTTP plumbing only. That split
lets ``reconcile_summary`` aggregate the three results without
double-going-through-DRF (which would re-wrap the request and break).
"""
from decimal import Decimal

from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .helpers import parse_filters
from .permissions import DashboardPermission
from reports.models import ReportSales, ReportFinancial, ReportGST


def _verdict(variance_abs: Decimal, threshold_abs: Decimal) -> str:
    if variance_abs <= threshold_abs:
        return 'pass'
    if variance_abs <= threshold_abs * Decimal('5'):
        return 'amber'
    return 'fail'


def _compute_sales(filters):
    start, end = filters['start_date'], filters['end_date']
    dash_rev = ReportSales.objects.filter(
        sale_date__gte=start, sale_date__lte=end
    ).aggregate(total=Sum('line_total'))['total'] or Decimal('0')

    try:
        from source_models.models import POSOrderLineRO, B2BSalesOrderLineRO

        pos_total = POSOrderLineRO.objects.filter(
            pos_order__order_date__gte=start, pos_order__order_date__lte=end
        ).aggregate(total=Sum('line_total'))['total'] or Decimal('0')
        b2b_total = B2BSalesOrderLineRO.objects.filter(
            b2b_sales_order__order_date__gte=start,
            b2b_sales_order__order_date__lte=end,
        ).aggregate(total=Sum('line_total'))['total'] or Decimal('0')
        source_rev = pos_total + b2b_total
        source_available = True
    except Exception:
        source_rev = Decimal('0')
        source_available = False

    variance = Decimal(dash_rev) - Decimal(source_rev)
    variance_abs = abs(variance)
    threshold = max(Decimal('1'), abs(Decimal(dash_rev)) * Decimal('0.0001'))

    return {
        'metric': 'sales_revenue',
        'period': {'start': start, 'end': end},
        'dashboard_value': float(dash_rev),
        'source_value': float(source_rev),
        'source_available': source_available,
        'variance': float(variance),
        'variance_abs': float(variance_abs),
        'threshold': float(threshold),
        'verdict': _verdict(variance_abs, threshold) if source_available else 'unknown',
        'unit': 'INR',
    }


def _compute_gst(filters):
    start, end = filters['start_date'], filters['end_date']
    gst_qs = ReportGST.objects.filter(
        period__gte=start[:7], period__lte=end[:7], source_table='gstr3b'
    )
    dash_total = (
        gst_qs.aggregate(
            total=Sum('net_payable_cgst') + Sum('net_payable_sgst') + Sum('net_payable_igst')
        )['total'] or Decimal('0')
    )

    # Upstream gst_3b_preview schema is unstable across accounting
    # versions; mark source unavailable rather than fabricate a number.
    source_total = Decimal('0')
    source_available = False

    variance = Decimal(dash_total) - Decimal(source_total)
    variance_abs = abs(variance)
    threshold = Decimal('1')

    return {
        'metric': 'gst_net_liability',
        'period': {'start': start, 'end': end},
        'dashboard_value': float(dash_total),
        'source_value': float(source_total),
        'source_available': source_available,
        'variance': float(variance),
        'variance_abs': float(variance_abs),
        'threshold': float(threshold),
        'verdict': _verdict(variance_abs, threshold) if source_available else 'unknown',
        'unit': 'INR',
    }


def _compute_cash(filters):
    start, end = filters['start_date'], filters['end_date']
    fin_qs = ReportFinancial.objects.filter(
        is_posted=True,
        entry_date__gte=start, entry_date__lte=end,
        account_subtype__in=['Cash', 'Bank'],
    )
    dash_balance = fin_qs.aggregate(total=Sum('debit') - Sum('credit'))['total'] or Decimal('0')

    # Upstream bank book endpoint isn't yet wired into source_models.
    source_balance = Decimal('0')
    source_available = False

    variance = Decimal(dash_balance) - Decimal(source_balance)
    variance_abs = abs(variance)
    threshold = Decimal('0')

    return {
        'metric': 'cash_position',
        'period': {'start': start, 'end': end},
        'dashboard_value': float(dash_balance),
        'source_value': float(source_balance),
        'source_available': source_available,
        'variance': float(variance),
        'variance_abs': float(variance_abs),
        'threshold': float(threshold),
        'verdict': _verdict(variance_abs, threshold) if source_available else 'unknown',
        'unit': 'INR',
    }


@api_view(['GET'])
@permission_classes([DashboardPermission])
def reconcile_sales(request):
    return Response(_compute_sales(parse_filters(request)))


@api_view(['GET'])
@permission_classes([DashboardPermission])
def reconcile_gst(request):
    return Response(_compute_gst(parse_filters(request)))


@api_view(['GET'])
@permission_classes([DashboardPermission])
def reconcile_cash(request):
    return Response(_compute_cash(parse_filters(request)))


@api_view(['GET'])
@permission_classes([DashboardPermission])
def reconcile_summary(request):
    """One call returns all three reconciliations.

    Used by the audit dashboard tile so a P-CFO sees a single
    pass/amber/fail/unknown verdict per metric without three round-trips.
    """
    f = parse_filters(request)
    items = [_compute_sales(f), _compute_gst(f), _compute_cash(f)]
    overall = 'pass'
    for it in items:
        if it['verdict'] == 'fail':
            overall = 'fail'
            break
        if it['verdict'] == 'amber' and overall != 'fail':
            overall = 'amber'
        elif it['verdict'] == 'unknown' and overall == 'pass':
            overall = 'unknown'
    return Response({
        'overall': overall,
        'items': items,
    })
