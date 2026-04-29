import { useNavigate } from 'react-router';
import { useState, MouseEvent } from 'react';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useFilters } from '../contexts/FilterContext';
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
import { toMonthlyTrend, toChannelMix, toCategoryPie, toTopProducts } from '../services/transforms';

export const ExecutiveSummary = () => {
  const navigate = useNavigate();
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const { filters } = useFilters();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    page: string;
    data?: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    page: '',
  });

  // API integration
  const { data: kpis } = useApiData<any>('/executive/kpis/', { total_revenue: 0, gross_profit: 0, cash_position: 0, gst_liability: 0 });
  const { data: apiRevenueTrend } = useApiData<any[]>('/executive/revenue-trend/', []);
  const { data: apiChannelMix } = useApiData<any[]>('/executive/channel-mix/', []);
  const { data: apiCategoryData } = useApiData<any[]>('/executive/category-revenue/', []);
  const { data: apiTopProducts } = useApiData<any[]>('/executive/top-products/', []);
  const { data: alerts } = useApiData<any>('/executive/inventory-alerts/', { low_stock: 0, expiring_30d: 0, expired: 0, dead_stock: 0, total_value: 0 });
  const { data: pendingActions } = useApiData<any>('/executive/pending-actions/', { pending_po_count: 0, pending_po_value: 0, unpaid_credit_count: 0, unpaid_credit_value: 0, pending_gst_filings: 0 });
  const { data: salesActivity } = useApiData<any>('/executive/today-sales/', { orders: 0, revenue: 0, avg_basket: 0, growth_pct: 0, period_label: '' });

  const revenueTrendData = toMonthlyTrend(apiRevenueTrend).map(item => ({
    ...item,
    margin: item.revenue ? Math.round((item.profit / item.revenue) * 100 * 10) / 10 : 0,
  }));
  const channelMixData = toChannelMix(apiChannelMix);
  const categoryChartData = toCategoryPie(apiCategoryData);
  const topProductsData = toTopProducts(apiTopProducts);

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

  // Right-click: open context menu for drill-through
  const handleChartRightClick = (e: MouseEvent, page: string, data?: any) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      page,
      data,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDrillThrough = (page: string, filter?: any) => {
    navigate(page, {
      state: {
        drillThrough: {
          from: 'Executive Summary',
          filters: filter ? [filter] : activeFilters.length > 0 ? activeFilters : [],
        },
      },
    });
  };

  // Check if a specific dimension has an active cross-filter
  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  // Apply cross-filtering to channel mix data (filter by month if month selected)
  const filteredChannelData = channelMixData.filter(item =>
    !hasFilter('month') || isFiltered('month', item.month)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Executive Summary</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Export as PDF
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            Refresh Data
          </button>
        </div>
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
          onClick={() => handleDrillThrough('/detail/sales')}
        />
        <KPICard
          title="Gross Profit"
          value={formatIndianCurrencyAbbreviated(kpis.gross_profit)}
          trend={(() => {
            const d = Number(kpis.gross_profit_delta_pct) || 0;
            return d ? { value: `${d > 0 ? '+' : ''}${d.toFixed(1)}%`, direction: (d >= 0 ? 'up' : 'down') as 'up' | 'down' } : undefined;
          })()}
          onClick={() => handleDrillThrough('/detail/financial')}
        />
        <KPICard title="Cash Position" value={formatIndianCurrencyAbbreviated(kpis.cash_position)} onClick={() => handleDrillThrough('/detail/financial')} />
        <KPICard title="GST Liability" value={formatIndianCurrencyAbbreviated(kpis.gst_liability)} onClick={() => handleDrillThrough('/detail/gst')} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Revenue & Profit Trend — left-click selects month, right-click drills */}
        <ChartCard title="Revenue & Profit Trend" onDrillThrough={() => handleDrillThrough('/detail/sales')}>
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-pointer">
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
          </div>
        </ChartCard>

        {/* Sales Channel Mix — left-click selects month, right-click drills */}
        <ChartCard title="Sales Channel Mix" onDrillThrough={() => handleDrillThrough('/detail/sales')}>
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-pointer">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={channelMixData} onClick={(data) => handleChartSelect(data, 'month')}>
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
          </div>
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
            <div onClick={() => handleDrillThrough('/detail/inventory', { id: 'reorder_needed', label: 'Low Stock', value: 'true' })}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Low Stock</span>
              <span className="text-sm font-bold text-red-600">{alerts.low_stock}</span>
            </div>
            <div onClick={() => handleDrillThrough('/detail/inventory', { id: 'expiry_status', label: 'Expiring ≤30 days', value: 'critical_30' })}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Expiring ≤30 days</span>
              <span className="text-sm font-bold text-amber-600">{alerts.expiring_30d}</span>
            </div>
            <div onClick={() => handleDrillThrough('/detail/inventory', { id: 'expiry_status', label: 'Expired Items', value: 'expired' })}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Expired Items</span>
              <span className="text-sm font-bold text-gray-600">{alerts.expired}</span>
            </div>
            <div onClick={() => handleDrillThrough('/detail/inventory', { id: 'movement_status', label: 'Dead Stock', value: 'dead' })}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Dead Stock</span>
              <span className="text-sm font-bold text-gray-600">{alerts.dead_stock}</span>
            </div>
            <div onClick={() => handleDrillThrough('/detail/inventory')}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="text-sm font-bold text-teal-600">{formatIndianCurrencyAbbreviated(alerts.total_value)}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Products — left-click selects product (cross-filter toggle) */}
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
            <div onClick={() => handleDrillThrough('/detail/purchase', { id: 'state', label: 'POs Pending Approval', value: 'pending_approval' })}
              className="p-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">POs Pending</span>
                <span className="text-sm font-bold text-amber-600">{pendingActions.pending_po_count}</span>
              </div>
              <div className="text-xs text-gray-500">Value: {formatIndianCurrencyAbbreviated(pendingActions.pending_po_value)}</div>
            </div>
            <div onClick={() => handleDrillThrough('/detail/sales', { id: 'payment_method', label: 'Unpaid Credit Sales', value: 'Credit' })}
              className="p-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Unpaid Credit</span>
                <span className="text-sm font-bold text-red-600">{pendingActions.unpaid_credit_count}</span>
              </div>
              <div className="text-xs text-gray-500">Value: {formatIndianCurrencyAbbreviated(pendingActions.unpaid_credit_value)}</div>
            </div>
            <div onClick={() => handleDrillThrough('/detail/gst', { id: 'filing_status', label: 'GSTR Due (Draft)', value: 'draft' })}
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
        <ChartCard title="Revenue by Category">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')}>
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
          </div>
        </ChartCard>

        {/* Sales Activity — responds to time period filters */}
        <ChartCard title="Sales Activity">
          <div className="h-[300px] flex items-center justify-center">
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

      {/* Context Menu (right-click drill-through) */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{ from: 'Executive Summary', filters: activeFilters }}
          data={contextMenu.data}
        />
      )}
    </div>
  );
};
