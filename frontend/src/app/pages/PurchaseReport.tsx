import { useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
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
  purchaseOrders,
  purchaseOrderLines,
  suppliers,
  locations,
  products,
} from '../../../../src/app/data';

interface PurchaseBillRow {
  id: string;
  invoiceNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  locationId: string;
  locationName: string;
  total: number;
  discount: number;
  gst: number;
  netAmount: number;
  paymentStatus: string;
  paymentDueDate: string;
  status: string;
  expectedDelivery: string;
  actualDelivery: string;
}

type SortField = 'date' | 'netAmount' | 'supplierName' | 'invoiceNo';

export const PurchaseReport = () => {
  const { filters } = useFilters();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedBill, setSelectedBill] = useState<PurchaseBillRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), []);
  const locationMap = useMemo(() => new Map(locations.map(l => [l.id, l])), []);
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), []);

  const filteredBills = useMemo(() => {
    const { dateRange, locations: filterLocs, supplierNames } = filters;

    const rows: PurchaseBillRow[] = [];

    for (const po of purchaseOrders) {
      if (dateRange.start && po.orderDate < dateRange.start) continue;
      if (dateRange.end && po.orderDate > dateRange.end) continue;
      if (filterLocs.length > 0 && !filterLocs.includes(po.locationId)) continue;

      const supplier = supplierMap.get(po.supplierId);
      if (supplierNames.length > 0 && supplier && !supplierNames.includes(supplier.name)) continue;

      const loc = locationMap.get(po.locationId);

      rows.push({
        id: po.id,
        invoiceNo: po.invoiceNumber || '-',
        date: po.orderDate,
        supplierId: po.supplierId,
        supplierName: supplier?.name || po.supplierId,
        locationId: po.locationId,
        locationName: loc?.name || po.locationId,
        total: po.totalAmount,
        discount: po.discountAmount,
        gst: po.gstAmount,
        netAmount: po.netAmount,
        paymentStatus: po.paymentStatus,
        paymentDueDate: po.paymentDueDate,
        status: po.status,
        expectedDelivery: po.expectedDeliveryDate,
        actualDelivery: po.actualDeliveryDate,
      });
    }

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'netAmount') cmp = a.netAmount - b.netAmount;
      else if (sortField === 'supplierName') cmp = a.supplierName.localeCompare(b.supplierName);
      else if (sortField === 'invoiceNo') cmp = a.invoiceNo.localeCompare(b.invoiceNo);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [filters, sortField, sortDir, supplierMap, locationMap]);

  const lineItems = useMemo(() => {
    if (!selectedBill) return [];
    return purchaseOrderLines
      .filter(l => l.purchaseOrderId === selectedBill.id)
      .map((l, i) => ({
        sno: i + 1,
        productName: productMap.get(l.productId)?.name || l.productId,
        batch: l.batchNumber,
        expiry: l.expiryDate,
        orderedQty: l.orderedQuantity,
        receivedQty: l.receivedQuantity,
        freeQty: l.freeQuantity,
        unitPrice: l.unitPrice,
        discountPct: l.discount,
        gstRate: l.gstRate,
        gstAmt: l.gstAmount,
        lineTotal: l.lineTotal,
      }));
  }, [selectedBill, productMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleDoubleClick = (bill: PurchaseBillRow) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const exportCSV = () => {
    const headers = ['PO No', 'Invoice No', 'Date', 'Supplier', 'Location', 'Total', 'Discount', 'GST', 'Net Amount', 'Payment Status', 'Status'];
    const csvRows = filteredBills.map(r => [
      r.id, r.invoiceNo, r.date, `"${r.supplierName}"`, `"${r.locationName}"`,
      r.total.toFixed(2), r.discount.toFixed(2), r.gst.toFixed(2), r.netAmount.toFixed(2),
      r.paymentStatus, r.status,
    ]);
    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
      case 'Received': return 'text-green-700 border-green-300';
      case 'Confirmed': return 'text-blue-700 border-blue-300';
      case 'Partial': return 'text-orange-700 border-orange-300';
      case 'Draft': return 'text-gray-700 border-gray-300';
      case 'Cancelled': return 'text-red-700 border-red-300';
      default: return 'text-gray-700 border-gray-300';
    }
  };

  const paymentClass = (status: string) => {
    switch (status) {
      case 'Paid': return 'text-green-700 border-green-300';
      case 'Partial': return 'text-orange-700 border-orange-300';
      case 'Pending': return 'text-red-700 border-red-300';
      default: return 'text-gray-700 border-gray-300';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">Purchase Bills</h1>
          </div>
          <p className="text-sm text-gray-600">
            {filteredBills.length} purchase orders | Total: {formatIndianCurrency(totalNet)}
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
        Double-click any row to view purchase order details
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">PO No</th>
                <th
                  onClick={() => handleSort('invoiceNo')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Invoice No{sortArrow('invoiceNo')}
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Date{sortArrow('date')}
                </th>
                <th
                  onClick={() => handleSort('supplierName')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Supplier{sortArrow('supplierName')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
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
                  <td className="py-3 px-4 font-mono text-xs text-gray-900">{row.id}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-900">{row.invoiceNo}</td>
                  <td className="py-3 px-4 text-gray-900">{formatIndianDate(row.date)}</td>
                  <td className="py-3 px-4 text-gray-900 max-w-[180px] truncate">{row.supplierName}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{row.locationName}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{formatIndianCurrency(row.total)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(row.discount)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatIndianCurrency(row.gst)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">{formatIndianCurrency(row.netAmount)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${paymentClass(row.paymentStatus)}`}>
                      {row.paymentStatus}
                    </span>
                  </td>
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
                <td colSpan={5} className="py-3 px-4 font-bold text-gray-900">TOTAL ({filteredBills.length} orders)</td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  {formatIndianCurrency(filteredBills.reduce((s, r) => s + r.total, 0))}
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
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
          {selectedBill && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Purchase Order: {selectedBill.id}
                  {selectedBill.invoiceNo !== '-' && (
                    <span className="ml-2 text-sm text-gray-500">({selectedBill.invoiceNo})</span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Purchase order details (read-only)
                </DialogDescription>
              </DialogHeader>

              {/* PO Header Info */}
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="text-sm font-medium">{formatIndianDate(selectedBill.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Supplier</div>
                  <div className="text-sm font-medium">{selectedBill.supplierName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm font-medium">{selectedBill.locationName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Expected Delivery</div>
                  <div className="text-sm font-medium">{selectedBill.expectedDelivery ? formatIndianDate(selectedBill.expectedDelivery) : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Actual Delivery</div>
                  <div className="text-sm font-medium">{selectedBill.actualDelivery ? formatIndianDate(selectedBill.actualDelivery) : '-'}</div>
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
                  <div className="text-xs text-gray-500">Payment Status</div>
                  <div className="text-sm">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${paymentClass(selectedBill.paymentStatus)}`}>
                      {selectedBill.paymentStatus}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Payment Due</div>
                  <div className="text-sm font-medium">{selectedBill.paymentDueDate ? formatIndianDate(selectedBill.paymentDueDate) : '-'}</div>
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
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Expiry</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Ordered</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Received</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Free</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Rate</th>
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
                        <td className="py-2 px-3 text-gray-900 max-w-[180px] truncate">{item.productName}</td>
                        <td className="py-2 px-3 text-gray-600 font-mono text-xs">{item.batch}</td>
                        <td className="py-2 px-3 text-gray-600">{item.expiry ? formatIndianDate(item.expiry) : '-'}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{item.orderedQty}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{item.receivedQty}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{item.freeQty > 0 ? item.freeQty : '-'}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{formatIndianCurrency(item.unitPrice)}</td>
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
                    <span className="text-gray-600">Total</span>
                    <span className="font-medium">{formatIndianCurrency(selectedBill.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">-{formatIndianCurrency(selectedBill.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST</span>
                    <span className="font-medium">{formatIndianCurrency(selectedBill.gst)}</span>
                  </div>
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
