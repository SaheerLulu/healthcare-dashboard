"""GST Compliance + TDS Tracker API endpoints."""
from decimal import Decimal
from django.db.models import Sum, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from reports.models import ReportGST, ReportTDS
from .helpers import parse_filters


# ─── GST ──────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def gst_overview(request):
    f = parse_filters(request)
    start_period = f['start_date'][:7]
    end_period = f['end_date'][:7]

    gstr3b = ReportGST.objects.filter(source_table='gstr3b', period__gte=start_period, period__lte=end_period)
    gstr1 = ReportGST.objects.filter(source_table='gstr1', period__gte=start_period, period__lte=end_period)

    output_gst = float(gstr1.aggregate(total=Sum('cgst') + Sum('sgst') + Sum('igst'))['total'] or 0)
    itc = float(gstr3b.aggregate(total=Sum('itc_cgst') + Sum('itc_sgst') + Sum('itc_igst'))['total'] or 0)
    net_liability = float(gstr3b.aggregate(total=Sum('net_payable_cgst') + Sum('net_payable_sgst') + Sum('net_payable_igst'))['total'] or 0)
    filings_pending = gstr3b.filter(filing_status='draft').count()

    return Response({
        'output_gst': output_gst,
        'input_tax_credit': itc,
        'net_liability': net_liability,
        'filings_pending': filings_pending,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def gstr1(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='gstr1', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )

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
@permission_classes([AllowAny])
def gstr3b(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='gstr3b', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )

    data = list(qs.values(
        'period', 'outward_taxable', 'cgst', 'sgst', 'igst',
        'itc_cgst', 'itc_sgst', 'itc_igst',
        'net_payable_cgst', 'net_payable_sgst', 'net_payable_igst',
        'filing_status', 'filed_date', 'location_name',
    ).order_by('period'))
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def itc(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table__in=['gstr2b', 'itc'],
        period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )

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
@permission_classes([AllowAny])
def rcm(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='rcm', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )

    data = list(qs.values(
        'period', 'supplier_name', 'service_type', 'sac_code',
        'taxable_value', 'cgst', 'sgst', 'igst',
    ).order_by('period'))
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def gst_by_rate(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        source_table='gstr1', period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    )

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
@permission_classes([AllowAny])
def gst_detail(request):
    f = parse_filters(request)
    qs = ReportGST.objects.filter(
        period__gte=f['start_date'][:7], period__lte=f['end_date'][:7],
    ).order_by('-period')

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = list(page.values(
        'source_table', 'period', 'invoice_no', 'invoice_type',
        'taxable_value', 'gst_rate', 'cgst', 'sgst', 'igst',
        'customer_gstin', 'supplier_gstin', 'location_name',
    )) if page else []
    return paginator.get_paginated_response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def gst_compliance_status(request):
    f = parse_filters(request)
    start_period = f['start_date'][:7]
    end_period = f['end_date'][:7]

    data = list(
        ReportGST.objects.filter(
            source_table='gstr3b',
            period__gte=start_period, period__lte=end_period,
        )
        .values('period', 'filing_status', 'filed_date', 'location_name')
        .order_by('period')
    )
    return Response(data)


# ─── TDS ──────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def tds_overview(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )

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
@permission_classes([AllowAny])
def tds_deductions(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    ).order_by('-transaction_date')

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = list(page.values(
        'transaction_date', 'deductee_name', 'deductee_pan', 'section',
        'nature_of_payment', 'gross_amount', 'tds_rate', 'tds_amount',
        'status', 'challan_no',
    )) if page else []
    return paginator.get_paginated_response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def tds_challans(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
        challan_no__gt='',
    ).values(
        'challan_no', 'challan_date', 'bsr_code',
        'challan_total_amount', 'section',
    ).distinct().order_by('-challan_date')

    return Response(list(qs))


@api_view(['GET'])
@permission_classes([AllowAny])
def tds_by_section(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )

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
@permission_classes([AllowAny])
def tds_trend(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    )

    data = list(
        qs.values('transaction_month')
        .annotate(tds=Sum('tds_amount'), count=Count('id'))
        .order_by('transaction_month')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def tds_detail(request):
    f = parse_filters(request)
    qs = ReportTDS.objects.filter(
        transaction_date__gte=f['start_date'], transaction_date__lte=f['end_date'],
    ).order_by('-transaction_date')

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = list(page.values(
        'transaction_date', 'deductee_name', 'section', 'deductee_type',
        'nature_of_payment', 'gross_amount', 'tds_rate', 'tds_amount',
        'status', 'challan_no', 'challan_date', 'location_name',
    )) if page else []
    return paginator.get_paginated_response(data)
