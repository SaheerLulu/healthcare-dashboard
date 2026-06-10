import { DetailPage, DetailColumn } from '../../components/DetailPage';
import { formatIndianCurrencyAbbreviated } from '../../utils/formatters';

const inr = (v: any) => `₹${(Number(v) || 0).toFixed(2)}`;
const inrFull = (v: any) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const inrOrDash = (v: any) => (Number(v) > 0 ? inrFull(v) : '—');
const pct = (v: any) => `${Number(v) || 0}%`;
const badge = (cls: string, text: any) => (
  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${cls}`}>{text}</span>
);

// ─── Inventory ───────────────────────────────────────────────────────

const expiryBadge = (v: any) =>
  badge(
    v === 'expired'
      ? 'bg-red-100 text-red-700'
      : v === 'critical_30'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700',
    v || 'OK'
  );

const movementBadge = (v: any) =>
  badge(
    v === 'dead'
      ? 'bg-red-100 text-red-700'
      : v === 'slow'
        ? 'bg-amber-100 text-amber-700'
        : v === 'medium'
          ? 'bg-blue-100 text-blue-700'
          : v === 'fast'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700',
    v || '—'
  );

const inventoryColumns: DetailColumn[] = [
  { key: 'product_name', label: 'Product', sortKey: 'product_name' },
  { key: 'product_code', label: 'Code', sortKey: 'product_code' },
  { key: 'product_category', label: 'Category', sortKey: 'product_category' },
  { key: 'batch_no', label: 'Batch No', sortKey: 'batch_no' },
  { key: 'expiry_month', label: 'Expiry', sortKey: 'expiry_month' },
  { key: 'expiry_status', label: 'Expiry Status', sortKey: 'expiry_status', render: expiryBadge },
  { key: 'qty_on_hand', label: 'Qty', numeric: true, total: true, sortKey: 'qty_on_hand' },
  { key: 'purchase_rate', label: 'Purchase Rate', numeric: true, sortKey: 'purchase_rate', format: inr },
  { key: 'mrp', label: 'MRP', numeric: true, sortKey: 'mrp', format: inr },
  {
    key: 'stock_value_cost', label: 'Value', numeric: true, total: true,
    sortKey: 'stock_value_cost', format: (v) => formatIndianCurrencyAbbreviated(Number(v) || 0),
  },
  { key: 'movement_status', label: 'Movement', sortKey: 'movement_status', render: movementBadge },
  { key: 'abc_class', label: 'ABC', sortKey: 'abc_class' },
  { key: 'days_of_stock', label: 'Days of Stock', numeric: true, sortKey: 'days_of_stock' },
  { key: 'location_name', label: 'Location', sortKey: 'location_name' },
];

export const InventoryDetailData = () => (
  <DetailPage
    title="Inventory Detail Data"
    endpoint="/inventory/detail/"
    defaultOrdering="-stock_value_cost"
    columns={inventoryColumns}
    subtitle="Batch-level stock from the latest snapshot"
  />
);

// ─── Purchases ───────────────────────────────────────────────────────

const purchaseColumns: DetailColumn[] = [
  { key: 'bill_date', label: 'Date', sortKey: 'bill_date' },
  { key: 'bill_no', label: 'Bill No', sortKey: 'bill_no' },
  { key: 'supplier_name', label: 'Supplier', sortKey: 'supplier_name' },
  { key: 'product_name', label: 'Product', sortKey: 'product_name' },
  { key: 'product_category', label: 'Category', sortKey: 'product_category' },
  { key: 'quantity', label: 'Qty', numeric: true, total: true, sortKey: 'quantity' },
  { key: 'purchase_rate', label: 'Rate', numeric: true, sortKey: 'purchase_rate', format: inr },
  { key: 'mrp', label: 'MRP', numeric: true, sortKey: 'mrp', format: inr },
  { key: 'tax_percent', label: 'Tax %', numeric: true, sortKey: 'tax_percent', format: pct },
  { key: 'line_total', label: 'Total', numeric: true, total: true, sortKey: 'line_total', format: inr },
  {
    key: 'is_return', label: 'Return?', sortKey: 'is_return',
    render: (v) => badge(
      v ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600',
      v ? 'Return' : 'Purchase'
    ),
  },
  { key: 'location_name', label: 'Location', sortKey: 'location_name' },
];

export const PurchaseDetailData = () => (
  <DetailPage
    title="Purchase Detail Data"
    endpoint="/procurement/detail/"
    defaultOrdering="-bill_date"
    columns={purchaseColumns}
    subtitle="Row-level purchase lines (returns included unless filtered)"
  />
);

// ─── Financial ───────────────────────────────────────────────────────

const financialColumns: DetailColumn[] = [
  { key: 'entry_date', label: 'Date', sortKey: 'entry_date' },
  { key: 'entry_no', label: 'Entry No', sortKey: 'entry_no' },
  {
    key: 'voucher_type', label: 'Voucher', sortKey: 'voucher_type',
    render: (v) => badge('bg-blue-100 text-blue-700', v || '—'),
  },
  { key: 'account_code', label: 'Account Code', sortKey: 'account_code' },
  { key: 'account_name', label: 'Account', sortKey: 'account_name' },
  { key: 'account_type', label: 'Type', sortKey: 'account_type' },
  { key: 'debit', label: 'Debit', numeric: true, total: true, sortKey: 'debit', format: inrOrDash },
  { key: 'credit', label: 'Credit', numeric: true, total: true, sortKey: 'credit', format: inrOrDash },
  { key: 'narration', label: 'Narration', sortKey: 'narration' },
  { key: 'party_name', label: 'Party', sortKey: 'party_name' },
  { key: 'location_name', label: 'Location', sortKey: 'location_name' },
];

export const FinancialDetailData = () => (
  <DetailPage
    title="Financial Detail Data"
    endpoint="/financial/detail/"
    defaultOrdering="-entry_date"
    columns={financialColumns}
    subtitle="Posted journal entry lines"
  />
);

// ─── GST ─────────────────────────────────────────────────────────────

const gstColumns: DetailColumn[] = [
  {
    key: 'source_table', label: 'Source', sortKey: 'source_table',
    render: (v) => badge('bg-purple-100 text-purple-700', v || '—'),
  },
  { key: 'period', label: 'Period', sortKey: 'period' },
  { key: 'invoice_no', label: 'Invoice No', sortKey: 'invoice_no' },
  { key: 'invoice_type', label: 'Type', sortKey: 'invoice_type' },
  { key: 'taxable_value', label: 'Taxable', numeric: true, total: true, sortKey: 'taxable_value', format: inrFull },
  { key: 'gst_rate', label: 'Rate', numeric: true, sortKey: 'gst_rate', format: pct },
  { key: 'cgst', label: 'CGST', numeric: true, sortKey: 'cgst', format: inr },
  { key: 'sgst', label: 'SGST', numeric: true, sortKey: 'sgst', format: inr },
  { key: 'igst', label: 'IGST', numeric: true, sortKey: 'igst', format: inr },
  { key: 'customer_gstin', label: 'Customer GSTIN', sortKey: 'customer_gstin' },
  { key: 'supplier_gstin', label: 'Supplier GSTIN', sortKey: 'supplier_gstin' },
  { key: 'location_name', label: 'Location', sortKey: 'location_name' },
];

export const GSTDetailData = () => (
  <DetailPage
    title="GST Detail Data"
    endpoint="/gst/detail/"
    defaultOrdering="-period"
    columns={gstColumns}
    subtitle="GSTR-1 / GSTR-3B / ITC / RCM source rows"
  />
);
