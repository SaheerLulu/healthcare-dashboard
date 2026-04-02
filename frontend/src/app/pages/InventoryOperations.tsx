import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Package, AlertTriangle, TrendingUp, DollarSign, BarChart3, Activity, Zap, Target } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { toInventoryCategory, numericize } from '../services/transforms';
import { formatIndianCurrencyAbbreviated, formatIndianNumber } from '../utils/formatters';

const COLORS = {
  critical: '#EF4444',
  warning: '#F59E0B',
  attention: '#3B82F6',
  safe: '#10B981',
};

export const InventoryOperations = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expiry' | 'movement' | 'abc' | 'deadstock' | 'optimization' | 'forecast' | 'efficiency' | 'batch' | 'investment'>('overview');
  const navigate = useNavigate();
  const { addCrossFilter, activeFilters } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    page: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    page: '',
  });

  // API integration
  const { data: apiOverview } = useApiData<any>('/inventory/overview/', {});
  const { data: apiByCategory } = useApiData<any[]>('/inventory/by-category/', []);
  const { data: apiExpiry } = useApiData<any[]>('/inventory/expiry/', []);
  const { data: apiAbcVed } = useApiData<any[]>('/inventory/abc-ved/', []);
  const { data: apiDeadStock } = useApiData<any[]>('/inventory/dead-stock/', []);
  const { data: apiEfficiency } = useApiData<any[]>('/inventory/efficiency/', []);
  const { data: apiBatches } = useApiData<any[]>('/inventory/batches/', []);
  const { data: apiInvestment } = useApiData<any>('/inventory/investment/', { by_category: [], by_location: [] });
  const { data: apiMovement } = useApiData<any>('/inventory/movement-trend/', { inbound: [], outbound: [] });
  const { data: apiStockAlerts } = useApiData<any[]>('/inventory/stock-alerts/', []);
  const { data: apiCarryingCost } = useApiData<any[]>('/inventory/carrying-cost/', []);
  const { data: apiOptimization } = useApiData<any>('/inventory/optimization/', { recommendations: [], sales_ratio: [] });
  const { data: apiForecast } = useApiData<any>('/inventory/forecast/', { demand: [], seasonal: [], accuracy: [], safety_stock: [] });
  const { data: apiTurnover } = useApiData<any>('/inventory/turnover/', { trend: [], category: [], velocity: [], working_capital: [], radar: [] });
  const { data: apiBatchDetail } = useApiData<any>('/inventory/batch-detail/', { aging: [], fifo: [], lot_profitability: [], batch_analysis: [] });
  const { data: apiInvestmentDetail } = useApiData<any>('/inventory/investment-detail/', { by_supplier: [], by_location: [], roi_trend: [], by_velocity: [], scatter: [], efficiency_metrics: [], optimization: [] });

  // Transform API data
  const stockByCategoryData = toInventoryCategory(apiByCategory);
  const movementTrendData = (Array.isArray(apiMovement?.inbound) && apiMovement.inbound.length
    ? apiMovement.inbound.map((r: any) => numericize(r))
    : Array.isArray(apiMovement) ? (apiMovement as any[]).map((r: any) => numericize(r)) : []);

  // Expiry data from API
  const expiryData = apiExpiry.map((r: any) => ({
    range: r.range || r.expiry_range || '',
    qty: Number(r.qty) || 0,
    value: Number(r.value) || 0,
    status: r.status || 'safe',
  }));

  // ABC-VED data from API
  const abcVedMatrix = apiAbcVed.map((r: any) => ({
    classification: r.classification || '',
    items: Number(r.items) || 0,
    value: Number(r.value) || 0,
    status: r.status || 'medium',
  }));

  // Dead stock data from API
  const deadStockItems = apiDeadStock.map((r: any) => ({
    product: r.product || r.product_name || '',
    qty: Number(r.qty) || 0,
    value: Number(r.value) || 0,
    lastSold: r.lastSold || r.last_sold || '',
    category: r.category || '',
    reason: r.reason || '',
  }));

  // Stock alerts from API
  const stockAlertItems = apiStockAlerts.map((r: any) => ({
    product: r.product || r.product_name || '',
    status: r.status || '',
    qty: Number(r.qty) || 0,
    reorder: Number(r.reorder || r.reorder_level) || 0,
    lastSale: r.lastSale || r.last_sale || '',
  }));

  // Carrying cost from API
  const carryingCostItems = apiCarryingCost.map((r: any) => numericize({
    month: r.month || '',
    storageCost: Number(r.storageCost || r.storage_cost) || 0,
    insuranceCost: Number(r.insuranceCost || r.insurance_cost) || 0,
    obsolescenceCost: Number(r.obsolescenceCost || r.obsolescence_cost) || 0,
    financingCost: Number(r.financingCost || r.financing_cost) || 0,
    total: Number(r.total) || 0,
  }));

  // Optimization data from API
  const inventorySalesRatio = (Array.isArray(apiOptimization.sales_ratio) ? apiOptimization.sales_ratio : []).map((r: any) => numericize(r));
  const optimizationRecommendations = (Array.isArray(apiOptimization.recommendations) ? apiOptimization.recommendations : []).map((r: any) => numericize(r));

  // Forecast data from API
  const demandForecast = (Array.isArray(apiForecast.demand) ? apiForecast.demand : []).map((r: any) => numericize(r));
  const seasonalDemandIndex = (Array.isArray(apiForecast.seasonal) ? apiForecast.seasonal : []).map((r: any) => numericize(r));
  const forecastAccuracyByCategory = (Array.isArray(apiForecast.accuracy) ? apiForecast.accuracy : []).map((r: any) => numericize(r));
  const safetyStockAnalysis = (Array.isArray(apiForecast.safety_stock) ? apiForecast.safety_stock : []).map((r: any) => numericize(r));

  // Turnover & efficiency data from API
  const turnoverTrend = (Array.isArray(apiTurnover.trend) ? apiTurnover.trend : []).map((r: any) => numericize(r));
  const categoryEfficiency = (Array.isArray(apiTurnover.category) ? apiTurnover.category : apiEfficiency).map((r: any) => numericize(r));
  const velocitySegmentation = (Array.isArray(apiTurnover.velocity) ? apiTurnover.velocity : []).map((r: any) => numericize(r));
  const workingCapitalImpact = (Array.isArray(apiTurnover.working_capital) ? apiTurnover.working_capital : []).map((r: any) => numericize(r));
  const efficiencyRadar = (Array.isArray(apiTurnover.radar) ? apiTurnover.radar : []).map((r: any) => numericize(r));

  // Batch & lot tracking data from API
  const batchAgingDistribution = (Array.isArray(apiBatchDetail.aging) ? apiBatchDetail.aging : []).map((r: any) => numericize(r));
  const fifoComplianceData = (Array.isArray(apiBatchDetail.fifo) ? apiBatchDetail.fifo : []).map((r: any) => numericize(r));
  const lotProfitability = (Array.isArray(apiBatchDetail.lot_profitability) ? apiBatchDetail.lot_profitability : []).map((r: any) => numericize(r));
  const batchAnalysis = (Array.isArray(apiBatchDetail.batch_analysis) ? apiBatchDetail.batch_analysis : apiBatches).map((r: any) => numericize(r));

  // Investment & ROI data from API
  const investmentByCategory = (Array.isArray(apiInvestmentDetail.by_category) ? apiInvestmentDetail.by_category : Array.isArray(apiInvestment.by_category) ? apiInvestment.by_category : []).map((r: any) => numericize(r));
  const investmentBySupplier = (Array.isArray(apiInvestmentDetail.by_supplier) ? apiInvestmentDetail.by_supplier : []).map((r: any) => numericize(r));
  const investmentByLocation = (Array.isArray(apiInvestmentDetail.by_location) ? apiInvestmentDetail.by_location : Array.isArray(apiInvestment.by_location) ? apiInvestment.by_location : []).map((r: any) => numericize(r));
  const roiTrend = (Array.isArray(apiInvestmentDetail.roi_trend) ? apiInvestmentDetail.roi_trend : []).map((r: any) => numericize(r));
  const roiByVelocitySegment = (Array.isArray(apiInvestmentDetail.by_velocity) ? apiInvestmentDetail.by_velocity : []).map((r: any) => numericize(r));
  const investmentReturnScatter = (Array.isArray(apiInvestmentDetail.scatter) ? apiInvestmentDetail.scatter : []).map((r: any) => numericize(r));
  const capitalEfficiencyMetrics = (Array.isArray(apiInvestmentDetail.efficiency_metrics) ? apiInvestmentDetail.efficiency_metrics : []).map((r: any) => numericize(r));
  const investmentOptimizationPotential = (Array.isArray(apiInvestmentDetail.optimization) ? apiInvestmentDetail.optimization : []).map((r: any) => numericize(r));

  // Derive KPI values from API overview
  const totalStockValue = Number(apiOverview.total_value || apiOverview.total_stock_value) || 0;
  const totalItems = Number(apiOverview.total_items || apiOverview.total_qty) || 0;
  const fastMovingItems = Number(apiOverview.fast_moving_items || apiOverview.fast_moving) || 0;
  const stockOutAlerts = Number(apiOverview.stockout_alerts || apiOverview.stock_out_alerts) || 0;
  const nearExpiryValue = Number(apiOverview.near_expiry_value) || 0;
  const nearExpiryItems = Number(apiOverview.near_expiry_items) || 0;
  const inventoryTurnover = Number(apiOverview.inventory_turnover || apiOverview.turnover) || 0;
  const avgDsi = Number(apiOverview.avg_dsi || apiOverview.dsi) || 0;
  const carryingCostMonthly = Number(apiOverview.carrying_cost_monthly || apiOverview.carrying_cost) || 0;
  const writeOffsThisMonth = Number(apiOverview.write_offs || apiOverview.writeoffs_this_month) || 0;
  const stockoutLostSales = Number(apiOverview.stockout_lost_sales || apiOverview.lost_sales) || 0;
  const deadStockValue = Number(apiOverview.dead_stock_value) || 0;
  const optimizationPotential = Number(apiOverview.optimization_potential) || 0;

  const tabs = [
    { id: 'overview', label: 'Stock Overview' },
    { id: 'expiry', label: 'Expiry Management' },
    { id: 'movement', label: 'Movement Analysis' },
    { id: 'abc', label: 'ABC-VED Matrix' },
    { id: 'deadstock', label: 'Dead Stock & Costs' },
    { id: 'optimization', label: 'Optimization' },
    { id: 'forecast', label: 'Demand Forecasting' },
    { id: 'efficiency', label: 'Turnover & GMROI' },
    { id: 'batch', label: 'Batch Tracking' },
    { id: 'investment', label: 'Investment & ROI' },
  ];

  const handleChartClick = (data: any, dimension: string, detailPage: string = '/detail/inventory') => {
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

  const handleChartRightClick = (e: MouseEvent, page: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      page,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDrillThrough = (page: string, filter?: any) => {
    navigate(page, {
      state: {
        drillThrough: {
          from: 'Inventory Operations',
          filters: activeFilters.length > 0 ? activeFilters : filter ? [filter] : [],
        },
      },
    });
  };

  // Apply cross-filtering
  const filteredStockData = stockByCategoryData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.category)
  );

  const filteredMovementData = movementTrendData.filter((item: any) =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Operations</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Download Stock Report
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            Stock Adjustment
          </button>
        </div>
      </div>

      {/* P&L Impact Story Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-white to-red-50 rounded-lg border border-amber-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Inventory Impact on Profitability</h3>
          <span className="text-xs text-gray-500 ml-auto">How inventory decisions affect your bottom line</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-3 border border-red-100">
            <div className="text-[10px] text-gray-500 mb-1">Monthly Carrying Cost</div>
            <div className="text-sm font-bold text-red-700">{formatIndianCurrencyAbbreviated(carryingCostMonthly)}</div>
            <div className="text-[10px] text-red-500">Recurring monthly expense</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-red-100">
            <div className="text-[10px] text-gray-500 mb-1">Write-offs This Month</div>
            <div className="text-sm font-bold text-red-700">{formatIndianCurrencyAbbreviated(writeOffsThisMonth)}</div>
            <div className="text-[10px] text-red-500">Net profit impact</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-100">
            <div className="text-[10px] text-gray-500 mb-1">Stockout Lost Sales</div>
            <div className="text-sm font-bold text-amber-700">{formatIndianCurrencyAbbreviated(stockoutLostSales)}</div>
            <div className="text-[10px] text-amber-500">{stockOutAlerts} products out of stock</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-100">
            <div className="text-[10px] text-gray-500 mb-1">Dead Stock Value</div>
            <div className="text-sm font-bold text-amber-700">{formatIndianCurrencyAbbreviated(deadStockValue)}</div>
            <div className="text-[10px] text-amber-500">Capital locked for 90+ days</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="text-[10px] text-gray-500 mb-1">Optimization Potential</div>
            <div className="text-sm font-bold text-green-700">{formatIndianCurrencyAbbreviated(optimizationPotential)}</div>
            <div className="text-[10px] text-green-500">Recoverable through actions</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Total Stock Value"
          value={formatIndianCurrencyAbbreviated(totalStockValue)}
          subtitle={`${totalItems.toLocaleString('en-IN')} Items`}
          trend={{ value: '', direction: 'up' }}
          onClick={() => handleDrillThrough('/detail/inventory')}
          icon={<Package className="w-5 h-5 text-teal-600" />}
        />
        <KPICard
          title="Fast Moving Items"
          value={String(fastMovingItems)}
          subtitle={totalItems ? `${((fastMovingItems / totalItems) * 100).toFixed(1)}% of total` : ''}
          trend={{ value: '', direction: 'up' }}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        />
        <KPICard
          title="Stock Out Alerts"
          value={String(stockOutAlerts)}
          subtitle="Requires immediate action"
          trend={{ value: '', direction: 'down' }}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        />
        <KPICard
          title="Near Expiry"
          value={formatIndianCurrencyAbbreviated(nearExpiryValue)}
          subtitle={`${nearExpiryItems} items (0-90 days)`}
          trend={{ value: '', direction: 'down' }}
        />
        <KPICard
          title="Inventory Turnover"
          value={inventoryTurnover ? `${inventoryTurnover}x` : '--'}
          subtitle={avgDsi ? `Avg: ${avgDsi} days` : ''}
          trend={{ value: '', direction: 'up' }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="Stock Value by Category"
              onDrillThrough={() => handleDrillThrough('/detail/inventory')}
            >
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={filteredStockData}
                  onClick={(data) => handleChartClick(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Quantity') return value.toLocaleString('en-IN');
                      return `₹${(value / 100000).toFixed(2)}L`;
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="value"
                    fill="#0D9488"
                    name="Stock Value"
                    cursor="pointer"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="fastMoving"
                    fill="#4F46E5"
                    name="Fast Moving %"
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Stock Quantity by Category">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={filteredStockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="qty"
                    label={({ category, percent }) =>
                      `${category} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(entry) => {
                      addCrossFilter({
                        id: 'category',
                        label: `Category: ${entry.category}`,
                        value: entry.category,
                      });
                    }}
                  >
                    {filteredStockData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981'][index % 5]}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => value.toLocaleString('en-IN')} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Stock Alerts Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock Alerts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Current Qty</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Reorder Level</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Last Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAlertItems.map((alert) => (
                    <tr
                      key={alert.product}
                      onClick={() => {
                        addCrossFilter({
                          id: 'product',
                          label: `Product: ${alert.product}`,
                          value: alert.product,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{alert.product}</td>
                      <td className="py-2 px-2 text-center">
                        {alert.status === 'stockout' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Stock Out
                          </span>
                        )}
                        {alert.status === 'low' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Low Stock
                          </span>
                        )}
                        {alert.status === 'overstock' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Overstock
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {alert.qty.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">
                        {alert.reorder.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">{alert.lastSale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Expiry Management Tab */}
      {activeTab === 'expiry' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Expiry Distribution">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={expiryData}
                  onClick={(data) => handleChartClick(data, 'range')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Bar dataKey="value" cursor="pointer">
                    {expiryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || COLORS.safe} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Quantity Near Expiry">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expiryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="qty"
                    label={({ range, percent }) =>
                      `${range} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(entry) => {
                      addCrossFilter({
                        id: 'expiryRange',
                        label: `Expiry: ${entry.range}`,
                        value: entry.range,
                      });
                    }}
                  >
                    {expiryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.status as keyof typeof COLORS] || COLORS.safe}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Expiry Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Items Near Expiry</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Expiry Range</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Quantity</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryData.map((item) => (
                    <tr
                      key={item.range}
                      onClick={() => {
                        addCrossFilter({
                          id: 'expiryRange',
                          label: `Expiry: ${item.range}`,
                          value: item.range,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.range}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {item.qty.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.value / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-center">
                        {item.status === 'critical' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Critical
                          </span>
                        )}
                        {item.status === 'warning' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Warning
                          </span>
                        )}
                        {item.status === 'attention' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Attention
                          </span>
                        )}
                        {item.status === 'safe' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Safe
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Movement Analysis Tab */}
      {activeTab === 'movement' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Stock Movement Trend">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={filteredMovementData}
                  onClick={(data) => handleChartClick(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inbound"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Inbound"
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Outbound"
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Closing Stock Trend">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={filteredMovementData}
                  onClick={(data) => handleChartClick(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="closing"
                    stroke="#0D9488"
                    strokeWidth={3}
                    name="Closing Stock"
                    dot={{ fill: '#0D9488', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Movement Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock Movement</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Inbound</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Outbound</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Net Movement</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Closing Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {movementTrendData.map((item: any) => (
                    <tr
                      key={item.month}
                      onClick={() => {
                        addCrossFilter({
                          id: 'month',
                          label: `Month: ${item.month}`,
                          value: item.month,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-green-600">
                        +{Number(item.inbound).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        -{Number(item.outbound).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {(Number(item.inbound) - Number(item.outbound) > 0 ? '+' : '')}
                        {(Number(item.inbound) - Number(item.outbound)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                        {Number(item.closing).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ABC-VED Matrix Tab */}
      {activeTab === 'abc' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="ABC-VED Classification">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={abcVedMatrix}
                  onClick={(data) => handleChartClick(data, 'classification')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="classification" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                  <Bar dataKey="value" cursor="pointer">
                    {abcVedMatrix.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.status === 'high-priority' || entry.status === 'high'
                            ? '#EF4444'
                            : entry.status === 'medium'
                            ? '#F59E0B'
                            : '#10B981'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Items by Classification">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={abcVedMatrix}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="items"
                    label={({ classification, percent }) =>
                      `${classification} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(entry) => {
                      addCrossFilter({
                        id: 'classification',
                        label: `Class: ${entry.classification}`,
                        value: entry.classification,
                      });
                    }}
                  >
                    {abcVedMatrix.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#EF4444', '#F59E0B', '#F59E0B', '#3B82F6', '#3B82F6', '#10B981'][index % 6]}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* ABC-VED Matrix Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">ABC-VED Matrix Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Classification</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Items</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {abcVedMatrix.map((item) => (
                    <tr
                      key={item.classification}
                      onClick={() => {
                        addCrossFilter({
                          id: 'classification',
                          label: `Class: ${item.classification}`,
                          value: item.classification,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.classification}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {item.items.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.value / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-2 text-center">
                        {(item.status === 'high-priority' || item.status === 'high') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High
                          </span>
                        )}
                        {item.status === 'medium' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Medium
                          </span>
                        )}
                        {item.status === 'low' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Low
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Dead Stock & Carrying Cost Tab */}
      {activeTab === 'deadstock' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Dead Stock Analysis">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={deadStockItems}
                  onClick={(data) => handleChartClick(data, 'product')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Bar dataKey="value" cursor="pointer">
                    {deadStockItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#EF4444" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Carrying Cost Breakdown">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={carryingCostItems}
                  onClick={(data) => handleChartClick(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="storageCost"
                    stroke="#0D9488"
                    strokeWidth={2}
                    name="Storage Cost"
                    dot={{ fill: '#0D9488', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="insuranceCost"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    name="Insurance Cost"
                    dot={{ fill: '#4F46E5', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="obsolescenceCost"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Obsolescence Cost"
                    dot={{ fill: '#F59E0B', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="financingCost"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Financing Cost"
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Total Cost"
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Dead Stock Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Dead Stock Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Quantity</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Last Sold</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {deadStockItems.map((item) => (
                    <tr
                      key={item.product}
                      onClick={() => {
                        addCrossFilter({
                          id: 'product',
                          label: `Product: ${item.product}`,
                          value: item.product,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.product}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {item.qty.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.value / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">{item.lastSold}</td>
                      <td className="py-2 px-2 text-left text-gray-900">{item.category}</td>
                      <td className="py-2 px-2 text-left text-gray-900">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Stock Optimization Tab */}
      {activeTab === 'optimization' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Inventory-to-Sales Ratio">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={inventorySalesRatio}
                  onClick={(data) => handleChartClick(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Monthly Sales') return value.toLocaleString('en-IN');
                      return `₹${(value / 100000).toFixed(2)}L`;
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="inventoryValue"
                    fill="#0D9488"
                    name="Inventory Value"
                    cursor="pointer"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="monthlySales"
                    fill="#4F46E5"
                    name="Monthly Sales"
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Stock Optimization Recommendations">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={optimizationRecommendations}
                  onClick={(data) => handleChartClick(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Bar dataKey="potentialSaving" cursor="pointer">
                    {optimizationRecommendations.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.priority === 'high'
                            ? '#EF4444'
                            : entry.priority === 'medium'
                            ? '#F59E0B'
                            : '#10B981'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Optimization Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock Optimization Recommendations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Action</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Current Days</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Target Days</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Potential Saving</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Priority</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizationRecommendations.map((item: any) => (
                    <tr
                      key={item.action}
                      onClick={() => {
                        addCrossFilter({
                          id: 'category',
                          label: `Category: ${item.category}`,
                          value: item.category,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.action}</td>
                      <td className="py-2 px-2 text-left text-gray-900">{item.category}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {Number(item.currentDays).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {Number(item.targetDays).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(Number(item.potentialSaving) / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-center">
                        {item.priority === 'high' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High
                          </span>
                        )}
                        {item.priority === 'medium' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Medium
                          </span>
                        )}
                        {item.priority === 'low' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-left text-gray-900">{item.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================== DEMAND FORECASTING TAB ==================== */}
      {activeTab === 'forecast' && (
        <>
          {/* Forecast KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Forecast Accuracy" value={apiForecast.accuracy_pct ? `${apiForecast.accuracy_pct}%` : '--'} subtitle={apiForecast.mape ? `MAPE: ${apiForecast.mape}%` : ''} trend={{ value: '', direction: 'up' }} icon={<Target className="w-5 h-5 text-teal-600" />} />
            <KPICard title="Next Month Demand" value={apiForecast.next_month_demand ? apiForecast.next_month_demand.toLocaleString('en-IN') : '--'} subtitle={apiForecast.next_month_label || ''} trend={{ value: '', direction: 'up' }} icon={<TrendingUp className="w-5 h-5 text-indigo-600" />} />
            <KPICard title="Seasonal Peak" value={apiForecast.seasonal_peak || '--'} subtitle={apiForecast.seasonal_peak_note || ''} trend={{ value: '', direction: 'up' }} />
            <KPICard title="Reorder Alerts" value={apiForecast.reorder_alerts ? `${apiForecast.reorder_alerts} SKUs` : '--'} subtitle={apiForecast.reorder_note || ''} trend={{ value: '', direction: 'up' }} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} />
            <KPICard title="Overstock Risk" value={apiForecast.overstock_risk ? formatIndianCurrencyAbbreviated(apiForecast.overstock_risk) : '--'} subtitle={apiForecast.overstock_note || ''} trend={{ value: '', direction: 'down' }} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Demand Forecast vs Actual (with Confidence Band)" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={demandForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="upper" stackId="band" stroke="none" fill="#0D9488" fillOpacity={0.1} name="Upper Bound" />
                    <Area type="monotone" dataKey="lower" stackId="band2" stroke="none" fill="#ffffff" fillOpacity={0} name="Lower Bound" />
                    <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={3} name="Actual" dot={{ fill: '#0D9488', r: 5 }} connectNulls={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#4F46E5" strokeWidth={2} strokeDasharray="8 4" name="Forecast" dot={{ fill: '#4F46E5', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Seasonal Demand Index (Monthly Pattern)">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={seasonalDemandIndex}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[80, 130]} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                            <p className="font-semibold text-gray-900">{d.month}</p>
                            <p className="text-gray-600">Index: {d.index} ({d.index > 100 ? 'Above' : 'Below'} avg)</p>
                            <p className="text-gray-600">Peak Category: {d.peakCategory}</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="index" name="Seasonal Index" cursor="pointer">
                      {seasonalDemandIndex.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.index >= 110 ? '#EF4444' : entry.index >= 100 ? '#F59E0B' : '#0D9488'} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey={() => 100} stroke="#9CA3AF" strokeWidth={1} strokeDasharray="4 4" name="Baseline (100)" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Forecast Accuracy by Category */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Forecast Accuracy by Category">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={forecastAccuracyByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} domain={[85, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Bar dataKey="accuracy" name="Accuracy %" cursor="pointer">
                      {forecastAccuracyByCategory.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.accuracy >= 95 ? '#10B981' : entry.accuracy >= 93 ? '#F59E0B' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Forecast Accuracy Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">MAPE</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Bias</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastAccuracyByCategory.map((item: any) => (
                      <tr key={item.category} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                        onClick={() => addCrossFilter({ id: 'category', label: `Category: ${item.category}`, value: item.category })}>
                        <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                        <td className="py-2 px-2 text-right"><span className={item.mape <= 5 ? 'text-green-600' : item.mape <= 7 ? 'text-amber-600' : 'text-red-600'}>{item.mape}%</span></td>
                        <td className="py-2 px-2 text-right"><span className={Math.abs(item.bias) <= 1 ? 'text-green-600' : 'text-amber-600'}>{item.bias > 0 ? '+' : ''}{item.bias}%</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.accuracy >= 95 ? 'text-green-600 font-medium' : item.accuracy >= 93 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>{item.accuracy}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Safety Stock & Reorder Point Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Safety Stock & Reorder Point Analysis</h3>
              <div className="flex gap-2 text-[10px]">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">Stockout</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">Below ROP</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">Healthy</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">Overstock</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Daily Demand</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Lead Time (days)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Service Level</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Safety Stock</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Reorder Point</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Current Stock</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safetyStockAnalysis.map((item: any) => (
                    <tr key={item.product} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      onClick={() => addCrossFilter({ id: 'product', label: `Product: ${item.product}`, value: item.product })}>
                      <td className="py-2 px-2 font-medium text-gray-900">{item.product}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{item.avgDemand}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{item.leadTime}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{item.serviceLevel}%</td>
                      <td className="py-2 px-2 text-right text-gray-900 font-medium">{item.safetyStock}</td>
                      <td className="py-2 px-2 text-right text-indigo-600 font-medium">{item.reorderPoint}</td>
                      <td className="py-2 px-2 text-right font-medium">
                        <span className={item.currentStock === 0 ? 'text-red-600' : item.currentStock < item.reorderPoint ? 'text-amber-600' : 'text-gray-900'}>
                          {Number(item.currentStock).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.status === 'stockout' ? 'bg-red-100 text-red-800' :
                          item.status === 'below-rop' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'overstock' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.status === 'stockout' ? 'STOCKOUT' : item.status === 'below-rop' ? 'Below ROP' : item.status === 'overstock' ? 'Overstock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================== TURNOVER & GMROI TAB ==================== */}
      {activeTab === 'efficiency' && (
        <>
          {/* Efficiency KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Avg Turnover" value={apiTurnover.avg_turnover ? `${apiTurnover.avg_turnover}x` : '--'} subtitle={apiTurnover.turnover_target ? `Target: ${apiTurnover.turnover_target}x` : ''} trend={{ value: '', direction: 'up' }} icon={<Activity className="w-5 h-5 text-teal-600" />} />
            <KPICard title="GMROI (Overall)" value={apiTurnover.gmroi ? String(apiTurnover.gmroi) : '--'} subtitle={apiTurnover.gmroi ? `₹${apiTurnover.gmroi} GP per ₹1 invested` : ''} trend={{ value: '', direction: 'up' }} icon={<DollarSign className="w-5 h-5 text-green-600" />} />
            <KPICard title="Days Sales Inventory" value={apiTurnover.avg_dsi ? `${apiTurnover.avg_dsi} days` : '--'} subtitle={apiTurnover.industry_dsi ? `Industry avg: ${apiTurnover.industry_dsi}` : ''} trend={{ value: '', direction: 'down' }} />
            <KPICard title="Fill Rate" value={apiTurnover.fill_rate ? `${apiTurnover.fill_rate}%` : '--'} subtitle={apiTurnover.fill_rate_target ? `Target: ${apiTurnover.fill_rate_target}%` : ''} trend={{ value: '', direction: 'up' }} />
            <KPICard title="Working Capital Excess" value={apiTurnover.working_capital_excess ? formatIndianCurrencyAbbreviated(apiTurnover.working_capital_excess) : '--'} subtitle={apiTurnover.annual_waste ? `${formatIndianCurrencyAbbreviated(apiTurnover.annual_waste)} annual waste` : ''} trend={{ value: '', direction: 'down' }} icon={<Zap className="w-5 h-5 text-amber-600" />} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Turnover & GMROI Trend" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={turnoverTrend} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="turnover" fill="#0D9488" name="Turnover (x)" cursor="pointer" />
                    <Bar yAxisId="left" dataKey="gmroi" fill="#4F46E5" name="GMROI" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="fillRate" stroke="#F59E0B" strokeWidth={2} name="Fill Rate %" dot={{ fill: '#F59E0B', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Category Efficiency Radar">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={efficiencyRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Tablets" dataKey="Tablets" stroke="#0D9488" fill="#0D9488" fillOpacity={0.15} />
                    <Radar name="Syrups" dataKey="Syrups" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.15} />
                    <Radar name="Ointments" dataKey="Ointments" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
                    <Radar name="Injections" dataKey="Injections" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Category Efficiency Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Category-wise Inventory Efficiency Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Turnover (x)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">DSI (days)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">GMROI</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Fill Rate</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Stockout Days</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Working Capital</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryEfficiency.map((item: any) => {
                    const health = item.gmroi >= 3 ? 'excellent' : item.gmroi >= 2 ? 'good' : item.gmroi >= 1 ? 'fair' : 'poor';
                    return (
                      <tr key={item.category} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                        onClick={() => addCrossFilter({ id: 'category', label: `Category: ${item.category}`, value: item.category })}>
                        <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                        <td className="py-2 px-2 text-right"><span className={item.turnover >= 8 ? 'text-green-600 font-medium' : item.turnover >= 5 ? 'text-amber-600' : 'text-red-600'}>{item.turnover}x</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.dsi <= 45 ? 'text-green-600' : item.dsi <= 90 ? 'text-amber-600' : 'text-red-600 font-medium'}>{item.dsi}</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.gmroi >= 3 ? 'text-green-600 font-medium' : item.gmroi >= 2 ? 'text-amber-600' : 'text-red-600 font-medium'}>{Number(item.gmroi).toFixed(2)}</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.fillRate >= 95 ? 'text-green-600' : item.fillRate >= 90 ? 'text-amber-600' : 'text-red-600'}>{item.fillRate}%</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.stockoutDays <= 3 ? 'text-green-600' : item.stockoutDays <= 7 ? 'text-amber-600' : 'text-red-600'}>{item.stockoutDays}</span></td>
                        <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item.workingCapital) / 100000).toFixed(2)}L</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            health === 'excellent' ? 'bg-green-100 text-green-800' :
                            health === 'good' ? 'bg-teal-100 text-teal-800' :
                            health === 'fair' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {health === 'excellent' ? 'Excellent' : health === 'good' ? 'Good' : health === 'fair' ? 'Fair' : 'Poor'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Velocity Segmentation + Working Capital */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Inventory Velocity Segmentation</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Segment</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">SKUs</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Contribution</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Avg DSI</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">GMROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {velocitySegmentation.map((seg: any) => (
                      <tr key={seg.segment} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                        onClick={() => addCrossFilter({ id: 'velocity', label: `Velocity: ${seg.segment}`, value: seg.segment })}>
                        <td className="py-2 px-2 font-medium text-gray-900">{seg.segment}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{seg.skus}</td>
                        <td className="py-2 px-2 text-right text-gray-900">₹{(Number(seg.revenue) / 100000).toFixed(2)}L</td>
                        <td className="py-2 px-2 text-right font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${seg.contribution}%` }} />
                            </div>
                            <span className="text-gray-900">{seg.contribution}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right"><span className={seg.avgDSI <= 25 ? 'text-green-600' : seg.avgDSI <= 50 ? 'text-amber-600' : 'text-red-600'}>{seg.avgDSI}</span></td>
                        <td className="py-2 px-2 text-right"><span className={seg.gmroi >= 5 ? 'text-green-600 font-medium' : seg.gmroi >= 3 ? 'text-amber-600' : 'text-red-600'}>{Number(seg.gmroi).toFixed(2)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Working Capital Impact Analysis</h3>
              <div className="space-y-3">
                {workingCapitalImpact.map((item: any, index: number) => {
                  const isTotal = index === workingCapitalImpact.length - 1;
                  const isNegative = (item.item || '').includes('Excess') || (item.item || '').includes('Cost') || (item.item || '').includes('Waste') || (item.item || '').includes('Opportunity');
                  return (
                    <div key={item.item} className={`flex items-center justify-between ${isTotal ? 'border-t-2 border-gray-300 pt-3' : ''}`}>
                      <span className={`text-sm ${isTotal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{item.item}</span>
                      <span className={`text-sm font-medium ${isTotal ? 'text-red-700 font-bold' : isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                        ₹{(Number(item.value) / 100000).toFixed(2)}L
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== BATCH & LOT TRACKING TAB ==================== */}
      {activeTab === 'batch' && (
        <>
          {/* Batch KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Active Batches" value={apiBatchDetail.active_batches ? String(apiBatchDetail.active_batches) : '--'} subtitle={apiBatchDetail.total_skus ? `Across ${apiBatchDetail.total_skus} SKUs` : ''} trend={{ value: '', direction: 'up' }} icon={<Package className="w-5 h-5 text-teal-600" />} />
            <KPICard title="FIFO Compliance" value={apiBatchDetail.fifo_compliance ? `${apiBatchDetail.fifo_compliance}%` : '--'} subtitle={apiBatchDetail.non_compliant_pct ? `${apiBatchDetail.non_compliant_pct}% non-compliant` : ''} trend={{ value: '', direction: 'down' }} />
            <KPICard title="Waste from Non-FIFO" value={apiBatchDetail.waste_from_non_fifo ? formatIndianCurrencyAbbreviated(apiBatchDetail.waste_from_non_fifo) : '--'} subtitle="This month" trend={{ value: '', direction: 'down' }} />
            <KPICard title="Avg Batch Margin" value={apiBatchDetail.avg_batch_margin ? `${apiBatchDetail.avg_batch_margin}%` : '--'} subtitle="Across all lots" trend={{ value: '', direction: 'up' }} />
            <KPICard title="Supplier Quality" value={apiBatchDetail.supplier_quality_score ? String(apiBatchDetail.supplier_quality_score) : '--'} subtitle="Weighted avg score" trend={{ value: '', direction: 'up' }} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Batch Aging Distribution (by Value)" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={batchAgingDistribution} onClick={(data) => handleChartClick(data, 'ageRange')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="ageRange" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Avg Margin %' ? `${value}%` : name === 'Batches' ? value : `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="value" name="Inventory Value" cursor="pointer">
                      {batchAgingDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index < 2 ? '#10B981' : index < 3 ? '#F59E0B' : '#EF4444'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="avgMargin" stroke="#4F46E5" strokeWidth={2} name="Avg Margin %" dot={{ fill: '#4F46E5', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="FIFO Compliance Trend">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={fifoComplianceData} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={[80, 100]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Waste Cost' ? `₹${(value / 1000).toFixed(1)}K` : `${value}%`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="compliant" fill="#10B981" name="FIFO Compliant %" stackId="a" />
                    <Bar yAxisId="left" dataKey="nonCompliant" fill="#EF4444" name="Non-Compliant %" stackId="a" />
                    <Line yAxisId="right" type="monotone" dataKey="wasteFromNonFIFO" stroke="#F59E0B" strokeWidth={2} name="Waste Cost" dot={{ fill: '#F59E0B', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Lot Profitability by Supplier */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Supplier Lot Profitability & Quality Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Active Lots</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Margin</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Turnover</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Quality Score</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Return Rate</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {lotProfitability.map((item: any) => {
                    const score = (Number(item.avgMargin) * 0.3) + (Number(item.avgTurnover) * 2) + (Number(item.qualityScore) * 0.3) - (Number(item.returnRate) * 10);
                    const rating = score >= 55 ? 'A' : score >= 45 ? 'B' : 'C';
                    return (
                      <tr key={item.supplier} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                        onClick={() => addCrossFilter({ id: 'supplier', label: `Supplier: ${item.supplier}`, value: item.supplier })}>
                        <td className="py-2 px-2 font-medium text-gray-900">{item.supplier}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{item.lots}</td>
                        <td className="py-2 px-2 text-right"><span className={item.avgMargin >= 37 ? 'text-green-600 font-medium' : 'text-gray-900'}>{item.avgMargin}%</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.avgTurnover >= 10 ? 'text-green-600' : item.avgTurnover >= 7 ? 'text-amber-600' : 'text-red-600'}>{item.avgTurnover}x</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.qualityScore >= 97 ? 'text-green-600 font-medium' : item.qualityScore >= 95 ? 'text-amber-600' : 'text-red-600'}>{item.qualityScore}</span></td>
                        <td className="py-2 px-2 text-right"><span className={item.returnRate <= 1 ? 'text-green-600' : item.returnRate <= 1.5 ? 'text-amber-600' : 'text-red-600'}>{item.returnRate}%</span></td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rating === 'A' ? 'bg-green-100 text-green-800' : rating === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>{rating}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch Detail Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Batch-Level Inventory Detail</h3>
              <div className="flex gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 text-green-700"><span className="w-2 h-2 rounded-full bg-green-500" /> FIFO OK</span>
                <span className="inline-flex items-center gap-1 text-red-700"><span className="w-2 h-2 rounded-full bg-red-500" /> FIFO Breach</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Batch #</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Receipt</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Expiry</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Received</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Sold</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Remaining</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Margin</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">FIFO</th>
                  </tr>
                </thead>
                <tbody>
                  {batchAnalysis.map((batch: any) => {
                    const sellThrough = batch.qtyReceived ? ((Number(batch.qtySold) / Number(batch.qtyReceived)) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={batch.batchNo} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                        onClick={() => addCrossFilter({ id: 'batch', label: `Batch: ${batch.batchNo}`, value: batch.batchNo })}>
                        <td className="py-2 px-2 font-mono text-gray-600">{batch.batchNo}</td>
                        <td className="py-2 px-2 font-medium text-gray-900">{batch.product}</td>
                        <td className="py-2 px-2 text-gray-600">{batch.supplier}</td>
                        <td className="py-2 px-2 text-gray-600">{batch.receiptDate}</td>
                        <td className="py-2 px-2 text-gray-600">{batch.expiryDate}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{Number(batch.qtyReceived).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{Number(batch.qtySold).toLocaleString('en-IN')} <span className="text-gray-400">({sellThrough}%)</span></td>
                        <td className="py-2 px-2 text-right"><span className={Number(batch.qtyRemaining) > 1000 ? 'text-amber-600 font-medium' : 'text-gray-900'}>{Number(batch.qtyRemaining).toLocaleString('en-IN')}</span></td>
                        <td className="py-2 px-2 text-right"><span className="text-green-600 font-medium">{batch.margin}%</span></td>
                        <td className="py-2 px-2 text-center">
                          {batch.fifoCompliant ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">OK</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">X</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================== INVESTMENT & ROI TAB ==================== */}
      {activeTab === 'investment' && (
        <>
          {/* Investment KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Total Inventory Investment" value={formatIndianCurrencyAbbreviated(totalStockValue)} subtitle="As of today" trend={{ value: '', direction: 'up' }} icon={<DollarSign className="w-5 h-5 text-teal-600" />} />
            <KPICard title="Monthly ROI" value={apiInvestmentDetail.monthly_roi ? `${apiInvestmentDetail.monthly_roi}%` : '--'} subtitle={apiInvestmentDetail.annualized_roi ? `Annualized: ${apiInvestmentDetail.annualized_roi}%` : ''} trend={{ value: '', direction: 'up' }} icon={<TrendingUp className="w-5 h-5 text-green-600" />} />
            <KPICard title="GMROI" value={apiInvestmentDetail.gmroi ? `${apiInvestmentDetail.gmroi}x` : '--'} subtitle={apiInvestmentDetail.gmroi ? `Gross margin per ₹1 invested` : ''} trend={{ value: '', direction: 'up' }} />
            <KPICard title="Payback Period" value={apiInvestmentDetail.payback_days ? `${apiInvestmentDetail.payback_days} days` : '--'} subtitle="Avg across all categories" trend={{ value: '', direction: 'down' }} />
            <KPICard title="Capital Locked (Dead)" value={formatIndianCurrencyAbbreviated(deadStockValue)} subtitle="No movement 90+ days" trend={{ value: '', direction: 'up' }} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} />
          </div>

          {/* Investment Story Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-white to-teal-50 rounded-lg border border-blue-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Investment Efficiency Insights</h3>
              <span className="text-xs text-gray-500 ml-auto">How efficiently is your capital working</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="text-[10px] text-gray-500 mb-1">Best ROI Category</div>
                <div className="text-sm font-bold text-green-700">{apiInvestmentDetail.best_roi_category || '--'}</div>
                <div className="text-[10px] text-green-500">{apiInvestmentDetail.best_roi_note || ''}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-red-100">
                <div className="text-[10px] text-gray-500 mb-1">Worst ROI Category</div>
                <div className="text-sm font-bold text-red-700">{apiInvestmentDetail.worst_roi_category || '--'}</div>
                <div className="text-[10px] text-red-500">{apiInvestmentDetail.worst_roi_note || ''}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="text-[10px] text-gray-500 mb-1">Optimization Potential</div>
                <div className="text-sm font-bold text-blue-700">{formatIndianCurrencyAbbreviated(optimizationPotential)}</div>
                <div className="text-[10px] text-blue-500">Excess capital locked</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="text-[10px] text-gray-500 mb-1">Annual Opportunity Cost</div>
                <div className="text-sm font-bold text-amber-700">{apiInvestmentDetail.annual_opportunity_cost ? formatIndianCurrencyAbbreviated(apiInvestmentDetail.annual_opportunity_cost) : '--'}</div>
                <div className="text-[10px] text-amber-500">{apiInvestmentDetail.opportunity_cost_note || ''}</div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Investment Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Investment by Category (with ROI)" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={investmentByCategory} onClick={(data) => handleChartClick(data, 'category')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'ROI %' ? `${value}%` : `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="investment" name="Investment" fill="#0D9488" cursor="pointer" />
                    <Bar yAxisId="left" dataKey="monthlyProfit" name="Monthly Profit" fill="#10B981" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#EF4444" strokeWidth={2} name="ROI %" dot={{ fill: '#EF4444', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Investment vs Return Scatter (Bubble = Turnover)" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" dataKey="investment" name="Investment" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <YAxis type="number" dataKey="monthlyReturn" name="Monthly Return" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <ZAxis type="number" dataKey="size" range={[100, 800]} />
                    <Tooltip
                      content={(props: any) => {
                        if (props.active && props.payload && props.payload[0]) {
                          const d = props.payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                              <div className="font-semibold text-gray-900 mb-1">{d.category}</div>
                              <div className="text-gray-600">Investment: ₹{(Number(d.investment) / 100000).toFixed(2)}L</div>
                              <div className="text-gray-600">Monthly Return: ₹{(Number(d.monthlyReturn) / 100000).toFixed(2)}L</div>
                              <div className="text-green-600 font-semibold">ROI: {d.roi}%</div>
                              <div className="text-blue-600">Turnover: {d.size}x</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={investmentReturnScatter} fill="#0D9488" onClick={(data: any) => addCrossFilter({ id: 'category', label: `Category: ${data.category}`, value: data.category })} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2: ROI Trends */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="ROI Trend" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={roiTrend} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip formatter={(value: any, name: string) => name.includes('ROI') ? `${value}%` : `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="roi" name="Monthly ROI %" fill="#0D9488" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="monthlyProfit" stroke="#10B981" strokeWidth={2} name="Monthly Profit" dot={{ fill: '#10B981', r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="investmentValue" stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" name="Investment Value" dot={{ fill: '#6B7280', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="ROI by Velocity Segment" onDrillThrough={() => handleDrillThrough('/detail/inventory')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/inventory')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={roiByVelocitySegment} onClick={(data) => handleChartClick(data, 'segment')} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="segment" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any, name: string) => name === 'ROI %' || name === 'Profit %' ? `${value}%` : name === 'Payback' ? `${value} days` : `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar dataKey="roi" name="ROI %" fill="#0D9488" cursor="pointer" />
                    <Bar dataKey="contributionToProfit" name="Profit %" fill="#10B981" cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Investment by Supplier Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Investment by Supplier (ROI Analysis)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Investment</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Monthly Return</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">ROI %</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Margin</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Turnover</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">SKUs</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentBySupplier.map((item: any) => (
                    <tr key={item.supplier} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      onClick={() => addCrossFilter({ id: 'supplier', label: `Supplier: ${item.supplier}`, value: item.supplier })}>
                      <td className="py-2 px-2 font-medium text-gray-900">{item.supplier}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item.investment) / 100000).toFixed(2)}L</td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">₹{(Number(item.monthlyReturn) / 1000).toFixed(0)}K</td>
                      <td className="py-2 px-2 text-right"><span className={item.roi >= 15 ? 'text-green-600 font-bold' : item.roi >= 14 ? 'text-amber-600' : 'text-red-600'}>{item.roi}%</span></td>
                      <td className="py-2 px-2 text-right text-gray-900">{item.avgMargin}%</td>
                      <td className="py-2 px-2 text-right"><span className={item.turnover >= 10 ? 'text-green-600' : 'text-gray-900'}>{item.turnover}x</span></td>
                      <td className="py-2 px-2 text-right text-gray-600">{item.skus}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.roi >= 15.5 ? 'bg-green-100 text-green-800' : item.roi >= 14.5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>{item.roi >= 15.5 ? 'High' : item.roi >= 14.5 ? 'Medium' : 'Low'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Investment by Location Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Investment by Location (Store-wise ROI)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Location</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Investment</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Monthly Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Monthly Profit</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">ROI %</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Efficiency %</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentByLocation.map((item: any) => (
                    <tr key={item.location} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      onClick={() => addCrossFilter({ id: 'location', label: `Location: ${item.location}`, value: item.location })}>
                      <td className="py-2 px-2 font-medium text-gray-900">{item.location}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item.investment) / 100000).toFixed(2)}L</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item.monthlyRevenue) / 100000).toFixed(2)}L</td>
                      <td className="py-2 px-2 text-right"><span className={Number(item.monthlyProfit) > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>₹{(Number(item.monthlyProfit) / 1000).toFixed(0)}K</span></td>
                      <td className="py-2 px-2 text-right"><span className={item.roi >= 14 ? 'text-green-600 font-bold' : item.roi > 0 ? 'text-amber-600' : 'text-red-600 font-bold'}>{Number(item.roi).toFixed(2)}%</span></td>
                      <td className="py-2 px-2 text-right"><span className={item.efficiency >= 90 ? 'text-green-600' : item.efficiency >= 80 ? 'text-amber-600' : 'text-gray-600'}>{item.efficiency}%</span></td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.roi >= 14 ? 'bg-green-100 text-green-800' : item.roi > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>{item.roi >= 14 ? 'Profitable' : item.roi > 0 ? 'Underperforming' : 'Loss'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Capital Efficiency Metrics */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Capital Efficiency Metrics vs Industry Benchmarks</h3>
            <div className="space-y-3">
              {capitalEfficiencyMetrics.map((item: any) => {
                const percentDiff = item.benchmark ? ((Number(item.value) - Number(item.benchmark)) / Number(item.benchmark) * 100).toFixed(1) : '0.0';
                return (
                  <div key={item.metric} className="flex items-center gap-4">
                    <div className="w-1/3 text-xs text-gray-700">{item.metric}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-xs font-semibold text-gray-900">{item.value}{item.unit}</div>
                        <div className="text-xs text-gray-500">vs {item.benchmark}{item.unit}</div>
                        <div className={`text-xs font-medium ${item.status === 'below' && (item.metric || '').includes('Days') ? 'text-red-600' : item.status === 'below' ? 'text-red-600' : item.status === 'above' && (item.metric || '').includes('Days') ? 'text-red-600' : 'text-green-600'}`}>
                          {item.status === 'below' && (item.metric || '').includes('Days') ? `${Math.abs(parseFloat(percentDiff))}%` : item.status === 'below' ? `${Math.abs(parseFloat(percentDiff))}%` : `${Math.abs(parseFloat(percentDiff))}%`}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${(item.status === 'below' && !(item.metric || '').includes('Days')) || (item.status === 'above' && (item.metric || '').includes('Days')) ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${item.benchmark ? Math.min((Number(item.value) / Number(item.benchmark)) * 100, 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Investment Optimization Opportunities */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Investment Optimization Opportunities</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Optimization Action</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Current Investment</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Target Investment</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Capital Impact</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Profit Impact</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Net Benefit</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentOptimizationPotential.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-2 px-2 font-medium text-gray-900">{item.action}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item.currentInvestment) / 100000).toFixed(2)}L</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item.targetInvestment) / 100000).toFixed(2)}L</td>
                      <td className="py-2 px-2 text-right">
                        <span className={Number(item.capitalFreed) > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {Number(item.capitalFreed) > 0 ? '+' : ''}₹{(Math.abs(Number(item.capitalFreed)) / 100000).toFixed(2)}L
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={Number(item.impactOnProfit) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {Number(item.impactOnProfit) >= 0 ? '+' : ''}₹{(Math.abs(Number(item.impactOnProfit)) / 1000).toFixed(0)}K
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={Number(item.netBenefit) > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {Number(item.netBenefit) > 0 ? '+' : ''}₹{(Math.abs(Number(item.netBenefit)) / 100000).toFixed(2)}L
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          Number(item.netBenefit) > 500000 ? 'bg-green-100 text-green-800' : Number(item.netBenefit) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>{Number(item.netBenefit) > 500000 ? 'High' : Number(item.netBenefit) > 0 ? 'Medium' : 'Consider'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{
            from: 'Inventory Operations',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};
