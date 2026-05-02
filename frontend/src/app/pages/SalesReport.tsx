import { useState, useEffect, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import api from '../services/api';
import { formatIndianCurrency, formatIndianDate } from '../utils/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface SalesBillRow {
  id: string;
  type: 'POS' | 'B2B';
  invoice_no: string;
  date: string;
  customer_id: number | null;
  customer_name: string;
  location_id: number;
  location_name: string;
  subtotal: number;
  discount: number;
  gst: number;
  round_off: number;
  net_amount: number;
  payment: string;
  status: string;
}

interface BillLine {
  sno: number;
  product_name: string;
  batch: string;
  expiry: string;
  qty: number;
  price: number;
  mrp: number;
  discount_pct: number;
  gst_rate: number;
  gst_amt: number;
  line_total: number;
}

interface PaginatedBills {
  count: number;
  next: string | null;
  previous: string | null;
  results: SalesBillRow[];
}

type SortField = 'date' | 'net_amount' | 'customer_name' | 'invoice_no';

const PAGE_SIZE = 50;
const FALLBACK: PaginatedBills = { count: 0, next: null, previous: null, results: [] };

export const SalesReport = () => {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedBill, setSelectedBill] = useState<SalesBillRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState<BillLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const { data, loading, error } = useApiData<PaginatedBills>(
    '/sales/bills/',
    FALLBACK,
    { params: { page } }
  );

  // Reset to page 1 when filters change (data.count drops)
  useEffect(() => { setPage(1); }, []);

  const bills = data.results;

  const sortedBills = useMemo(() => {
    const rows = [...bills];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortField === 'net_amount') cmp = a.net_amount - b.net_amount;
      else if (sortField === 'customer_name') cmp = a.customer_name.localeCompare(b.customer_name);
      else if (sortField === 'invoice_no') cmp = a.invoice_no.localeCompare(b.invoice_no);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [bills, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const openBill = async (bill: SalesBillRow) => {
    setSelectedBill(bill);
    setDialogOpen(true);
    setLineItems([]);
    setLinesLoading(true);
    const numericId = bill.id.replace(/^(POS|B2B)-/, '');
    try {
      const res = await api.get('/sales/bill-lines/', {
        params: { type: bill.type, id: numericId },
      });
      setLineItems(res.data.results || []);
    } catch {
      setLineItems([]);
    } finally {
      setLinesLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Bill No', 'Type', 'Date', 'Customer', 'Location', 'Subtotal', 'Discount', 'GST', 'Net Amount', 'Payment', 'Status'];
    const csvRows = sortedBills.map(r => [
      r.invoice_no, r.type, r.date, `"${r.customer_name}"`, `"${r.location_name}"`,
      r.subtotal.toFixed(2), r.discount.toFixed(2), r.gst.toFixed(2), r.net_amount.toFixed(2),
      r.payment, r.status,
    ]);
    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalNet = sortedBills.reduce((s, r) => s + r.net_amount, 0);
  const totalSub = sortedBills.reduce((s, r) => s + r.subtotal, 0);
  const totalDiscount = sortedBills.reduce((s, r) => s + r.discount, 0);
  const totalGST = sortedBills.reduce((s, r) => s + r.gst, 0);

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const statusClass = (status: string) => {
    switch (status) {
      case 'Completed': case 'Delivered': return 'text-green-700 border-green-300';
      case 'Confirmed': case 'Dispatched': return 'text-blue-700 border-blue-300';
      case 'Pending': case 'Partial': return 'text-orange-700 border-orange-300';
      case 'Draft': return 'text-gray-700 border-gray-300';
      case 'Cancelled': return 'text-red-700 border-red-300';
      default: return 'text-gray-700 border-gray-300';
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="w-6 h-6 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Sales Bills</h1>
          </div>
          <p className="text-sm text-gray-600">
            {data.count} bills total | This page: {formatIndianCurrency(totalNet)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={loading || !sortedBills.length}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Failed to load: {error}
        </div>
      )}

      {/* Hint */}
      <div className="mb-4 text-xs text-gray-500">
        Double-click any row to view bill details
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th onClick={() => handleSort('invoice_no')} className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100">Bill No{sortArrow('invoice_no')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th onClick={() => handleSort('date')} className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100">Date{sortArrow('date')}</th>
                <th onClick={() => handleSort('customer_name')} className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100">Customer{sortArrow('customer_name')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Subtotal</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Discount</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">GST</th>
                <th onClick={() => handleSort('net_amount')} className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100">Net Amount{sortArrow('net_amount')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="py-8 text-center text-gray-500">Loading…</td></tr>
              )}
              {!loading && sortedBills.length === 0 && (
                <tr><td colSpan={11} className="py-8 text-center text-gray-500">No bills found for the selected filters.</td></tr>
              )}
              {sortedBills.map((row) => (
                <tr
                  key={row.id}
                  onDoubleClick={() => openBill(row)}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-xs text-gray-900">{row.invoice_no}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      row.type === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900">{row.date ? formatIndianDate(row.date) : '-'}</td>
                  <td className="py-3 px-4 text-gray-900 max-w-[180px] truncate">{row.customer_name}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{row.location_name}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{formatIndianCurrency(row.subtotal)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(row.discount)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(row.gst)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">{formatIndianCurrency(row.net_amount)}</td>
                  <td className="py-3 px-4 text-gray-900">{row.payment}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {sortedBills.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={5} className="py-3 px-4 font-bold text-gray-900">PAGE TOTAL ({sortedBills.length} bills)</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatIndianCurrency(totalSub)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-600">{formatIndianCurrency(totalDiscount)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-600">{formatIndianCurrency(totalGST)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatIndianCurrency(totalNet)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.previous} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={!data.next} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedBill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                    selectedBill.type === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {selectedBill.type}
                  </span>
                  {selectedBill.invoice_no}
                </DialogTitle>
                <DialogDescription>Bill details (read-only)</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div><div className="text-xs text-gray-500">Date</div><div className="text-sm font-medium">{selectedBill.date ? formatIndianDate(selectedBill.date) : '-'}</div></div>
                <div><div className="text-xs text-gray-500">Customer</div><div className="text-sm font-medium">{selectedBill.customer_name}</div></div>
                <div><div className="text-xs text-gray-500">Location</div><div className="text-sm font-medium">{selectedBill.location_name}</div></div>
                <div><div className="text-xs text-gray-500">Payment</div><div className="text-sm font-medium">{selectedBill.payment}</div></div>
                <div><div className="text-xs text-gray-500">Status</div><div className="text-sm"><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${statusClass(selectedBill.status)}`}>{selectedBill.status}</span></div></div>
                <div><div className="text-xs text-gray-500">Items</div><div className="text-sm font-medium">{lineItems.length}</div></div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Product</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Batch</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Qty</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Price</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Disc%</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">GST Rate</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">GST Amt</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linesLoading && (
                      <tr><td colSpan={9} className="py-4 text-center text-gray-500">Loading line items…</td></tr>
                    )}
                    {!linesLoading && lineItems.length === 0 && (
                      <tr><td colSpan={9} className="py-4 text-center text-gray-500">No line items.</td></tr>
                    )}
                    {lineItems.map((item) => (
                      <tr key={item.sno} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-500">{item.sno}</td>
                        <td className="py-2 px-3 text-gray-900 max-w-[200px] truncate">{item.product_name}</td>
                        <td className="py-2 px-3 text-gray-600 font-mono text-xs">{item.batch}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{item.qty}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{formatIndianCurrency(item.price)}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{item.discount_pct}%</td>
                        <td className="py-2 px-3 text-right text-gray-600">{item.gst_rate}%</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatIndianCurrency(item.gst_amt)}</td>
                        <td className="py-2 px-3 text-right text-gray-900 font-semibold">{formatIndianCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatIndianCurrency(selectedBill.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-red-600">-{formatIndianCurrency(selectedBill.discount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">GST</span><span className="font-medium">{formatIndianCurrency(selectedBill.gst)}</span></div>
                  {selectedBill.round_off !== 0 && (
                    <div className="flex justify-between"><span className="text-gray-600">Round Off</span><span>{formatIndianCurrency(selectedBill.round_off)}</span></div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300 font-bold"><span>Net Amount</span><span>{formatIndianCurrency(selectedBill.net_amount)}</span></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
