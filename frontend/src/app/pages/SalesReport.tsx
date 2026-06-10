import { useState, useEffect } from 'react';
import { Download, FileText, X } from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';
import { formatIndianCurrency, formatIndianDate } from '../utils/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import api from '../services/api';
import { useDetailQuery } from '../hooks/useDetailQuery';
import { useDrillThrough } from '../hooks/useDrillThrough';
import { DrillSource } from '../contexts/DrillSourceContext';
import { CsvColumn } from '../utils/csv';

/** Row shape from GET /sales/bills/ (invoice-level, paginated). */
interface SalesBillRow {
  invoice_no: string;
  sale_date: string;
  channel: string;
  customer_name: string;
  location_name: string;
  payment_method: string;
  lines: number;
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
}

/** Line shape from GET /sales/detail/?invoice_no=... */
interface SalesBillLine {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_percent: number;
  line_total: number;
  batch_no: string;
}

const CSV_COLUMNS: CsvColumn[] = [
  { key: 'invoice_no', label: 'Bill No' },
  { key: 'sale_date', label: 'Date' },
  { key: 'channel', label: 'Channel' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'location_name', label: 'Location' },
  { key: 'payment_method', label: 'Payment' },
  { key: 'lines', label: 'Lines' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'discount', label: 'Discount' },
  { key: 'gst', label: 'GST' },
  { key: 'total', label: 'Total' },
];

export const SalesReport = () => {
  const { filters } = useFilters();
  const q = useDetailQuery('/sales/bills/', '-sale_date');
  const { openContextMenu, contextMenuElement } = useDrillThrough();

  const [selectedBill, setSelectedBill] = useState<SalesBillRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState<SalesBillLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const rows = q.rows as SalesBillRow[];

  // Fetch the bill's line items when the dialog opens.
  useEffect(() => {
    if (!dialogOpen || !selectedBill) return;
    let cancelled = false;
    setLinesLoading(true);
    setLineItems([]);
    api.get('/sales/detail/', {
      params: {
        invoice_no: selectedBill.invoice_no,
        page_size: 200,
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
      },
    })
      .then(res => {
        if (cancelled) return;
        const data = res.data;
        setLineItems(Array.isArray(data) ? data : (data?.results || []));
      })
      .catch(() => { if (!cancelled) setLineItems([]); })
      .finally(() => { if (!cancelled) setLinesLoading(false); });
    return () => { cancelled = true; };
  }, [dialogOpen, selectedBill, filters.dateRange.start, filters.dateRange.end]);

  const handleDoubleClick = (bill: SalesBillRow) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const rowDrillFilters = (row: SalesBillRow) => ([
    { id: 'invoice_no', label: `Invoice: ${row.invoice_no}`, value: row.invoice_no },
  ]);

  // Footer totals are for the rows on the CURRENT page (server pagination).
  const pageNet = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const pageSubtotal = rows.reduce((s, r) => s + (Number(r.subtotal) || 0), 0);
  const pageDiscount = rows.reduce((s, r) => s + (Number(r.discount) || 0), 0);
  const pageGST = rows.reduce((s, r) => s + (Number(r.gst) || 0), 0);

  const sortArrow = (key: string) =>
    q.ordering === key ? ' ↑' : q.ordering === `-${key}` ? ' ↓' : '';

  const sortableTh = (key: string, label: string, align: 'left' | 'right' = 'left') => (
    <th
      onClick={() => q.setOrdering(key)}
      className={`text-${align} py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100`}
    >
      {label}{sortArrow(key)}
    </th>
  );

  return (
    <DrillSource name="Sales Bills">
      <div>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FileText className="w-6 h-6 text-teal-600" />
              <h1 className="text-2xl font-bold text-gray-900">Sales Bills</h1>
            </div>
            <p className="text-sm text-gray-600">
              {q.count} bills{rows.length ? ` | Page total: ${formatIndianCurrency(pageNet)}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => q.exportCsv(`sales-bills-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export CSV{q.exportCapped ? ' (first 500)' : ''}
            </button>
          </div>
        </div>

        {/* Drill-through context chips (when navigated here with df_* params) */}
        {q.drill && q.drill.filters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {q.drill.filters.map(f => (
              <span
                key={f.id}
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-3 py-1 rounded-md text-sm"
              >
                {f.label}
                <button onClick={() => q.removeDrillFilter(f.id)} aria-label={`Remove ${f.label}`} className="hover:bg-teal-700 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Hint */}
        <div className="mb-4 text-xs text-gray-500">
          Double-click any row to view bill details — right-click to drill through to line items
        </div>

        {q.error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            Failed to load bills: {q.error}
          </div>
        )}

        {/* Bills Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {sortableTh('invoice_no', 'Bill No')}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  {sortableTh('sale_date', 'Date')}
                  {sortableTh('customer_name', 'Customer')}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Lines</th>
                  {sortableTh('subtotal', 'Subtotal', 'right')}
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Discount</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">GST</th>
                  {sortableTh('total', 'Net Amount', 'right')}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                </tr>
              </thead>
              <tbody>
                {q.loading && rows.length === 0 && (
                  <tr><td colSpan={11} className="py-8 px-4 text-center text-gray-500">Loading bills…</td></tr>
                )}
                {!q.loading && rows.length === 0 && !q.error && (
                  <tr><td colSpan={11} className="py-8 px-4 text-center text-gray-500">No bills match the current filters</td></tr>
                )}
                {rows.map((row) => (
                  <tr
                    key={row.invoice_no}
                    onDoubleClick={() => handleDoubleClick(row)}
                    onContextMenu={(e) => openContextMenu(e, '/detail/sales', rowDrillFilters(row), row)}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-900">{row.invoice_no}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        row.channel === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {row.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{formatIndianDate(row.sale_date)}</td>
                    <td className="py-3 px-4 text-gray-900 max-w-[180px] truncate">{row.customer_name || 'Walk-in'}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{row.location_name}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{row.lines}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatIndianCurrency(Number(row.subtotal) || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(Number(row.discount) || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(Number(row.gst) || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-900 font-semibold">{formatIndianCurrency(Number(row.total) || 0)}</td>
                    <td className="py-3 px-4 text-gray-900">{row.payment_method}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="py-3 px-4 font-bold text-gray-900">
                    PAGE TOTAL ({rows.length} of {q.count} bills)
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatIndianCurrency(pageSubtotal)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-600">{formatIndianCurrency(pageDiscount)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-600">{formatIndianCurrency(pageGST)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatIndianCurrency(pageNet)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Page {q.page} of {q.pageCount} — {q.count} bills
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => q.setPage(q.page - 1)}
              disabled={q.page <= 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => q.setPage(q.page + 1)}
              disabled={q.page >= q.pageCount}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
            {selectedBill && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      selectedBill.channel === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {selectedBill.channel}
                    </span>
                    {selectedBill.invoice_no}
                  </DialogTitle>
                  <DialogDescription>
                    Bill details (read-only)
                  </DialogDescription>
                </DialogHeader>

                {/* Bill Header Info */}
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500">Date</div>
                    <div className="text-sm font-medium">{formatIndianDate(selectedBill.sale_date)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="text-sm font-medium">{selectedBill.customer_name || 'Walk-in'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="text-sm font-medium">{selectedBill.location_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Payment</div>
                    <div className="text-sm font-medium">{selectedBill.payment_method}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Channel</div>
                    <div className="text-sm font-medium">{selectedBill.channel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Items</div>
                    <div className="text-sm font-medium">{selectedBill.lines}</div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mt-4 overflow-x-auto">
                  {linesLoading ? (
                    <div className="py-6 text-center text-sm text-gray-500">Loading line items…</div>
                  ) : (
                    <table className="w-full min-w-max text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">#</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Product</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Batch</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Qty</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Price</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Discount</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">GST Rate</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                            <td className="py-2 px-3 text-gray-900 max-w-[200px] truncate">{item.product_name}</td>
                            <td className="py-2 px-3 text-gray-600 font-mono text-xs">{item.batch_no}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatIndianCurrency(Number(item.unit_price) || 0)}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{formatIndianCurrency(Number(item.discount_amount) || 0)}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{Number(item.tax_percent) || 0}%</td>
                            <td className="py-2 px-3 text-right text-gray-900 font-semibold">{formatIndianCurrency(Number(item.line_total) || 0)}</td>
                          </tr>
                        ))}
                        {lineItems.length === 0 && (
                          <tr><td colSpan={8} className="py-4 px-3 text-center text-gray-500">No line items found</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Bill Summary */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{formatIndianCurrency(Number(selectedBill.subtotal) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-red-600">-{formatIndianCurrency(Number(selectedBill.discount) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST</span>
                      <span className="font-medium">{formatIndianCurrency(Number(selectedBill.gst) || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                      <span>Net Amount</span>
                      <span>{formatIndianCurrency(Number(selectedBill.total) || 0)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {contextMenuElement}
      </div>
    </DrillSource>
  );
};
