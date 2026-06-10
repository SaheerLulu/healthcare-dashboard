"""GST Compliance + TDS Tracker API endpoints."""
from decimal import Decimal
from django.db.models import Sum, Count, Q, Avg
from rest_framework.decorators import api_view, permission_classes
from .permissions import DashboardPermission
from rest_framework.response import Response

from reports.models import ReportGST, ReportTDS
from .helpers import (
    parse_filters, apply_dim_filters, apply_ordering, paginate_detail,
    DetailPagination,
)

# Dimension → column mappings (docs/DRILLTHROUGH_DESIGN.md §1).
# `month` arrives as 'YYYY-MM' which matches the period/transaction_month format.
GST_DIMS = {
    'gst_rate': 'gst_rate',
    'invoice_type': 'invoice_type',
    'filing_status': 'filing_status',
    'source_table': 'source_table',
    'supplier_name': 'supplier_name',
    'invoice_no': 'invoice_no',
    'month': 'period',
}
# report_gst unions five heterogeneous registers; a column populated on one
# register is NULL/0 on the others, so applying the full GST_DIMS to a
# register-specific queryset silently zeroes it (e.g. gst_rate on GSTR-3B).
# Each register therefore only honors the dims its rows actually carry.
GSTR1_DIMS = {
    'gst_rate': 'gst_rate', 'invoice_type': 'invoice_type',
    'invoice_no': 'invoice_no', 'month': 'period',
}
GSTR3B_DIMS = {'filing_status': 'filing_status', 'month': 'period'}
GSTR2B_DIMS = {
    'supplier_name': 'supplier_name', 'invoice_no': 'invoice_no',
    'month': 'period',
}
ITC_DIMS = {'supplier_name': 'supplier_name', 'month': 'period'}
RCM_DIMS = {'supplier_name': 'supplier_name', 'month': 'period'}
TDS_DIMS = {
    'section': 'section',
    'status': 'status',
    'month': 'transaction_month',
}


# ─── GST ──────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([DashboardPermission])
def gst_overview(request):
    f = parse_filters(request)
    start_period = f['start_date'][:7]
    end_period = f['end_date'][:7]

    gstr3b = ReportGST.objects.filter(source_table='gstr3b', period__gte=start_period, period__lte=end_period)
    gstr1 = ReportGST.objects.filter(source_table='gstr1', period__gte=start_period, period__lte=end_period)
    gstr2b = ReportGST.objects.filter(source_table='gstr2b', period__gte=start_period, period__lte=end_period)
    gstr3b = apply_dim_filters(gstr3b, f, GSTR3B_DIMS)
    gstr1 = apply_dim_filters(gstr1, f, GSTR1_DIMS)
    gstr2b = apply_dim_filters(gstr2b, f, GSTR2B_DIMS)

    output_gst = float(gstr1.aggregate(total=Sum('cgst') + Sum('sgst') + Sum('igst'))['total'] or 0)
    # Prefer the consolidated gstr3b summary; fall back to gstr2b for ITC and
    # gstr1 - gstr2b for net liability when 3B is sparse (gstr3b is monthly
    # and often only filed for closed periods).
    itc_3b = float(gstr3b.aggregate(total=Sum('itc_cgst') + Sum('itc_sgst') + Sum('itc_igst'))['total'] or 0)
    itc_2b = float(gstr2b.aggregate(total=Sum('cgst') + Sum('sgst') + Sum('igst'))['total'] or 0)
    itc = itc_3b if itc_3b else itc_2b
    net_liability_3b = float(gstr3b.aggregate(total=Sum('net_payable_cgst') + Sum('net_payable_sgst') + Sum('net_payable_igst'))['total'] or 0)
    net_liability = net_liability_3b if net_liability_3b else max(output_gst - itc, 0)
    filings_pending = gstr3b.filter(filing_status='draft').count()

    return Response({
        'output_gst': output_gst,
        'input_tax_credit': itc,
        'net_liability': net_liability,
        'filings_pending': filings_pending,
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
def gstr1(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='gstr1', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )
    qs = apply_dim_filters(qs, f, GSTR1_DIMS)

    summary = list(
        qs.values('period', 'invoice_type')
        .annotate(
            count=Count('id'),
            taxable=Sum('taxable_value'),
            cgst=Sum('cgst'), sgst=Sum('sgst'), igst=Sum('igst'),
        )
        .order_by('period', 'invoice_type')
    )
    return Response(summary)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def gstr3b(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='gstr3b', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    qs = apply_dim_filters(qs, f, GSTR3B_DIMS)

    qs = qs.values(
        'period', 'outward_taxable', 'cgst', 'sgst', 'igst',
        'itc_cgst', 'itc_sgst', 'itc_igst',
        'net_payable_cgst', 'net_payable_sgst', 'net_payable_igst',
        'filing_status', 'filed_date', 'location_name',
    ).order_by('period')
    return paginate_detail(request, qs)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def itc(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table__in=['gstr2b', 'itc'],
        period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )
    qs = apply_dim_filters(qs, f, ITC_DIMS)

    eligible = float(qs.filter(itc_eligible=True).aggregate(total=Sum('cgst') + Sum('sgst') + Sum('igst'))['total'] or 0)
    ineligible = float(qs.filter(itc_eligible=False).aggregate(total=Sum('cgst') + Sum('sgst') + Sum('igst'))['total'] or 0)

    matched = qs.filter(match_status='matched').count()
    unmatched = qs.filter(match_status='unmatched').count()
    missing = qs.filter(match_status='missing').count()

    return Response({
        'eligible': eligible,
        'ineligible': ineligible,
        'matched': matched,
        'unmatched': unmatched,
        'missing': missing,
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
def rcm(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='rcm', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )
    qs = apply_dim_filters(qs, f, RCM_DIMS)

    qs = qs.values(
        'period', 'supplier_name', 'service_type', 'sac_code',
        'taxable_value', 'cgst', 'sgst', 'igst',
    ).order_by('period')
    return paginate_detail(request, qs)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def gst_by_rate(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='gstr1', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )
    qs = apply_dim_filters(qs, f, GSTR1_DIMS)

    data = list(
        qs.values('gst_rate')
        .annotate(
            count=Count('id'),
            taxable=Sum('taxable_value'),
            total_tax=Sum('cgst') + Sum('sgst') + Sum('igst'),
        )
        .order_by('gst_rate')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def gst_detail(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    qs = apply_dim_filters(qs, f, GST_DIMS)
    columns = (
        'source_table', 'period', 'invoice_no', 'invoice_type',
        'taxable_value', 'gst_rate', 'cgst', 'sgst', 'igst',
        'customer_gstin', 'supplier_gstin', 'location_name',
    )
    qs = apply_ordering(qs, f, allowed=columns, default='-period').values(*columns)

    # Inline DetailPagination (not paginate_detail) so the rows can be
    # post-processed before the envelope is built.
    paginator = DetailPagination()
    page = paginator.paginate_queryset(qs, request) or []
    rows = list(page)
    # Fill in invoice_type for rows that don't carry one (gstr2b/gstr3b),
    # using the source table as a friendly label.
    table_label = {'gstr1': 'Outward', 'gstr2b': 'Inward', 'gstr3b': 'Summary'}
    for r in rows:
        if not r.get('invoice_type'):
            r['invoice_type'] = table_label.get(r.get('source_table'), '—')
    return paginator.get_paginated_response(rows)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def gst_compliance_status(request):
    f = parse_filters(request)
    start_period = f['start_date'][:7]
    end_period = f['end_date'][:7]

    qs = ReportGST.objects.filter(
        source_table='gstr3b',
        period__gte=start_period, period__lte=end_period,
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    qs = apply_dim_filters(qs, f, GSTR3B_DIMS)

    data = list(
        qs.values('period', 'filing_status', 'filed_date', 'location_name')
        .order_by('period')
    )
    return Response(data)


# ─── TDS ──────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([DashboardPermission])
def tds_overview(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )
    qs = apply_dim_filters(qs, f, TDS_DIMS)

    agg = qs.aggregate(
        total_deducted=Sum('tds_amount'),
        total_gross=Sum('gross_amount'),
        challans_paid=Count('id', filter=Q(status='challan_paid')),
        pending=Count('id', filter=Q(status='pending')),
    )
    agg = {k: float(v or 0) for k, v in agg.items()}

    by_section = list(
        qs.values('section')
        .annotate(amount=Sum('tds_amount'), count=Count('id'))
        .order_by('-amount')
    )
    agg['by_section'] = by_section

    return Response(agg)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def tds_deductions(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )
    qs = apply_dim_filters(qs, f, TDS_DIMS)
    columns = (
        'transaction_date', 'deductee_name', 'deductee_pan', 'section',
        'nature_of_payment', 'gross_amount', 'tds_rate', 'tds_amount',
        'status', 'challan_no',
    )
    qs = apply_ordering(qs, f, allowed=columns, default='-transaction_date').values(*columns)
    return paginate_detail(request, qs)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def tds_challans(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
        challan_no__gt='',
    )
    qs = apply_dim_filters(qs, f, TDS_DIMS)
    qs = qs.values(
        'challan_no', 'challan_date', 'bsr_code',
        'challan_total_amount', 'section',
    ).distinct().order_by('-challan_date')

    return paginate_detail(request, qs)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def tds_by_section(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )
    qs = apply_dim_filters(qs, f, TDS_DIMS)

    data = list(
        qs.values('section', 'deductee_type')
        .annotate(
            count=Count('id'),
            gross=Sum('gross_amount'),
            tds=Sum('tds_amount'),
            avg_rate=Avg('tds_rate'),
        )
        .order_by('-tds')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def tds_trend(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )
    qs = apply_dim_filters(qs, f, TDS_DIMS)

    data = list(
        qs.values('transaction_month')
        .annotate(tds=Sum('tds_amount'), count=Count('id'))
        .order_by('transaction_month')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def tds_detail(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )
    if 'location_id' in f:
        qs = qs.filter(location_id=f['location_id'])
    elif 'location_ids' in f:
        qs = qs.filter(location_id__in=f['location_ids'])
    qs = apply_dim_filters(qs, f, TDS_DIMS)
    columns = (
        'transaction_date', 'deductee_name', 'deductee_pan', 'section', 'deductee_type',
        'nature_of_payment', 'gross_amount', 'tds_rate', 'tds_amount',
        'status', 'challan_no', 'challan_date', 'location_name',
    )
    qs = apply_ordering(qs, f, allowed=columns, default='-transaction_date').values(*columns)
    return paginate_detail(request, qs)
