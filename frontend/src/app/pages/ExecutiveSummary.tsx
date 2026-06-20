import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { DrillSource } from '../contexts/DrillSourceContext';
import { useDrillThrough } from '../hooks/useDrillThrough';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useFilters } from '../contexts/FilterContext';
import { DrillFilter, monthOf } from '../utils/drill';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';
import {
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import { AlertCircle, Package, TrendingUp } from 'lucide-react';

const TEAL = '#0D9488';
const TEAL_DIM = '#B2DFDB';
const INDIGO = '#4F46E5';
const INDIGO_DIM = '#C5CAE9';
import { useApiData } from '../hooks/useApiData';
import { toMonthlyTrend, toChannelMix, toCategoryPie, toTopProducts, monthLabel } from '../services/transforms';

// Cross-filter dimension id → backend drill param (DRILLTHROUGH_DESIGN.md §1).
const CROSS_TO_DRILL_ID: Record<string, string> = {
  product: 'product_name',
  category: 'category',
  month: 'month',
};

export const ExecutiveSummary = () => {
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const { filters } = useFilters();
  const { drillTo, openContextMenu, contextMenuElement } = useDrillThrough();

  // API integration
  const { data: kpis } = useApiData<any>('/executive/kpis/', { total_revenue: 0, gross_profit: 0, cash_position: 0, gst_liability: 0 });
  const { data: apiRevenueTrend } = useApiData<any[]>('/executive/revenue-trend/', []);
  const { data: apiChannelMix } = useApiData<any[]>('/executive/channel-mix/', []);
  const { data: apiCategoryData } = useApiData<any[]>('/executive/category-revenue/', []);
  const { data: apiTopProducts } = useApiData<any[]>('/executive/top-products/', []);
  const { data: alerts } = useApiData<any>('/executive/inventory-alerts/', { low_stock: 0, expiring_30d: 0, expired: 0, dead_stock: 0, total_value: 0 });
  const { data: pendingActions } = useApiData<any>('/executive/pending-actions/', { pending_po_count: 0, pending_po_value: 0, unpaid_credit_count: 0, unpaid_credit_value: 0, pending_gst_filings: 0 });
  const { data: salesActivity } = useApiData<any>('/executive/today-sales/', { orders: 0, revenue: 0, avg_basket: 0, growth_pct: 0, period_label: '' });

  // Month label ("Oct") → raw period ("2025-10"). toChannelMix drops the raw
  // sale_month, so we rebuild it page-locally from the API rows; drill filters
  // must carry the RAW 'YYYY-MM' value (DRILLTHROUGH_DESIGN.md §1).
  const rawMonthByLabel: Record<string, string> = {};
  for (const r of [...apiRevenueTrend, ...apiChannelMix]) {
    const raw = monthOf(r);
    if (raw) rawMonthByLabel[monthLabel(raw)] = raw;
  }

  const revenueTrendData = toMonthlyTrend(apiRevenueTrend).map(item => ({
    ...item,
    margin: item.revenue ? Math.round((item.profit / item.revenue) * 100 * 10) / 10 : 0,
  }));
  const channelMixData = toChannelMix(apiChannelMix).map(item => ({
    ...item,
    sale_month: rawMonthByLabel[item.month] || '',
  }));
  const categoryChartData = toCategoryPie(apiCategoryData);
  const topProductsData = toTopProducts(apiTopProducts);

  // Translate this page's active cross-filters into backend drill params.
  // Month cross-filters store the chart label ("Oct"); drill needs raw YYYY-MM
  // (revenueTrendData rows keep sale_month because toMonthlyTrend spreads the
  // original row — rawMonthByLabel covers the channel-mix labels too).
  const crossDrillFilters = (): DrillFilter[] =>
    activeFilters
      .map((f): DrillFilter | null => {
        const id = CROSS_TO_DRILL_ID[f.id] || f.id;
        let value = String(f.value);
        if (f.id === 'month') {
          const raw = /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : rawMonthByLabel[value];
          if (!raw) return null;
          value = raw;
        }
        return { id, label: f.label, value };
      })
      .filter((f): f is DrillFilter => !!f);

  // For financial/GST drills only the month dimension is meaningful.
  const monthDrillFilters = (): DrillFilter[] => crossDrillFilters().filter(f => f.id === 'month');

  // Left-click: toggle cross-filter (select/deselect)
  const handleChartSelect = (data: any, dimension: string) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      toggleCrossFilter({
        id: dimension,
        label: `${dimension}: ${payload[dimension] || payload.name}`,
        value: payload[dimension] || payload.name,
      });
    }
  };

  // Check if a specific dimension has an active cross-filter
  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  // Apply cross-filtering to channel mix data (filter by month if month selected)
  const filteredChannelData = channelMixData.filter(item =>
    !hasFilter('month') || isFiltered('month', item.month)
  );

  return (
    <DrillSource name="Executive Summary">
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Executive Summary</h1>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Revenue"
          value={formatIndianCurrencyAbbreviated(kpis.total_revenue)}
          trend={(() => {
            const d = Number(kpis.revenue_delta_pct) || 0;
            return d ? { value: `${d > 0 ? '+' : ''}${d.toFixed(1)}%`, direction: (d >= 0 ? 'up' : 'down') as 'up' | 'down' } : undefined;
          })()}
          onClick={() => drillTo('/detail/sales', crossDrillFilters())}
          info={{
            formula: 'Σ line_total of POS + B2B order lines in the selected window',
            source: 'report_sales (pharmacy POS + B2B invoices)',
          }}
        />
        <KPICard
          title="Gross Profit"
          value={formatIndianCurrencyAbbreviated(kpis.gross_profit)}
          trend={(() => {
            const d = Number(kpis.gross_profit_delta_pct) || 0;
            return d ? { value: `${d > 0 ? '+' : ''}${d.toFixed(1)}%`, direction: (d >= 0 ? 'up' : 'down') as 'up' | 'down' } : undefined;
          })()}
          onClick={() => drillTo('/detail/financial', monthDrillFilters())}
          info={{
            formula: 'Σ gross_margin (line revenue − cost)',
            source: 'report_sales (pharmacy POS + B2B order lines)',
            notes: 'COGS is estimated as unit_price × 0.7 when the purchase rate is missing in the source (pipeline estimate).',
          }}
        />
        <KPICard
          title="Cash Position"
          value={formatIndianCurrencyAbbreviated(kpis.cash_position)}
          onClick={() => drillTo('/detail/financial', monthDrillFilters())}
          info={{
            formula: 'Σ debit − credit on Cash & Bank ledgers',
            source: 'report_financial (accounting journal lines)',
          }}
        />
        <KPICard
          title="GST Liability"
          value={formatIndianCurrencyAbbreviated(kpis.gst_liability)}
          onClick={() => drillTo('/detail/gst', monthDrillFilters())}
          info={{
            formula: 'Σ net payable from GSTR-3B summaries in window',
            source: 'report_gst (accounting GSTR-3B)',
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Revenue & Profit Trend — left-click selects month, right-click drills */}
        <ChartCard
          title="Revenue & Profit Trend"
          data={revenueTrendData}
          columns={[
            { key: 'month', label: 'Month' },
            { key: 'revenue', label: 'Revenue', format: formatIndianCurrencyAbbreviated },
            { key: 'profit', label: 'Profit', format: formatIndianCurrencyAbbreviated },
            { key: 'margin', label: 'Margin %' },
          ]}
          drillTarget="/detail/sales"
          drillFilters={crossDrillFilters}
          info={{
            formula: 'Monthly Σ revenue (line_total) and Σ profit (gross_margin); margin % = profit ÷ revenue × 100',
            source: 'report_sales via /executive/revenue-trend/ (POS + B2B order lines grouped by sale_month)',
            notes: 'Profit uses estimated COGS (unit_price × 0.7) when the purchase rate is missing in the source (pipeline estimate).',
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={revenueTrendData} onClick={(data) => handleChartSelect(data, 'month')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value: any, name: string) => {
                if (name === 'Margin %') return [`${value}%`, 'Margin'];
                return [formatIndianCurrencyAbbreviated(value), name];
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" cursor="pointer">
                {revenueTrendData.map((entry, i) => (
                  <Cell key={`rev-${i}`} fill={TEAL} stroke={hasFilter('month') && isFiltered('month', entry.month) ? '#065F46' : 'none'} strokeWidth={2} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#4F46E5" strokeWidth={2} name="Margin %" dot={{ fill: '#4F46E5', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sales Channel Mix — left-click selects month, right-click drills */}
        <ChartCard
          title="Sales Channel Mix"
          data={filteredChannelData}
          columns={[
            { key: 'month', label: 'Month' },
            { key: 'sale_month', label: 'Period' },
            { key: 'POS', label: 'POS (Retail)', format: formatIndianCurrencyAbbreviated },
            { key: 'B2B', label: 'B2B (Wholesale)', format: formatIndianCurrencyAbbreviated },
          ]}
          drillTarget="/detail/sales"
          drillFilters={crossDrillFilters}
          info={{
            formula: 'Monthly Σ revenue (line_total) split by sales channel (POS vs B2B), stacked',
            source: 'report_sales via /executive/channel-mix/ (grouped by sale_month × channel)',
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredChannelData} onClick={(data) => handleChartSelect(data, 'month')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatIndianCurrencyAbbreviated(value)} />
              <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
              <Legend />
              <Area type="monotone" dataKey="POS" stackId="1" name="POS (Retail)" cursor="pointer"
                stroke={TEAL} fill={TEAL} fillOpacity={0.6} />
              <Area type="monotone" dataKey="B2B" stackId="1" name="B2B (Wholesale)" cursor="pointer"
                stroke={INDIGO} fill={INDIGO} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Summary Panels Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Inventory Alerts — left-click items for drill-through (these are action items, not chart data) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Inventory Alerts</h3>
          </div>
          <div className="space-y-3">
            <div onClick={() => drillTo('/detail/inventory', [{ id: 'reorder_needed', label: 'Low Stock', value: 'true' }])}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Low Stock</span>
              <span className="text-sm font-bold text-red-600">{alerts.low_stock}</span>
            </div>
            <div onClick={() => drillTo('/detail/inventory', [{ id: 'expiry_status', label: 'Expiring ≤30 days', value: 'critical_30' }])}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Expiring ≤30 days</span>
              <span className="text-sm font-bold text-amber-600">{alerts.expiring_30d}</span>
            </div>
            <div onClick={() => drillTo('/detail/inventory', [{ id: 'expiry_status', label: 'Expired Items', value: 'expired' }])}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Expired Items</span>
              <span className="text-sm font-bold text-gray-600">{alerts.expired}</span>
            </div>
            <div onClick={() => drillTo('/detail/inventory', [{ id: 'movement_status', label: 'Dead Stock', value: 'dead' }])}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Dead Stock</span>
              <span className="text-sm font-bold text-gray-600">{alerts.dead_stock}</span>
            </div>
            <div onClick={() => drillTo('/detail/inventory')}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="text-sm font-bold text-teal-600">{formatIndianCurrencyAbbreviated(alerts.total_value)}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Products — left-click selects product (cross-filter toggle), right-click drills */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-teal-500" />
            <h3 className="text-sm font-semibold text-gray-900">Top 5 Products</h3>
          </div>
          <div className="space-y-2">
            {topProductsData.length === 0 && (
              <div className="text-xs text-gray-400 py-4 text-center">No products found</div>
            )}
            {topProductsData.map((product) => {
              const selected = activeFilters.some(f => f.id === 'product' && f.value === product.name);
              return (
                <div
                  key={product.name}
                  onClick={() => toggleCrossFilter({ id: 'product', label: `Product: ${product.name}`, value: product.name })}
                  onContextMenu={(e) => openContextMenu(e, '/detail/sales', [{ id: 'product_name', label: `Product: ${product.name}`, value: product.name }], product)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                    selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">Qty: {(Number(product?.qty ?? 0)).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-900">{formatIndianCurrencyAbbreviated(product.revenue)}</div>
                    <div className="text-xs text-green-600">{product.margin}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Actions — direct drill-through (action items) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Pending Actions</h3>
          </div>
          <div className="space-y-3">
            <div onClick={() => drillTo('/detail/purchase', [{ id: 'state', label: 'POs Pending Approval', value: 'pending_approval' }])}
              className="p-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">POs Pending</span>
                <span className="text-sm font-bold text-amber-600">{pendingActions.pending_po_count}</span>
              </div>
              <div className="text-xs text-gray-500">Value: {formatIndianCurrencyAbbreviated(pendingActions.pending_po_value)}</div>
            </div>
            <div onClick={() => drillTo('/detail/sales', [{ id: 'payment_method', label: 'Unpaid Credit Sales', value: 'Credit' }])}
              className="p-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Unpaid Credit</span>
                <span className="text-sm font-bold text-red-600">{pendingActions.unpaid_credit_count}</span>
              </div>
              <div className="text-xs text-gray-500">Value: {formatIndianCurrencyAbbreviated(pendingActions.unpaid_credit_value)}</div>
            </div>
            <div onClick={() => drillTo('/detail/gst', [{ id: 'filing_status', label: 'GSTR Due (Draft)', value: 'draft' }])}
              className="p-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">GSTR Due</span>
                <span className="text-sm font-bold text-red-600">{pendingActions.pending_gst_filings}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue by Category — left-click selects category (cross-filter), right-click drills */}
        <ChartCard
          title="Revenue by Category"
          data={categoryChartData}
          columns={[
            { key: 'name', label: 'Category' },
            { key: 'value', label: 'Revenue', format: formatIndianCurrencyAbbreviated },
            { key: 'orders', label: 'Qty' },
          ]}
          drillTarget="/detail/sales"
          drillFilters={crossDrillFilters}
          info={{
            formula: 'Σ revenue (line_total) grouped by product category in the selected window',
            source: 'report_sales via /executive/category-revenue/',
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData} layout="vertical"
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const payload = data.activePayload[0].payload;
                  toggleCrossFilter({ id: 'category', label: `Category: ${payload.name}`, value: payload.name });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => formatIndianCurrencyAbbreviated(value)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
              <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
              <Bar dataKey="value" cursor="pointer">
                {categoryChartData.map((entry, i) => (
                  <Cell key={`cat-${i}`} fill={TEAL} stroke={hasFilter('category') && isFiltered('category', entry.name) ? '#065F46' : 'none'} strokeWidth={2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sales Activity — responds to time period filters; click drills to sales records */}
        <ChartCard
          title="Sales Activity"
          data={[salesActivity]}
          columns={[
            { key: 'orders', label: 'Orders' },
            { key: 'revenue', label: 'Revenue', format: formatIndianCurrencyAbbreviated },
            { key: 'avg_basket', label: 'Avg Basket', format: formatIndianCurrencyAbbreviated },
            { key: 'growth_pct', label: 'Growth % vs Prev Period' },
          ]}
          drillTarget="/detail/sales"
          drillFilters={crossDrillFilters}
          info={{
            formula: 'Order count, Σ revenue and avg basket (revenue ÷ orders) in the selected window; growth vs the previous window of equal length',
            source: 'report_sales via /executive/today-sales/ (POS + B2B invoices)',
          }}
        >
          <div
            className="h-[300px] flex items-center justify-center cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Sales activity — activate to drill into sales records"
            onClick={() => drillTo('/detail/sales', crossDrillFilters())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                drillTo('/detail/sales', crossDrillFilters());
              }
            }}
          >
            <div className="text-center">
              <div className="text-6xl font-bold text-teal-600 mb-4">{salesActivity.orders}</div>
              <div className="text-sm text-gray-600 mb-6">
                Orders {salesActivity.period_label ? `— ${salesActivity.period_label}` : filters.quickPreset !== 'Custom' ? `— ${filters.quickPreset}` : ''}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{formatIndianCurrencyAbbreviated(salesActivity.revenue)}</div>
                  <div className="text-xs text-gray-500">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{formatIndianCurrencyAbbreviated(salesActivity.avg_basket)}</div>
                  <div className="text-xs text-gray-500">Avg Basket</div>
                </div>
              </div>
              {salesActivity.growth_pct !== 0 && (
              <div className={`mt-4 text-sm font-medium ${salesActivity.growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesActivity.growth_pct >= 0 ? '↑' : '↓'} {Math.abs(salesActivity.growth_pct)}% vs prev period
              </div>
              )}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Shared context menu for non-ChartCard visuals (Top 5 Products rows) */}
      {contextMenuElement}
    </div>
    </DrillSource>
  );
};
