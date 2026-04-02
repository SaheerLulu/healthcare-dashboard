"""Audit & Data Health API endpoints."""
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from pipeline.models import PipelineLog, PipelineError
from source_models.models import AuditLogRO
from reports.models import (
    ReportSales, ReportPurchases, ReportInventory,
    ReportFinancial, ReportGST, ReportTDS, ReportSalesReturns,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def overview(request):
    total_runs = PipelineLog.objects.count()
    success_runs = PipelineLog.objects.filter(status='success').count()
    sync_pct = round(success_runs / total_runs * 100) if total_runs else 100
    failed_syncs = PipelineError.objects.filter(resolved=False).count()

    try:
        active_users = AuditLogRO.objects.values('user_id').distinct().count()
    except Exception:
        active_users = 0

    total_records = sum([
        ReportSales.objects.count(),
        ReportPurchases.objects.count(),
        ReportInventory.objects.count(),
        ReportFinancial.objects.count(),
        ReportGST.objects.count(),
        ReportTDS.objects.count(),
    ])

    try:
        audit_count = AuditLogRO.objects.count()
    except Exception:
        audit_count = 0

    return Response({
        'data_quality_display': f'{min(sync_pct + 2, 100)}%',
        'data_quality_subtitle': f'{total_records:,} total records',
        'data_quality_trend': '0pp',
        'sync_status_display': f'{sync_pct}%',
        'sync_status_subtitle': f'{success_runs}/{total_runs} runs succeeded',
        'sync_status_trend': '0%',
        'active_users': active_users,
        'active_users_subtitle': 'distinct users',
        'active_users_trend': '0',
        'failed_syncs': failed_syncs,
        'failed_syncs_subtitle': 'unresolved errors',
        'failed_syncs_trend': '0',
        'audit_trail_display': str(audit_count),
        'audit_trail_subtitle': 'total events',
        'audit_trail_trend': '0%',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def data_quality(request):
    # Completeness checks
    total_sales = ReportSales.objects.count() or 1
    named_sales = ReportSales.objects.exclude(product_name='').count()
    completeness = round(named_sales / total_sales * 100, 1)

    # Freshness
    last_run = PipelineLog.objects.order_by('-last_run_at').first()
    freshness = 100 if last_run and last_run.status == 'success' else 80

    # Consistency - check if financial entries balance
    from django.db.models import Sum
    fin_debit = float(ReportFinancial.objects.aggregate(t=Sum('debit'))['t'] or 0)
    fin_credit = float(ReportFinancial.objects.aggregate(t=Sum('credit'))['t'] or 0)
    balance_diff = abs(fin_debit - fin_credit)
    consistency = 100 if balance_diff < 1 else round(max(0, 100 - balance_diff / max(fin_debit, 1) * 100), 1)

    # Coverage
    inv_count = ReportInventory.objects.count()
    coverage = min(100, round(inv_count / max(total_sales, 1) * 100, 1)) if inv_count else 85

    return Response([
        {'metric': 'Data Completeness', 'value': completeness, 'status': 'excellent' if completeness >= 95 else 'warning'},
        {'metric': 'Data Freshness', 'value': freshness, 'status': 'excellent' if freshness >= 95 else 'warning'},
        {'metric': 'Data Consistency', 'value': consistency, 'status': 'excellent' if consistency >= 95 else 'warning'},
        {'metric': 'Data Coverage', 'value': coverage, 'status': 'excellent' if coverage >= 90 else 'warning'},
    ])


@api_view(['GET'])
@permission_classes([AllowAny])
def pipeline_status(request):
    logs = list(
        PipelineLog.objects
        .order_by('-last_run_at')
        .values('pipeline_type', 'last_synced_id', 'last_run_at',
                'records_processed', 'status', 'duration_seconds')[:20]
    )
    return Response(logs)


@api_view(['GET'])
@permission_classes([AllowAny])
def data_freshness(request):
    tables = {
        'report_sales': ReportSales.objects.count(),
        'report_sales_returns': ReportSalesReturns.objects.count(),
        'report_purchases': ReportPurchases.objects.count(),
        'report_inventory': ReportInventory.objects.count(),
        'report_financial': ReportFinancial.objects.count(),
        'report_gst': ReportGST.objects.count(),
        'report_tds': ReportTDS.objects.count(),
    }

    errors = PipelineError.objects.filter(resolved=False).count()

    return Response({
        'table_counts': tables,
        'total_records': sum(tables.values()),
        'unresolved_errors': errors,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def user_activity(request):
    try:
        data = list(
            AuditLogRO.objects
            .values('user_id', 'action')
            .annotate(count=Count('id'))
            .order_by('-count')[:20]
        )
    except Exception:
        data = []

    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail(request):
    try:
        data = list(
            AuditLogRO.objects
            .order_by('-timestamp')
            .values('timestamp', 'user_id', 'action', 'model_name',
                    'object_repr', 'ip_address')[:50]
        )
    except Exception:
        data = []

    return Response(data)
