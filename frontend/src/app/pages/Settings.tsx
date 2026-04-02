import { Settings as SettingsIcon, User, Bell, Shield, Database, Download } from 'lucide-react';

export const Settings = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

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
