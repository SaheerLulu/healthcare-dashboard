import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Download } from 'lucide-react';
import { useApiData } from '../../hooks/useApiData';

const DetailPageWrapper = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
          {drillThroughContext.filters?.length > 0 && (
            <div className="text-xs text-teal-700">
              <span className="font-medium">Filters:</span> {drillThroughContext.filters.map((f: any) => f.label).join(', ')}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4 inline mr-2" />
          Export CSV
        </button>
      </div>
      {children}
    </div>
  );
};

export const TDSDetailData = () => {
  const { data: apiTdsDetail } = useApiData<any>('/tds/detail/', { results: [] });

  return (
  <DetailPageWrapper title="TDS Detail Data" subtitle={`Showing ${(apiTdsDetail.results || []).length} deductions | Total TDS: ₹${((apiTdsDetail.results || []).reduce((s: number, i: any) => s + (Number(i.tds_amount) || 0), 0) / 1000).toFixed(2)}K`}>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Deductee</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">PAN</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Section</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Base Amount</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Rate</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">TDS</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {(apiTdsDetail.results || []).map((row: any, i: number) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-900">{row.transaction_date}</td>
                <td className="py-3 px-4 text-gray-900 font-medium">{row.deductee_name}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{row.deductee_pan || '--'}</td>
                <td className="py-3 px-4 text-gray-900">{row.section}</td>
                <td className="py-3 px-4 text-right text-gray-900">₹{((Number(row.gross_amount) || 0) / 1000).toFixed(1)}K</td>
                <td className="py-3 px-4 text-center text-gray-600">{row.tds_rate}%</td>
                <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{(Number(row.tds_amount) || 0).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.status === 'challan_paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

export const WorkingCapitalDetailData = () => {
  const { data: apiWcDetail } = useApiData<any>('/working-capital/receivables/', {});

  const rows = apiWcDetail.by_customer || [];

  return (
  <DetailPageWrapper title="Working Capital Detail Data" subtitle={`Showing ${rows.length} parties | Total: ₹${((Number(apiWcDetail.total_receivables) || 0) / 100000).toFixed(2)}L`}>
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
                <td className="py-3 px-4"><span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">Receivable</span></td>
                <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{((Number(row.outstanding) || 0) / 1000).toFixed(1)}K</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

export const LocationDetailData = () => {
  const { data: apiLocDetail } = useApiData<any>('/location/detail/', []);

  return (
  <DetailPageWrapper title="Location Detail Data" subtitle={`Showing ${(apiLocDetail || []).length} location-month records`}>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Profit</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Bill</th>
            </tr>
          </thead>
          <tbody>
            {(apiLocDetail || []).map((row: any, i: number) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-900 font-medium">{row.location_name}</td>
                <td className="py-3 px-4 text-gray-900">{row.sale_month}</td>
                <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{((Number(row.revenue) || 0) / 1000).toFixed(1)}K</td>
                <td className="py-3 px-4 text-right text-green-600">₹{((Number(row.profit) || 0) / 1000).toFixed(1)}K</td>
                <td className="py-3 px-4 text-right text-gray-900">{row.orders}</td>
                <td className="py-3 px-4 text-right text-gray-900">₹{Number(row.orders) > 0 ? ((Number(row.revenue) || 0) / Number(row.orders)).toFixed(0) : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

export const ProductDetailData = () => {
  const { data: apiProdDetail } = useApiData<any>('/product/detail/', []);

  return (
  <DetailPageWrapper title="Product Detail Data" subtitle={`Showing ${(apiProdDetail || []).length} products | Total Revenue: ₹${((apiProdDetail || []).reduce((s: number, i: any) => s + (Number(i.revenue) || 0), 0) / 100000).toFixed(2)}L`}>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Price</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Margin</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Volume</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(apiProdDetail || []).map((row: any, i: number) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-900 font-medium">{row.product_name}</td>
                <td className="py-3 px-4 text-gray-600">{row.product_category}</td>
                <td className="py-3 px-4 text-right text-gray-900">₹{(Number(row.avg_price) || 0).toFixed(0)}</td>
                <td className="py-3 px-4 text-right text-green-600 font-semibold">₹{((Number(row.margin) || 0) / 1000).toFixed(1)}K</td>
                <td className="py-3 px-4 text-right text-gray-900">{(Number(row.qty) || 0).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-gray-900">{row.orders}</td>
                <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{((Number(row.revenue) || 0) / 1000).toFixed(1)}K</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

export const DispatchDetailData = () => {
  const { data: apiDispDetail } = useApiData<any>('/dispatch/detail/', []);

  return (
  <DetailPageWrapper title="Dispatch & Fulfillment Detail Data" subtitle={`Showing ${(apiDispDetail || []).length} orders`}>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice No</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Dispatch Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Courier</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Delivered On</th>
            </tr>
          </thead>
          <tbody>
            {(apiDispDetail || []).map((row: any, i: number) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-900 font-medium">{row.invoice_no}</td>
                <td className="py-3 px-4 text-gray-900">{row.dispatch_date}</td>
                <td className="py-3 px-4 text-gray-900">{row.customer_name}</td>
                <td className="py-3 px-4 text-gray-600">{row.courier_partner}</td>
                <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{((Number(row.invoice_amount) || 0) / 1000).toFixed(1)}K</td>
                <td className="py-3 px-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.status === 'delivered' ? 'bg-green-100 text-green-700' : row.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span></td>
                <td className="py-3 px-4 text-gray-600">{row.actual_delivery_date || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

export const LoyaltyDetailData = () => {
  const { data: apiLoyDetail } = useApiData<any>('/loyalty/detail/', []);

  return (
  <DetailPageWrapper title="Loyalty Member Detail Data" subtitle={`Showing ${(apiLoyDetail || []).length} members`}>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer ID</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Tier</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Spend</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Points Earned</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Redeemed</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(apiLoyDetail || []).map((row: any, i: number) => {
              const earned = Number(row.customer_loyalty_points) || 0;
              const redeemed = Number(row.points_redeemed) || 0;
              return (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-900 font-medium">{row.customer_id}</td>
                <td className="py-3 px-4 text-gray-900">{row.customer_name}</td>
                <td className="py-3 px-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.customer_type === 'Platinum' ? 'bg-purple-100 text-purple-700' : row.customer_type === 'Gold' ? 'bg-yellow-100 text-yellow-700' : row.customer_type === 'Silver' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>{row.customer_type}</span></td>
                <td className="py-3 px-4 text-right text-gray-900">₹{((Number(row.revenue) || 0) / 1000).toFixed(1)}K</td>
                <td className="py-3 px-4 text-right text-gray-900">{row.orders}</td>
                <td className="py-3 px-4 text-right text-gray-900">{earned.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-red-600">{redeemed.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-green-600 font-semibold">{(earned - redeemed).toLocaleString('en-IN')}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

export const AuditDetailData = () => {
  const { data: apiAuditDetail } = useApiData<any>('/audit/detail/', [], { noFilters: true });

  return (
  <DetailPageWrapper title="Audit Trail Detail Data" subtitle={`Showing ${(apiAuditDetail || []).length} recent events`}>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Module</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {(apiAuditDetail || []).map((row: any, i: number) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-600 text-xs">{row.timestamp}</td>
                <td className="py-3 px-4 text-gray-900 font-medium">{row.user_id}</td>
                <td className="py-3 px-4 text-gray-900">{row.action}</td>
                <td className="py-3 px-4"><span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">{row.model_name}</span></td>
                <td className="py-3 px-4 text-gray-600">{row.object_repr}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{row.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DetailPageWrapper>
  );
};

// Sales Returns Detail Data
export const SalesReturnsDetailData = () => {
  const { data: apiReturnsDetail } = useApiData<any>('/sales/returns/detail/', { results: [] });
  const rows = apiReturnsDetail.results || [];

  return (
    <DetailPageWrapper title="Sales Returns Detail Data" subtitle={`Showing ${rows.length} returns | Total: ₹${(rows.reduce((s: number, i: any) => s + (Number(i.line_total) || 0), 0) / 1000).toFixed(2)}K`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Return No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Orig. Invoice</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900">{row.return_date}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.return_no}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.return_type === 'pos' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>{(row.return_type || '').toUpperCase()}</span></td>
                  <td className="py-3 px-4 text-gray-600">{row.original_invoice_no}</td>
                  <td className="py-3 px-4 text-gray-900">{row.customer_name}</td>
                  <td className="py-3 px-4 text-gray-900">{row.product_name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.product_category}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{row.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₹{(Number(row.unit_price) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{(Number(row.line_total) || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-600">{row.reason}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DetailPageWrapper>
  );
};

// Expense Detail Data
export const ExpenseDetailData = () => {
  const { data: apiExpDetail } = useApiData<any>('/expense/detail/', { results: [] });

  const rows = apiExpDetail.results || [];

  return (
    <DetailPageWrapper title="Expense Detail Data" subtitle={`Total Expenses: ₹${(rows.reduce((s: number, i: any) => s + (Number(i.debit) || 0), 0) / 100000).toFixed(2)}L`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Account</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Narration</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Party</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Voucher Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900">{row.entry_date}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{row.account_name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.narration}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{((Number(row.debit) || 0) / 1000).toFixed(1)}K</td>
                  <td className="py-3 px-4 text-gray-900">{row.party_name || '--'}</td>
                  <td className="py-3 px-4 text-gray-600">{row.voucher_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DetailPageWrapper>
  );
};
