import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Database,
  Clock,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';

/**
 * Pipeline Management page (DASH-E19-F01).
 *
 * Renders four sub-views from a single page so DevOps/IT (P-IT) can
 * operate the ETL without leaving the screen:
 *
 *  US01 — View ETL state          → status banner + last-run-per-pipeline cards
 *  US02 — Trigger incremental sync → "Sync now" button (POST /pipeline/trigger/)
 *  US03 — Trigger full re-sync     → "Full refresh" button + confirm dialog
 *  US04 — Pipeline error log       → unresolved errors table
 */

const formatDuration = (s: number | null | undefined) => {
  if (s == null) return '—';
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const r = (s - m * 60).toFixed(0);
  return `${m}m ${r}s`;
};

const formatAgo = (iso: string) => {
  if (!iso) return '—';
  const ageMs = Date.now() - new Date(iso).getTime();
  if (!isFinite(ageMs) || ageMs < 0) return '—';
  const m = Math.floor(ageMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; fg: string; icon: any }> = {
    success: { bg: 'rgba(15, 157, 154, 0.12)', fg: 'var(--brand-press)', icon: CheckCircle },
    error: { bg: 'rgba(192, 57, 43, 0.12)', fg: 'var(--danger)', icon: XCircle },
    running: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#B45309', icon: Loader2 },
  };
  const cfg = map[status] || map.success;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
};

export const PipelineManagement = () => {
  const [pipelineState, setPipelineState] = useState<{
    running: boolean;
    progress: string;
    result: any;
  }>({ running: false, progress: '', result: null });

  const [history, setHistory] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingErrors, setLoadingErrors] = useState(true);
  const [confirmFull, setConfirmFull] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/pipeline/history/');
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHistory([]);
    }
    setLoadingHistory(false);
  }, []);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await api.get('/pipeline/errors/');
      setErrors(res.data?.errors || []);
    } catch {
      setErrors([]);
    }
    setLoadingErrors(false);
  }, []);

  const checkProgress = useCallback(async () => {
    try {
      const res = await api.get('/pipeline/progress/');
      const { active, progress, result } = res.data;
      setPipelineState({ running: active, progress, result });
      if (!active && result) {
        fetchHistory();
        fetchErrors();
      }
      return active;
    } catch {
      return false;
    }
  }, [fetchHistory, fetchErrors]);

  useEffect(() => {
    fetchHistory();
    fetchErrors();
    checkProgress();
  }, [fetchHistory, fetchErrors, checkProgress]);

  useEffect(() => {
    if (!pipelineState.running) return;
    const interval = setInterval(async () => {
      const stillActive = await checkProgress();
      if (!stillActive) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [pipelineState.running, checkProgress]);

  const triggerPipeline = async (full: boolean) => {
    try {
      const res = await api.post('/pipeline/trigger/', { full });
      if (res.data.status === 'started' || res.data.status === 'already_running') {
        setPipelineState({ running: true, progress: 'Starting...', result: null });
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setPipelineState((prev) => ({ ...prev, running: true }));
      }
    }
    setConfirmFull(false);
    setConfirmText('');
  };

  // Group history by most recent run per pipeline type
  const latestByType: Record<string, any> = {};
  for (const log of history) {
    if (!latestByType[log.pipeline_type]) {
      latestByType[log.pipeline_type] = log;
    }
  }
  const pipelineTypes = Object.keys(latestByType).sort();

  const isStale = (last_run_at: string) => {
    const ageMs = Date.now() - new Date(last_run_at).getTime();
    return ageMs > 15 * 60 * 1000; // 15-minute SLA from DASH-E00-A05
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            ETL state, history, and error log for the data pipelines feeding every dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => triggerPipeline(false)}
            disabled={pipelineState.running}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Trigger an incremental pipeline sync"
          >
            <PlayCircle className="w-4 h-4" />
            Sync now
          </button>
          <button
            onClick={() => setConfirmFull(true)}
            disabled={pipelineState.running}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Full refresh — destroys all reporting tables and rebuilds"
          >
            <RotateCcw className="w-4 h-4" />
            Full refresh
          </button>
        </div>
      </div>

      {/* Live status banner */}
      {pipelineState.running && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3"
        >
          <Loader2 className="w-5 h-5 mt-0.5 text-amber-600 animate-spin" />
          <div>
            <p className="font-medium text-amber-900">Pipeline running</p>
            <p className="text-sm text-amber-800 mt-1">{pipelineState.progress || 'Working…'}</p>
          </div>
        </div>
      )}

      {pipelineState.result?.status === 'success' && !pipelineState.running && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-start gap-3"
        >
          <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-900">
              Last sync complete — {pipelineState.result.total_records ?? 0} records in{' '}
              {formatDuration(pipelineState.result.duration_seconds)}
            </p>
          </div>
        </div>
      )}

      {pipelineState.result?.status === 'error' && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6 flex items-start gap-3"
        >
          <XCircle className="w-5 h-5 mt-0.5 text-rose-600" />
          <div>
            <p className="font-medium text-rose-900">Last sync failed</p>
            <p className="text-sm text-rose-800 mt-1 font-mono">{pipelineState.result.error}</p>
          </div>
        </div>
      )}

      {/* US01 — Per-pipeline status cards */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Pipeline status (last successful run per table)
      </h2>
      {loadingHistory ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 text-gray-500 text-sm">
          Loading…
        </div>
      ) : pipelineTypes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 text-gray-500 text-sm">
          No pipeline runs recorded yet. Click <strong>Sync now</strong> to seed the reporting tables.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {pipelineTypes.map((type) => {
            const log = latestByType[type];
            const stale = isStale(log.last_run_at);
            return (
              <div
                key={type}
                className={`bg-white rounded-lg border p-4 ${
                  stale ? 'border-amber-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{type}</span>
                  </div>
                  <StatusPill status={log.status || 'success'} />
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span title={log.last_run_at}>
                      {formatAgo(log.last_run_at)}
                      {stale && (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          stale
                        </span>
                      )}
                    </span>
                  </div>
                  <div>{log.records_processed ?? 0} records</div>
                  <div>{formatDuration(log.duration_seconds)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* US04 — Error log */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Unresolved pipeline errors
      </h2>
      {loadingErrors ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 text-gray-500 text-sm">
          Loading…
        </div>
      ) : errors.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 flex items-center gap-2 text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4" /> No unresolved errors.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-rose-200 mb-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-rose-50 text-rose-900 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Pipeline</th>
                <th className="px-4 py-2 text-left">Source ID</th>
                <th className="px-4 py-2 text-left">Error</th>
                <th className="px-4 py-2 text-left">Retries</th>
                <th className="px-4 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((e) => (
                <tr key={e.id} className="border-t border-rose-100">
                  <td className="px-4 py-2 font-mono text-xs">{e.pipeline_type}</td>
                  <td className="px-4 py-2">{e.source_id}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-md truncate" title={e.error_message}>
                    {e.error_message}
                  </td>
                  <td className="px-4 py-2">{e.retry_count}</td>
                  <td className="px-4 py-2 text-gray-500">{formatAgo(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Run history */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Recent run history
      </h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Pipeline</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Records</th>
              <th className="px-4 py-2 text-right">Duration</th>
              <th className="px-4 py-2 text-left">When</th>
              <th className="px-4 py-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 30).map((log, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{log.pipeline_type}</td>
                <td className="px-4 py-2"><StatusPill status={log.status || 'success'} /></td>
                <td className="px-4 py-2 text-right">{log.records_processed ?? 0}</td>
                <td className="px-4 py-2 text-right">{formatDuration(log.duration_seconds)}</td>
                <td className="px-4 py-2 text-gray-500" title={log.last_run_at}>
                  {formatAgo(log.last_run_at)}
                </td>
                <td className="px-4 py-2 text-gray-700 max-w-md truncate" title={log.error_message}>
                  {log.error_message || '—'}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Full re-sync confirmation modal */}
      {confirmFull && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="full-resync-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 id="full-resync-title" className="text-lg font-semibold text-gray-900">
                  Confirm full re-sync
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  This will <strong>delete all rows</strong> in the seven reporting tables and
                  rebuild them from the upstream inventory + accounting source. Dashboards may
                  show <strong>incomplete numbers</strong> for several minutes while the rebuild
                  runs.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-rose-700 font-mono">REPLACE</code>{' '}
                  below to confirm.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type REPLACE"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Type REPLACE to confirm full re-sync"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmFull(false);
                  setConfirmText('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => triggerPipeline(true)}
                disabled={confirmText !== 'REPLACE'}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run full refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
