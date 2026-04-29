import { useState, useMemo } from 'react';
import { Download, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFilters } from '../contexts/FilterContext';
import { formatIndianCurrency, formatIndianDate } from '../utils/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  posOrders,
  posOrderLines,
  b2bOrders,
  b2bOrderLines,
  customers,
  locations,
  products,
} from '../../../../src/app/data';
import type { POSOrder, B2BSalesOrder, POSOrderLine, B2BSalesOrderLine } from '../../../../src/app/data';

interface SalesBillRow {
  id: string;
  type: 'POS' | 'B2B';
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  locationId: string;
  locationName: string;
  subtotal: number;
  discount: number;
  gst: number;
  roundOff: number;
  netAmount: number;
  payment: string;
  status: string;
}

type SortField = 'date' | 'netAmount' | 'customerName' | 'invoiceNo';

export const SalesReport = () => {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedBill, setSelectedBill] = useState<SalesBillRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), []);
  const locationMap = useMemo(() => new Map(locations.map(l => [l.id, l])), []);
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), []);

  const filteredBills = useMemo(() => {
    const { dateRange, locations: filterLocs, salesChannel, paymentMethod } = filters;

    const matchesFilters = (orderDate: string, locationId: string) => {
      if (dateRange.start && orderDate < dateRange.start) return false;
      if (dateRange.end && orderDate > dateRange.end) return false;
      if (filterLocs.length > 0 && !filterLocs.includes(locationId)) return false;
      return true;
    };

    const rows: SalesBillRow[] = [];

    // POS orders
    const includePOS = salesChannel.length === 0 || salesChannel.some(c => c.toLowerCase().includes('pos'));
    if (includePOS) {
      for (const o of posOrders) {
        if (!matchesFilters(o.orderDate, o.locationId)) continue;
        if (paymentMethod.length > 0 && !paymentMethod.includes(o.paymentMode)) continue;
        const cust = customerMap.get(o.customerId);
        const loc = locationMap.get(o.locationId);
        rows.push({
          id: o.id,
          type: 'POS',
          invoiceNo: o.id,
          date: o.orderDate,
          customerId: o.customerId,
          customerName: cust?.name || 'Walk-in',
          locationId: o.locationId,
          locationName: loc?.name || o.locationId,
          subtotal: o.subtotal,
          discount: o.discountAmount,
          gst: o.gstAmount,
          roundOff: o.roundOff,
          netAmount: o.netAmount,
          payment: o.paymentMode,
          status: o.status === 'completed' ? 'Completed' : 'Cancelled',
        });
      }
    }

    // B2B orders
    const includeB2B = salesChannel.length === 0 || salesChannel.some(c => c.toLowerCase().includes('b2b'));
    if (includeB2B) {
      for (const o of b2bOrders) {
        if (!matchesFilters(o.orderDate, o.locationId)) continue;
        const cust = customerMap.get(o.customerId);
        const loc = locationMap.get(o.locationId);
        rows.push({
          id: o.id,
          type: 'B2B',
          invoiceNo: o.invoiceNumber || o.id,
          date: o.orderDate,
          customerId: o.customerId,
          customerName: cust?.name || o.customerId,
          locationId: o.locationId,
          locationName: loc?.name || o.locationId,
          subtotal: o.subtotal,
          discount: o.discountAmount,
          gst: o.gstAmount,
          roundOff: 0,
          netAmount: o.netAmount,
          payment: o.paymentStatus,
          status: o.status,
        });
      }
    }

    // Sort
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'netAmount') cmp = a.netAmount - b.netAmount;
      else if (sortField === 'customerName') cmp = a.customerName.localeCompare(b.customerName);
      else if (sortField === 'invoiceNo') cmp = a.invoiceNo.localeCompare(b.invoiceNo);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [filters, sortField, sortDir, customerMap, locationMap]);

  const lineItems = useMemo(() => {
    if (!selectedBill) return [];
    if (selectedBill.type === 'POS') {
      return posOrderLines
        .filter(l => l.posOrderId === selectedBill.id)
        .map((l, i) => ({
          sno: i + 1,
          productName: productMap.get(l.productId)?.name || l.productId,
          batch: l.batchNumber,
          qty: l.quantity,
          price: l.sellingPrice,
          mrp: l.mrp,
          discountPct: l.discount,
          gstRate: l.gstRate,
          gstAmt: l.gstAmount,
          lineTotal: l.lineTotal,
        }));
    } else {
      return b2bOrderLines
        .filter(l => l.b2bSalesOrderId === selectedBill.id)
        .map((l, i) => ({
          sno: i + 1,
          productName: productMap.get(l.productId)?.name || l.productId,
          batch: l.batchNumber,
          qty: l.quantity,
          price: l.unitPrice,
          mrp: 0,
          discountPct: l.discount,
          gstRate: l.gstRate,
          gstAmt: l.gstAmount,
          lineTotal: l.lineTotal,
        }));
    }
  }, [selectedBill, productMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleDoubleClick = (bill: SalesBillRow) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const exportCSV = () => {
    const headers = ['Bill No', 'Type', 'Date', 'Customer', 'Location', 'Subtotal', 'Discount', 'GST', 'Net Amount', 'Payment', 'Status'];
    const csvRows = filteredBills.map(r => [
      r.invoiceNo, r.type, r.date, `"${r.customerName}"`, `"${r.locationName}"`,
      r.subtotal.toFixed(2), r.discount.toFixed(2), r.gst.toFixed(2), r.netAmount.toFixed(2),
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

  const totalNet = filteredBills.reduce((s, r) => s + r.netAmount, 0);
  const totalDiscount = filteredBills.reduce((s, r) => s + r.discount, 0);
  const totalGST = filteredBills.reduce((s, r) => s + r.gst, 0);

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
            {filteredBills.length} bills | Total: {formatIndianCurrency(totalNet)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>

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
                <th
                  onClick={() => handleSort('invoiceNo')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Bill No{sortArrow('invoiceNo')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th
                  onClick={() => handleSort('date')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Date{sortArrow('date')}
                </th>
                <th
                  onClick={() => handleSort('customerName')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Customer{sortArrow('customerName')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Subtotal</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Discount</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">GST</th>
                <th
                  onClick={() => handleSort('netAmount')}
                  className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Net Amount{sortArrow('netAmount')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((row) => (
                <tr
                  key={row.id}
                  onDoubleClick={() => handleDoubleClick(row)}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-xs text-gray-900">{row.invoiceNo}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      row.type === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900">{formatIndianDate(row.date)}</td>
                  <td className="py-3 px-4 text-gray-900 max-w-[180px] truncate">{row.customerName}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{row.locationName}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{formatIndianCurrency(row.subtotal)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(row.discount)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(row.gst)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">{formatIndianCurrency(row.netAmount)}</td>
                  <td className="py-3 px-4 text-gray-900">{row.payment}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={5} className="py-3 px-4 font-bold text-gray-900">TOTAL ({filteredBills.length} bills)</td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  {formatIndianCurrency(filteredBills.reduce((s, r) => s + r.subtotal, 0))}
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-600">{formatIndianCurrency(totalDiscount)}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-600">{formatIndianCurrency(totalGST)}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">{formatIndianCurrency(totalNet)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
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
                    selectedBill.type === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {selectedBill.type}
                  </span>
                  {selectedBill.invoiceNo}
                </DialogTitle>
                <DialogDescription>
                  Bill details (read-only)
                </DialogDescription>
              </DialogHeader>

              {/* Bill Header Info */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="text-sm font-medium">{formatIndianDate(selectedBill.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Customer</div>
                  <div className="text-sm font-medium">{selectedBill.customerName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm font-medium">{selectedBill.locationName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Payment</div>
                  <div className="text-sm font-medium">{selectedBill.payment}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-sm">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${statusClass(selectedBill.status)}`}>
                      {selectedBill.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Items</div>
                  <div className="text-sm font-medium">{lineItems.length}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Product</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Batch</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Qty</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Price</th>
                      {selectedBill.type === 'POS' && (
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">MRP</th>
                      )}
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Disc%</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">GST Rate</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">GST Amt</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.sno} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-500">{item.sno}</td>
                        <td className="py-2 px-3 text-gray-900 max-w-[200px] truncate">{item.productName}</td>
                        <td className="py-2 px-3 text-gray-600 font-mono text-xs">{item.batch}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{item.qty}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{formatIndianCurrency(item.price)}</td>
                        {selectedBill.type === 'POS' && (
                          <td className="py-2 px-3 text-right text-gray-600">{formatIndianCurrency(item.mrp)}</td>
                        )}
                        <td className="py-2 px-3 text-right text-gray-600">{item.discountPct}%</td>
                        <td className="py-2 px-3 text-right text-gray-600">{item.gstRate}%</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatIndianCurrency(item.gstAmt)}</td>
                        <td className="py-2 px-3 text-right text-gray-900 font-semibold">{formatIndianCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bill Summary */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatIndianCurrency(selectedBill.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">-{formatIndianCurrency(selectedBill.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST</span>
                    <span className="font-medium">{formatIndianCurrency(selectedBill.gst)}</span>
                  </div>
                  {selectedBill.type === 'POS' && selectedBill.roundOff !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Round Off</span>
                      <span>{formatIndianCurrency(selectedBill.roundOff)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                    <span>Net Amount</span>
                    <span>{formatIndianCurrency(selectedBill.netAmount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
