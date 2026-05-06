"""Pipeline trigger API endpoints."""
import threading
from rest_framework.decorators import api_view, permission_classes
from .permissions import DashboardPermission
from rest_framework.response import Response
from pipeline.inventory_pipeline import InventoryPipeline
from pipeline.financial_pipeline import FinancialPipeline
from pipeline.models import PipelineLog, PipelineError

# Simple in-memory flag for pipeline running state
_pipeline_lock = threading.Lock()
_pipeline_running = {'active': False, 'progress': '', 'result': None}


def _run_pipeline_background(full=False):
    """Run all pipelines in a background thread."""
    global _pipeline_running
    try:
        _pipeline_running['progress'] = 'Running inventory pipeline...'
        inv_results = InventoryPipeline().run_all(full=full)

        _pipeline_running['progress'] = 'Running financial pipeline...'
        fin_results = FinancialPipeline().run_all(full=full)

        total = inv_results['total'] + fin_results['total']
        duration = round(inv_results['duration_seconds'] + fin_results['duration_seconds'], 2)

        _pipeline_running['result'] = {
            'status': 'success',
            'total_records': total,
            'duration_seconds': duration,
            'inventory': inv_results,
            'financial': fin_results,
        }
        _pipeline_running['progress'] = 'Complete'
    except Exception as e:
        _pipeline_running['result'] = {
            'status': 'error',
            'error': str(e),
        }
        _pipeline_running['progress'] = f'Error: {e}'
    finally:
        _pipeline_running['active'] = False


@api_view(['POST'])
@permission_classes([DashboardPermission])
def trigger_pipeline(request):
    """Trigger all pipelines. Runs in background thread."""
    global _pipeline_running

    if _pipeline_running['active']:
        return Response({
            'status': 'already_running',
            'message': 'A pipeline is already running.',
            'progress': _pipeline_running['progress'],
        }, status=409)

    full = request.data.get('full', False)

    with _pipeline_lock:
        _pipeline_running['active'] = True
        _pipeline_running['progress'] = 'Starting...'
        _pipeline_running['result'] = None

    thread = threading.Thread(target=_run_pipeline_background, args=(full,), daemon=True)
    thread.start()

    return Response({
        'status': 'started',
        'message': f'Pipeline {"full refresh" if full else "incremental sync"} started.',
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
def pipeline_progress(request):
    """Check current pipeline run status."""
    return Response({
        'active': _pipeline_running['active'],
        'progress': _pipeline_running['progress'],
        'result': _pipeline_running['result'],
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
def pipeline_history(request):
    """Return recent pipeline run history."""
    logs = list(
        PipelineLog.objects
        .order_by('-last_run_at')
        .values('pipeline_type', 'last_synced_id', 'last_run_at',
                'records_processed', 'status', 'duration_seconds', 'error_message')[:30]
    )
    return Response(logs)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def pipeline_errors(request):
    """Return recent unresolved pipeline errors (DASH-E19-F01-US04).

    Filters to ``resolved=False`` by default; pass ``?include_resolved=1``
    to see the full history. Capped at 100 to keep payloads small.
    """
    qs = PipelineError.objects.order_by('-created_at')
    if request.query_params.get('include_resolved', '').lower() not in ('1', 'true', 'yes'):
        qs = qs.filter(resolved=False)

    rows = list(
        qs.values(
            'id',
            'pipeline_type',
            'source_id',
            'error_message',
            'retry_count',
            'resolved',
            'created_at',
        )[:100]
    )
    return Response({
        'count': len(rows),
        'errors': rows,
    })
