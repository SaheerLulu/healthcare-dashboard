import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, X, Download, Filter as FilterIcon } from 'lucide-react';
import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { formatIndianCurrencyAbbreviated } from '../../utils/formatters';

export const InventoryDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const drillThroughContext = (location.state as any)?.drillThrough || null;

  // Convert drill-through filters to API query params
  const drillParams: Record<string, string> = {};
  if (drillThroughContext?.filters) {
    for (const f of drillThroughContext.filters) {
      if (f.id && f.value) drillParams[f.id] = f.value;
    }
  }

  const { data: apiInvDetail } = useApiData<any>('/inventory/detail/', { results: [] }, { params: drillParams });
  const rows = apiInvDetail.results || [];

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

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {rows.length} items | Total Value: {formatIndianCurrencyAbbreviated(rows.reduce((sum: number, item: any) => sum + (Number(item.stock_value_cost) || 0), 0))}
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap flex-shrink-0">
          <Download className="w-4 h-4 inline mr-2" />
          Export CSV
        </button>
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">MRP</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.product_name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.product_category}</td>
                  <td className="py-3 px-4 text-gray-900">{row.batch_no}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{(row.qty_on_hand || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-gray-600">{row.expiry_month}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      row.expiry_status === 'expired' ? 'bg-red-100 text-red-700' :
                      row.expiry_status === 'critical_30' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{row.expiry_status || 'OK'}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{(Number(row.mrp) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">{formatIndianCurrencyAbbreviated(Number(row.stock_value_cost) || 0)}</td>
                  <td className="py-3 px-4 text-gray-600">{row.location_name}</td>
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
  const rows = apiPurDetail.results || [];

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

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {rows.length} purchases | Total: {formatIndianCurrencyAbbreviated(rows.reduce((sum: number, item: any) => sum + (Number(item.line_total) || 0), 0))}
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap flex-shrink-0">
          <Download className="w-4 h-4 inline mr-2" />
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Bill No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">MRP</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Tax %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.bill_no}</td>
                  <td className="py-3 px-4 text-gray-900">{row.bill_date}</td>
                  <td className="py-3 px-4 text-gray-900">{row.supplier_name}</td>
                  <td className="py-3 px-4 text-gray-900">{row.product_name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.product_category}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{row.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{(Number(row.purchase_rate) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{(Number(row.mrp) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.tax_percent}%</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{(Number(row.line_total) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-600">{row.location_name}</td>
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
  const rows = apiFinDetail.results || [];

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

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Financial Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {rows.length} journal entries
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap flex-shrink-0">
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Entry No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Voucher</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Account</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Debit</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Credit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Party</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Narration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900">{row.entry_date}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.entry_no}</td>
                  <td className="py-3 px-4"><span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">{row.voucher_type}</span></td>
                  <td className="py-3 px-4 text-gray-900">{row.account_name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.account_type}</td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {Number(row.debit) > 0 ? `₹${Number(row.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {Number(row.credit) > 0 ? `₹${Number(row.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-900">{row.party_name || '—'}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{row.narration}</td>
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
  const rows = apiGstDetail.results || [];

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

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">GST Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {rows.length} GST entries
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap flex-shrink-0">
          <Download className="w-4 h-4 inline mr-2" />
          Export GSTR-1
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Period</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">GSTIN</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Taxable</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Rate</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">CGST</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">SGST</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">IGST</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900">{row.period}</td>
                  <td className="py-3 px-4"><span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">{row.source_table}</span></td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.invoice_no || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{row.invoice_type || '—'}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{row.customer_gstin || row.supplier_gstin || '—'}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{(Number(row.taxable_value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{row.gst_rate}%</td>
                  <td className="py-3 px-4 text-right text-gray-600">₹{(Number(row.cgst) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">₹{(Number(row.sgst) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">₹{(Number(row.igst) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-600">{row.location_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
