import { DetailPage, DetailColumn } from '../../components/DetailPage';

const inr = (v: any) => `₹${(Number(v) || 0).toFixed(2)}`;
const pct = (v: any) => `${Number(v) || 0}%`;

const channelBadge = (v: any) => (
  <span
    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
      v === 'POS' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
    }`}
  >
    {v || '—'}
  </span>
);

const columns: DetailColumn[] = [
  { key: 'sale_date', label: 'Date', sortKey: 'sale_date' },
  { key: 'invoice_no', label: 'Invoice No', sortKey: 'invoice_no' },
  { key: 'channel', label: 'Channel', sortKey: 'channel', render: channelBadge },
  { key: 'customer_name', label: 'Customer', sortKey: 'customer_name' },
  { key: 'doctor_name', label: 'Doctor', sortKey: 'doctor_name' },
  { key: 'product_name', label: 'Product', sortKey: 'product_name' },
  { key: 'product_category', label: 'Category', sortKey: 'product_category' },
  { key: 'quantity', label: 'Qty', numeric: true, total: true, sortKey: 'quantity' },
  { key: 'unit_price', label: 'Price', numeric: true, sortKey: 'unit_price', format: inr },
  { key: 'discount_amount', label: 'Discount', numeric: true, sortKey: 'discount_amount', format: inr },
  { key: 'tax_percent', label: 'Tax %', numeric: true, sortKey: 'tax_percent', format: pct },
  { key: 'line_total', label: 'Total', numeric: true, total: true, sortKey: 'line_total', format: inr },
  { key: 'payment_method', label: 'Payment', sortKey: 'payment_method' },
  { key: 'location_name', label: 'Location', sortKey: 'location_name' },
];

export const SalesDetailData = () => (
  <DetailPage
    title="Sales Detail Data"
    endpoint="/sales/detail/"
    defaultOrdering="-sale_date"
    columns={columns}
    subtitle="Row-level POS + B2B sale lines"
  />
);
