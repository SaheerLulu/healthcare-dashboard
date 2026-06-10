import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useApiData } from '../../hooks/useApiData';
import { DetailPage, DetailColumn } from '../../components/DetailPage';
import { formatIndianCurrencyAbbreviated } from '../../utils/formatters';
import { parseDrillSearch, DrillContext } from '../../utils/drill';

const inr = (v: any) => `₹${(Number(v) || 0).toFixed(2)}`;
const inrFull = (v: any) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const inrAbbr = (v: any) => formatIndianCurrencyAbbreviated(Number(v) || 0);
const pct = (v: any) => `${Number(v) || 0}%`;
const badge = (cls: string, text: any) => (
  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${cls}`}>{text}</span>
);

// ─── TDS ─────────────────────────────────────────────────────────────

const tdsColumns: DetailColumn[] = [
  { key: 'transaction_date', label: 'Date', sortKey: 'transaction_date' },
  { key: 'deductee_name', label: 'Deductee', sortKey: 'deductee_name' },
  { key: 'deductee_pan', label: 'PAN' },
  { key: 'section', label: 'Section', sortKey: 'section' },
  { key: 'gross_amount', label: 'Base Amount', numeric: true, total: true, sortKey: 'gross_amount', format: inrFull },
  { key: 'tds_rate', label: 'Rate', numeric: true, sortKey: 'tds_rate', format: pct },
  { key: 'tds_amount', label: 'TDS', numeric: true, total: true, sortKey: 'tds_amount', format: inrFull },
  {
    key: 'status', label: 'Status', sortKey: 'status',
    render: (v) => badge(
      v === 'challan_paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
      v || '—'
    ),
  },
  { key: 'challan_no', label: 'Challan No', sortKey: 'challan_no' },
  { key: 'location_name', label: 'Location', sortKey: 'location_name' },
];

export const TDSDetailData = () => (
  <DetailPage
    title="TDS Detail Data"
    endpoint="/tds/detail/"
    defaultOrdering="-transaction_date"
    columns={tdsColumns}
    subtitle="TDS deduction transactions"
  />
);

// ─── Expense ─────────────────────────────────────────────────────────

const expenseColumns: DetailColumn[] = [
  { key: 'entry_date', label: 'Date', sortKey: 'entry_date' },
  { key: 'account_name', label: 'Account', sortKey: 'account_name' },
  { key: 'narration', label: 'Narration', sortKey: 'narration' },
  { key: 'debit', label: 'Amount', numeric: true, total: true, sortKey: 'debit', format: inrFull },
  { key: 'party_name', label: 'Party', sortKey: 'party_name' },
  { key: 'voucher_type', label: 'Voucher Type', sortKey: 'voucher_type' },
];

export const ExpenseDetailData = () => (
  <DetailPage
    title="Expense Detail Data"
    endpoint="/expense/detail/"
    defaultOrdering="-entry_date"
    columns={expenseColumns}
    subtitle="Posted EXPENSE-account journal lines"
  />
);

// ─── Sales Returns ───────────────────────────────────────────────────

const returnsColumns: DetailColumn[] = [
  { key: 'return_date', label: 'Date', sortKey: 'return_date' },
  { key: 'return_no', label: 'Return No', sortKey: 'return_no' },
  {
    key: 'return_type', label: 'Type', sortKey: 'return_type',
    render: (v) => badge(
      v === 'pos' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700',
      (v || '').toUpperCase() || '—'
    ),
  },
  { key: 'original_invoice_no', label: 'Orig. Invoice', sortKey: 'original_invoice_no' },
  { key: 'customer_name', label: 'Customer', sortKey: 'customer_name' },
  { key: 'product_name', label: 'Product', sortKey: 'product_name' },
  { key: 'batch_no', label: 'Batch No', sortKey: 'batch_no' },
  { key: 'quantity', label: 'Qty', numeric: true, total: true, sortKey: 'quantity' },
  { key: 'unit_price', label: 'Price', numeric: true, sortKey: 'unit_price', format: inr },
  { key: 'line_total', label: 'Total', numeric: true, total: true, sortKey: 'line_total', format: inr },
  { key: 'reason', label: 'Reason', sortKey: 'reason' },
  {
    key: 'status', label: 'Status', sortKey: 'status',
    render: (v) => badge(
      v === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
      v || '—'
    ),
  },
];

export const SalesReturnsDetailData = () => (
  <DetailPage
    title="Sales Returns Detail Data"
    endpoint="/sales/returns/detail/"
    defaultOrdering="-return_date"
    columns={returnsColumns}
    subtitle="Row-level POS + B2B return lines"
  />
);

// ─── Working Capital (custom: endpoint is aggregate-shaped) ──────────

export const WorkingCapitalDetailData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const drill: DrillContext | null =
    parseDrillSearch(location.search) || (location.state as any)?.drillThrough || null;
  const { data: apiWcDetail } = useApiData<any>('/working-capital/receivables/', {});
  const allRows = apiWcDetail.by_customer || [];
  // The endpoint returns cumulative per-party balances with no dimension
  // support — apply party filters client-side; other drill filters are
  // labeled as context so chips are never silently decorative.
  const nameFilter = drill?.filters.find(
    (f) => f.id === 'customer_name' || f.id === 'party_name'
  );
  const rows = nameFilter
    ? allRows.filter((r: any) =>
        String(r.party_name || '').toLowerCase().includes(String(nameFilter.value).toLowerCase()))
    : allRows;
  const totalShown = nameFilter
    ? rows.reduce((s: number, r: any) => s + (Number(r.outstanding) || 0), 0)
    : Number(apiWcDetail.total_receivables) || 0;

  return (
    <div>
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {drill?.from || 'Dashboard'}
        </button>
        {drill && drill.filters.length > 0 && (
          <div className="text-xs text-teal-700 mt-3">
            <span className="font-medium">Filters:</span>{' '}
            {drill.filters
              .map((f) =>
                f.id === 'customer_name' || f.id === 'party_name'
                  ? f.label
                  : `${f.label} (context — balances are cumulative)`)
              .join(', ')}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Working Capital Detail Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {rows.length} parties | Total: ₹
            {(totalShown / 100000).toFixed(2)}L
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Party</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.party_name}</td>
                  <td className="py-3 px-4">
                    {badge('bg-blue-100 text-blue-700', 'Receivable')}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                    ₹{((Number(row.outstanding) || 0) / 1000).toFixed(1)}K
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

// ─── Location (plain array; backend ignores ordering) ───────────────

const locationColumns: DetailColumn[] = [
  { key: 'location_name', label: 'Location' },
  { key: 'sale_month', label: 'Month' },
  { key: 'revenue', label: 'Revenue', numeric: true, total: true, format: inrAbbr },
  { key: 'orders', label: 'Orders', numeric: true },
  { key: 'qty', label: 'Qty', numeric: true },
];

export const LocationDetailData = () => (
  <DetailPage
    title="Location Detail Data"
    endpoint="/location/detail/"
    defaultOrdering="sale_month"
    columns={locationColumns}
    subtitle="Location × month sales aggregates"
  />
);

// ─── Product ─────────────────────────────────────────────────────────

const productColumns: DetailColumn[] = [
  { key: 'product_name', label: 'Product', sortKey: 'product_name' },
  { key: 'product_code', label: 'Code', sortKey: 'product_code' },
  { key: 'product_category', label: 'Category', sortKey: 'product_category' },
  { key: 'product_company', label: 'Company', sortKey: 'product_company' },
  { key: 'product_molecule', label: 'Molecule', sortKey: 'product_molecule' },
  { key: 'revenue', label: 'Revenue', numeric: true, total: true, sortKey: 'revenue', format: inrAbbr },
  { key: 'qty', label: 'Volume', numeric: true, total: true, sortKey: 'qty' },
  { key: 'margin', label: 'Margin', numeric: true, sortKey: 'margin', format: inrAbbr },
  { key: 'avg_price', label: 'Avg Price', numeric: true, sortKey: 'avg_price', format: (v) => `₹${(Number(v) || 0).toFixed(0)}` },
  { key: 'orders', label: 'Orders', numeric: true, sortKey: 'orders' },
];

export const ProductDetailData = () => (
  <DetailPage
    title="Product Detail Data"
    endpoint="/product/detail/"
    defaultOrdering="-revenue"
    columns={productColumns}
    subtitle="Per-product sales performance"
  />
);

// ─── Dispatch (plain array; backend ignores ordering) ───────────────

const dispatchColumns: DetailColumn[] = [
  { key: 'invoice_no', label: 'Invoice No' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'courier_partner', label: 'Courier' },
  { key: 'tracking_number', label: 'Tracking No' },
  {
    key: 'status', label: 'Status',
    render: (v) => badge(
      v === 'delivered'
        ? 'bg-green-100 text-green-700'
        : v === 'in_transit'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-yellow-100 text-yellow-700',
      v || '—'
    ),
  },
  { key: 'dispatch_date', label: 'Dispatch Date' },
  { key: 'expected_delivery_date', label: 'Expected Delivery' },
  { key: 'invoice_amount', label: 'Value', numeric: true, total: true, format: inrAbbr },
  { key: 'freight_charge', label: 'Freight', numeric: true, format: inr },
];

export const DispatchDetailData = () => (
  <DetailPage
    title="Dispatch & Fulfillment Detail Data"
    endpoint="/dispatch/detail/"
    defaultOrdering="-dispatch_date"
    columns={dispatchColumns}
    subtitle="Dispatch register entries"
  />
);

// ─── Loyalty ─────────────────────────────────────────────────────────

const loyaltyColumns: DetailColumn[] = [
  { key: 'customer_id', label: 'Customer ID', sortKey: 'customer_id' },
  { key: 'customer_name', label: 'Name', sortKey: 'customer_name' },
  {
    key: 'customer_type', label: 'Tier', sortKey: 'customer_type',
    render: (v) => badge(
      v === 'Platinum'
        ? 'bg-purple-100 text-purple-700'
        : v === 'Gold'
          ? 'bg-yellow-100 text-yellow-700'
          : v === 'Silver'
            ? 'bg-gray-100 text-gray-700'
            : 'bg-orange-100 text-orange-700',
      v || '—'
    ),
  },
  { key: 'orders', label: 'Orders', numeric: true, sortKey: 'orders' },
  { key: 'revenue', label: 'Total Spend', numeric: true, total: true, sortKey: 'revenue', format: inrAbbr },
  { key: 'customer_loyalty_points', label: 'Points Earned', numeric: true, sortKey: 'customer_loyalty_points' },
  { key: 'points_redeemed', label: 'Points Redeemed', numeric: true, sortKey: 'points_redeemed' },
];

export const LoyaltyDetailData = () => (
  <DetailPage
    title="Loyalty Member Detail Data"
    endpoint="/loyalty/detail/"
    defaultOrdering="-revenue"
    columns={loyaltyColumns}
    subtitle="Per-member spend and loyalty points"
  />
);

// ─── Audit (plain array; backend ignores filters/ordering) ──────────

const auditColumns: DetailColumn[] = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'user_id', label: 'User' },
  { key: 'action', label: 'Action' },
  {
    key: 'model_name', label: 'Module',
    render: (v) => badge('bg-gray-100 text-gray-700', v || '—'),
  },
  { key: 'object_repr', label: 'Details' },
  { key: 'ip_address', label: 'IP Address' },
];

export const AuditDetailData = () => (
  <DetailPage
    title="Audit Trail Detail Data"
    endpoint="/audit/detail/"
    defaultOrdering="-timestamp"
    columns={auditColumns}
    subtitle="Most recent 50 audit events"
  />
);
