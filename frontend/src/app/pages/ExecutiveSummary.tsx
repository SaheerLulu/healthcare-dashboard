import { useNavigate } from 'react-router';
import { useState, MouseEvent } from 'react';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ChartContainer } from '../components/ChartContainer';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertCircle, Package, TrendingUp } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { toMonthlyTrend, toChannelMix, toCategoryPie, toTopProducts } from '../services/transforms';

const COLORS = ['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981'];

export const ExecutiveSummary = () => {
  const navigate = useNavigate();
  const { addCrossFilter, activeFilters, isFiltered } = useCrossFilter();
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

  const revenueTrendData = toMonthlyTrend(apiRevenueTrend);
  const channelMixData = toChannelMix(apiChannelMix);
  const categoryChartData = toCategoryPie(apiCategoryData);
  const topProductsData = toTopProducts(apiTopProducts);

  const handleBarClick = (data: any, dimension: string, detailPage: string = '/detail/sales') => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const filter = {
        id: dimension,
        label: `${dimension}: ${payload[dimension]}`,
        value: payload[dimension],
      };
      // Navigate to detail page with drill-through context
      handleDrillThrough(detailPage, filter);
    }
  };

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

  // Apply cross-filtering
  const filteredRevenueData = revenueTrendData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  const filteredChannelData = channelMixData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
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

      {/* Story Insights Banner */}
      {kpis.gross_profit > 0 && (
      <div className="bg-gradient-to-r from-teal-50 via-white to-indigo-50 rounded-lg border border-teal-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-900">Business Summary</h3>
          <span className="text-xs text-gray-500 ml-auto">Key financial metrics</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Gross Profit</div>
            <div className="text-xl font-bold text-gray-900">{formatIndianCurrencyAbbreviated(kpis.gross_profit)}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
            <div className="text-xl font-bold text-gray-900">{formatIndianCurrencyAbbreviated(kpis.total_revenue)}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Cash Position</div>
            <div className="text-xl font-bold text-gray-900">{formatIndianCurrencyAbbreviated(kpis.cash_position)}</div>
          </div>
        </div>
      </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Revenue"
          value={formatIndianCurrencyAbbreviated(kpis.total_revenue)}
          onClick={() => handleDrillThrough('/detail/sales')}
        />
        <KPICard
          title="Gross Profit"
          value={formatIndianCurrencyAbbreviated(kpis.gross_profit)}
          onClick={() => handleDrillThrough('/detail/financial')}
        />
        <KPICard
          title="Cash Position"
          value={formatIndianCurrencyAbbreviated(kpis.cash_position)}
          onClick={() => handleDrillThrough('/detail/financial')}
        />
        <KPICard
          title="GST Liability"
          value={formatIndianCurrencyAbbreviated(kpis.gst_liability)}
          onClick={() => handleDrillThrough('/detail/gst')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard
          title="Revenue & Profit Trend"
          onDrillThrough={() => handleDrillThrough('/detail/sales')}
        >
          <div
            onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')}
            className="cursor-context-menu"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={filteredRevenueData}
                onClick={(data) => handleBarClick(data, 'month')}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === 'margin') return [`${value}%`, 'Margin'];
                    return [`₹${(value / 100000).toFixed(2)}L`, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="#0D9488"
                  name="Revenue"
                  cursor="pointer"
                  opacity={activeFilters.length > 0 ? 0.3 : 1}
                  className="transition-opacity duration-200"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  name="Margin %"
                  dot={{ fill: '#4F46E5', r: 4 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Sales Channel Mix"
          onDrillThrough={() => handleDrillThrough('/detail/sales')}
        >
          <div
            onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')}
            className="cursor-context-menu"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredChannelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="POS"
                  stackId="1"
                  stroke="#0D9488"
                  fill="#0D9488"
                  name="POS (Retail)"
                />
                <Area
                  type="monotone"
                  dataKey="B2B"
                  stackId="1"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  name="B2B (Wholesale)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Summary Panels Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Inventory Alerts */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Inventory Alerts</h3>
          </div>
          
          <div className="space-y-3">
            <div
              onClick={() => handleDrillThrough('/detail/inventory')}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
            >
              <span className="text-sm text-gray-600">Low Stock</span>
              <span className="text-sm font-bold text-red-600">{alerts.low_stock}</span>
            </div>
            <div
              onClick={() => handleDrillThrough('/detail/inventory')}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
            >
              <span className="text-sm text-gray-600">Expiring ≤30 days</span>
              <span className="text-sm font-bold text-amber-600">{alerts.expiring_30d}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <span className="text-sm text-gray-600">Expired Items</span>
              <span className="text-sm font-bold text-gray-600">{alerts.expired}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <span className="text-sm text-gray-600">Dead Stock</span>
              <span className="text-sm font-bold text-gray-600">{alerts.dead_stock}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="text-sm font-bold text-teal-600">{formatIndianCurrencyAbbreviated(alerts.total_value)}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Products */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-teal-500" />
            <h3 className="text-sm font-semibold text-gray-900">Top 5 Products</h3>
          </div>
          
          <div className="space-y-2">
            {topProductsData.map((product, index) => (
              <div
                key={product.name}
                onClick={() => {
                  addCrossFilter({
                    id: 'product',
                    label: `Product: ${product.name}`,
                    value: product.name,
                  });
                }}
                className="flex items-center justify-between p-2 rounded hover:bg-teal-50 cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">Qty: {product.qty.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-900">
                    ₹{(product.revenue / 1000).toFixed(1)}K
                  </div>
                  <div className="text-xs text-green-600">{product.margin}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Pending Actions</h3>
          </div>
          
          <div className="space-y-3">
            <div
              onClick={() => handleDrillThrough('/detail/purchase')}
              className="p-2 rounded hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">POs Pending</span>
                <span className="text-sm font-bold text-amber-600">5</span>
              </div>
              <div className="text-xs text-gray-500">Value: ₹2.3L</div>
            </div>
            
            <div className="p-2 rounded hover:bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Unpaid Credit</span>
                <span className="text-sm font-bold text-red-600">12</span>
              </div>
              <div className="text-xs text-gray-500">Value: ₹4.5L</div>
            </div>
            
            <div className="p-2 rounded hover:bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">TDS Pending</span>
                <span className="text-sm font-bold text-amber-600">3</span>
              </div>
              <div className="text-xs text-gray-500">Value: ₹45K</div>
            </div>
            
            <div className="p-2 rounded hover:bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">GSTR Due</span>
                <span className="text-sm font-bold text-red-600">1</span>
              </div>
              <div className="text-xs text-gray-500">Mar 2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Revenue by Category">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={categoryChartData}
              layout="vertical"
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const payload = data.activePayload[0].payload;
                  addCrossFilter({
                    id: 'category',
                    label: `Category: ${payload.name}`,
                    value: payload.name,
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`}
              />
              <Bar dataKey="value" fill="#0D9488" cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Today's Sales Activity">
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-teal-600 mb-4">142</div>
              <div className="text-sm text-gray-600 mb-6">Orders Today</div>
              
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">₹89.2K</div>
                  <div className="text-xs text-gray-500">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">₹628</div>
                  <div className="text-xs text-gray-500">Avg Basket</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-green-600 font-medium">
                ↑ 18% vs last week
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{
            from: 'Executive Summary',
            filters: activeFilters,
          }}
          data={contextMenu.data}
        />
      )}
    </div>
  );
};