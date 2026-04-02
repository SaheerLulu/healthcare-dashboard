import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, X, Download, Filter as FilterIcon } from 'lucide-react';
import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';


export const SalesDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: apiSalesDetail } = useApiData<any>('/sales/detail/', { results: [] });
  const salesRows = (apiSalesDetail.results || []).map((r: any) => ({
    date: r.sale_date || '', invoice: r.invoice_no || '', channel: r.channel || '',
    customer: r.customer_name || '', product: r.product_name || '', category: r.product_category || '',
    qty: r.quantity || 0, price: Number(r.unit_price) || 0, discount: Number(r.discount_amount) || 0,
    tax: Number(r.tax_percent) || 0, total: Number(r.line_total) || 0, payment: r.payment_method || '',
  }));

  // Get drill-through context from navigation state or URL params
  const drillThroughContext = (location.state as any)?.drillThrough || null;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div>
      {/* Drill-Through Breadcrumb Bar */}
      {drillThroughContext && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {drillThroughContext.from}
          </button>

          <div className="mb-3">
            <div className="text-xs font-semibold text-teal-900 uppercase tracking-wide mb-2">
              Drill-Through Context:
            </div>
            <div className="flex flex-wrap gap-2">
              {drillThroughContext.filters?.map((filter: any, index: number) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 bg-teal-600 text-white px-3 py-1 rounded-md text-sm"
                >
                  <span>{filter.label}</span>
                  <button className="hover:bg-teal-700 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-teal-700 mb-3">
            <span className="font-medium">Global Filters:</span> FY 2025-26 | Mar 2026 | All Locations
          </div>

          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50">
              Remove Drill-Through Filter
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50">
              <FilterIcon className="w-3 h-3 inline mr-1" />
              Modify Filters
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50">
              <Download className="w-3 h-3 inline mr-1" />
              Export Table
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {salesRows.length} transactions | Total: ₹{salesRows.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 inline mr-2" />
            Export CSV
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 inline mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('invoice')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Invoice No {sortField === 'invoice' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Channel</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Discount</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Tax</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
              </tr>
            </thead>
            <tbody>
              {salesRows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-900">{row.date}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.invoice}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        row.channel === 'POS'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {row.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900">{row.customer}</td>
                  <td className="py-3 px-4 text-gray-900">{row.product}</td>
                  <td className="py-3 px-4 text-gray-600">{row.category}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{row.qty}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{row.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.discount}%</td>
                  <td className="py-3 px-4 text-right text-gray-600">{row.tax}%</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                    ₹{row.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-gray-900">{row.payment}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={6} className="py-3 px-4 font-bold text-gray-900">
                  TOTAL
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  {salesRows.reduce((sum, row) => sum + row.qty, 0)}
                </td>
                <td colSpan={3}></td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  ₹{salesRows.reduce((sum, row) => sum + row.total, 0).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing 1 to {salesRows.length} of {salesRows.length} entries
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Previous
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 border border-teal-600 rounded">
            1
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
