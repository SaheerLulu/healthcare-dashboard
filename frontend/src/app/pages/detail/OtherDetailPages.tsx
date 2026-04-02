import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, X, Download, Filter as FilterIcon } from 'lucide-react';
import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';

export const InventoryDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: apiInvDetail } = useApiData<any>('/inventory/detail/', { results: [] });
  const drillThroughContext = (location.state as any)?.drillThrough || null;

  return (
    <div>
      {drillThroughContext && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {drillThroughContext.from}
          </button>
          <div className="text-xs text-teal-700">
            <span className="font-medium">Filters:</span> {drillThroughContext.filters?.map((f: any) => f.label).join(', ')}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {(apiInvDetail.results || []).length} items | Total Value: ₹{((apiInvDetail.results || []).reduce((sum: number, item: any) => sum + (item.value || 0), 0) / 1000).toFixed(2)}K
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Batch No</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Expiry</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">MRP</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
              </tr>
            </thead>
            <tbody>
              {(apiInvDetail.results || []).map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.product}</td>
                  <td className="py-3 px-4 text-gray-600">{row.category}</td>
                  <td className="py-3 px-4 text-gray-900">{row.batch}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{row.qty.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-gray-600">{row.expiry}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{row.mrp.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{(row.value / 1000).toFixed(2)}K</td>
                  <td className="py-3 px-4 text-gray-600">{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const PurchaseDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: apiPurDetail } = useApiData<any>('/procurement/detail/', { results: [] });
  const drillThroughContext = (location.state as any)?.drillThrough || null;

  return (
    <div>
      {drillThroughContext && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {drillThroughContext.from}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {(apiPurDetail.results || []).length} purchase orders | Total: ₹{((apiPurDetail.results || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0) / 1000).toFixed(2)}K
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4 inline mr-2" />
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">PO No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Discount</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Tax</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {(apiPurDetail.results || []).map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.poNo}</td>
                  <td className="py-3 px-4 text-gray-900">{row.date}</td>
                  <td className="py-3 px-4 text-gray-900">{row.supplier}</td>
                  <td className="py-3 px-4 text-gray-900">{row.product}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{row.qty}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{row.rate.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.discount}%</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.tax}%</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{row.total.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      row.status === 'Received' ? 'bg-green-100 text-green-700' :
                      row.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const FinancialDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: apiFinDetail } = useApiData<any>('/financial/detail/', { results: [] });
  const drillThroughContext = (location.state as any)?.drillThrough || null;

  return (
    <div>
      {drillThroughContext && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {drillThroughContext.from}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Journal entries and account transactions
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4 inline mr-2" />
          Export Ledger
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Voucher No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Account</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Debit</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Credit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Narration</th>
              </tr>
            </thead>
            <tbody>
              {(apiFinDetail.results || []).map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900">{row.date}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.voucherNo}</td>
                  <td className="py-3 px-4 text-gray-900">{row.account}</td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {row.debit > 0 ? `₹${(row.debit / 1000).toFixed(2)}K` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {row.credit > 0 ? `₹${(row.credit / 1000).toFixed(2)}K` : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{row.narration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const GSTDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: apiGstDetail } = useApiData<any>('/gst/detail/', { results: [] });
  const drillThroughContext = (location.state as any)?.drillThrough || null;

  return (
    <div>
      {drillThroughContext && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {drillThroughContext.from}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Invoice-wise GST breakdown and GSTR-1 entries
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4 inline mr-2" />
          Export GSTR-1
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">GSTIN</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Taxable</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">CGST</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">SGST</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">IGST</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
              </tr>
            </thead>
            <tbody>
              {(apiGstDetail.results || []).map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900">{row.date}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.invoice}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{row.gstin || '—'}</td>
                  <td className="py-3 px-4 text-gray-900">{row.customer}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{(row.taxable / 1000).toFixed(2)}K</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.cgst > 0 ? `₹${(row.cgst / 1000).toFixed(2)}K` : '—'}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.sgst > 0 ? `₹${(row.sgst / 1000).toFixed(2)}K` : '—'}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.igst > 0 ? `₹${(row.igst / 1000).toFixed(2)}K` : '—'}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{(row.total / 1000).toFixed(2)}K</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      row.type === 'B2B' ? 'bg-teal-100 text-teal-700' :
                      row.type === 'B2C' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
