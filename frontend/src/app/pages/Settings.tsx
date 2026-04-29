import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Download, FileText, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { NavLink } from 'react-router';
import api from '../services/api';

export const Settings = () => {
  const [pipelineState, setPipelineState] = useState<{
    running: boolean;
    progress: string;
    result: any;
  }>({ running: false, progress: '', result: null });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/pipeline/history/');
      setHistory(res.data);
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }, []);

  const checkProgress = useCallback(async () => {
    try {
      const res = await api.get('/pipeline/progress/');
      const { active, progress, result } = res.data;
      setPipelineState({ running: active, progress, result });
      if (!active && result) {
        fetchHistory();
      }
      return active;
    } catch {
      return false;
    }
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();
    checkProgress();
  }, [fetchHistory, checkProgress]);

  // Poll while pipeline is running
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
      if (res.data.status === 'started') {
        setPipelineState({ running: true, progress: 'Starting...', result: null });
      } else if (res.data.status === 'already_running') {
        setPipelineState(prev => ({ ...prev, running: true }));
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setPipelineState(prev => ({ ...prev, running: true }));
      }
    }
  };

  // Group history by most recent run per pipeline type
  const latestByType: Record<string, any> = {};
  for (const log of history) {
    if (!latestByType[log.pipeline_type]) {
      latestByType[log.pipeline_type] = log;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Data Pipeline Section - Full Width */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-900">Data Pipeline</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Sync data from source systems into the reporting tables. Incremental sync only processes new records. Full refresh rebuilds all data from scratch.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => triggerPipeline(false)}
            disabled={pipelineState.running}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pipelineState.running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {pipelineState.running ? 'Pipeline Running...' : 'Run Incremental Sync'}
          </button>
          <button
            onClick={() => triggerPipeline(true)}
            disabled={pipelineState.running}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Full Refresh
          </button>
        </div>

        {/* Progress indicator */}
        {pipelineState.running && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-teal-900">Pipeline in progress</div>
                <div className="text-xs text-teal-700 mt-0.5">{pipelineState.progress}</div>
              </div>
            </div>
          </div>
        )}

        {/* Result banner */}
        {!pipelineState.running && pipelineState.result && (
          <div className={`rounded-lg p-4 mb-6 border ${pipelineState.result.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              {pipelineState.result.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                {pipelineState.result.status === 'success' ? (
                  <>
                    <div className="text-sm font-medium text-green-900">
                      Pipeline completed successfully
                    </div>
                    <div className="text-xs text-green-700 mt-0.5">
                      {pipelineState.result.total_records} records synced in {Number(pipelineState.result.duration_seconds).toFixed(2)}s
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-red-900">Pipeline failed</div>
                    <div className="text-xs text-red-700 mt-0.5">{pipelineState.result.error}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pipeline History Table */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Pipeline Runs</h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-700">Pipeline</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-700">Last Run</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-700">Records</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">Loading...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No pipeline runs yet</td></tr>
                  ) : (
                    history.slice(0, 15).map((log, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-4 text-gray-900 font-medium">{log.pipeline_type}</td>
                        <td className="py-2.5 px-4 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {log.last_run_at ? new Date(log.last_run_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '--'}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-900">{log.records_processed.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right text-gray-600">{Number(log.duration_seconds).toFixed(2)}s</td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* User Preferences */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">User Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Dashboard
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                <option>Executive Summary</option>
                <option>Sales Command Center</option>
                <option>Financial Deep Dive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number Format
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
                <option>Indian (Lakhs/Crores)</option>
                <option>International (K/M/B)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email Alerts</span>
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Low Stock Alerts</span>
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">GST Filing Reminders</span>
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Daily Report</span>
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
            </label>
          </div>
        </div>

        {/* Data & Security */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Data & Security</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Change Password
            </button>
            <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Manage Permissions
            </button>
            <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Audit Log
            </button>
          </div>
        </div>

        {/* Export & Backup */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Export & Backup</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
              Export All Data
            </button>
            <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Schedule Backup
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Last backup: Mar 27, 2026 at 11:30 PM
            </p>
          </div>
        </div>
      </div>

      {/* Reports */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <NavLink
            to="/reports/sales"
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Sales Bills</h3>
            <p className="text-sm text-gray-600">View all POS and B2B sales invoices with line-item details</p>
          </NavLink>
          <NavLink
            to="/reports/purchases"
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:border-teal-300 hover:shadow-md transition-all"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Purchase Bills</h3>
            <p className="text-sm text-gray-600">View all purchase orders and bills with line-item details</p>
          </NavLink>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end gap-3">
        <button className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Save Changes
        </button>
      </div>
    </div>
  );
};
