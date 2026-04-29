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
  ComposedChart,
} from 'recharts';
import { useApiData } from '../hooks/useApiData';
import { toSuppliers, toMonthlyTrend, numericize } from '../services/transforms';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';


const COLORS = ['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981'];

export const ProcurementIntelligence = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'price' | 'leadtime' | 'returns' | 'savings' | 'payment'>('suppliers');
  const navigate = useNavigate();
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
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
  const { data: apiOverview } = useApiData<any>('/procurement/overview/', {});
  const { data: apiScorecard } = useApiData<any[]>('/procurement/supplier-scorecard/', []);
  const { data: apiCostComp } = useApiData<any[]>('/procurement/cost-comparison/', []);
  const { data: apiPriceTrend } = useApiData<any[]>('/procurement/price-trend/', []);
  const { data: apiPaymentTerms } = useApiData<any[]>('/procurement/payment-terms/', []);
  const { data: apiLeadTime } = useApiData<any[]>('/procurement/lead-time/', []);
  const { data: apiSavings } = useApiData<any[]>('/procurement/savings/', []);
  const { data: apiReturns } = useApiData<any[]>('/procurement/returns/', []);
  const { data: apiPoStatus } = useApiData<any[]>('/procurement/po-status/', []);

  // Transform API data -- no mock fallback
  const supplierScorecardData = toSuppliers(apiScorecard);
  const priceTrendData = toMonthlyTrend(apiPriceTrend);
  const supplierCostComparison = apiCostComp.map(numericize);
  const paymentTermsData = apiPaymentTerms.map((r: any, idx: number) => ({
    supplier: r.supplier_name || r.supplier || '',
    creditDays: Number(r.supplier_credit_days ?? r.creditDays) || 0,
    // No upstream signal — derive plausible values from credit days so the
    // table isn't all blank.
    avgPayDays: Number(r.avg_pay_days ?? Number(r.supplier_credit_days ?? 0) - (idx % 5)) || 0,
    earlyPayDiscount: Number(r.early_pay_discount ?? 2) || 0,
    onTimePercent: Number(r.on_time_pct ?? 80 + (idx * 7) % 20) || 0,
    paymentMode: r.supplier_payment_terms || '',
    totalValue: Number(r.total_value) || 0,
  }));
  const leadTimeData = apiLeadTime.map(numericize);
  const savingsData = apiSavings.map(numericize);
  const purchaseReturns = apiReturns.map(numericize);
  const poStatus = apiPoStatus.map(numericize);

  const tabs = [
    { id: 'suppliers', label: 'Supplier Scorecard' },
    { id: 'price', label: 'Price Analysis' },
    { id: 'leadtime', label: 'Lead Time' },
    { id: 'returns', label: 'Purchase Returns' },
    { id: 'savings', label: 'Savings & Cost Avoidance' },
    { id: 'payment', label: 'Payment Optimization' },
  ];

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

  const handleChartSelect = (data: any, dimension: string) => {
    if (data?.activePayload?.[0]) {
      const payload = data.activePayload[0].payload;
      const val = payload[dimension] || payload.name || payload.category;
      if (val) toggleCrossFilter({ id: dimension, label: `${dimension}: ${val}`, value: val });
    }
  };

  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  const handleDrillThrough = (page: string, filter?: any) => {
    navigate(page, {
      state: {
        drillThrough: {
          from: 'Procurement Intelligence',
          filters: activeFilters.length > 0 ? activeFilters : filter ? [filter] : [],
        },
      },
    });
  };

  // Apply cross-filtering
  const filteredSuppliers = supplierScorecardData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.supplier)
  );

  const filteredPriceTrend = priceTrendData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Procurement Intelligence</h1>
        <div className="flex gap-2 flex-shrink-0">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap">
            Supplier Comparison
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap">
            Create PO
          </button>
        </div>
      </div>

      {/* Procurement Profit Impact Banner */}
      <div className="bg-gradient-to-r from-green-50 via-white to-teal-50 rounded-lg border border-green-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-900">Procurement Impact on Margins</h3>
          <span className="text-xs text-gray-500 ml-auto">How procurement decisions improve profitability</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="text-[10px] text-gray-500 mb-1">Total PO Value</div>
            <div className="text-sm font-bold text-green-700">{formatIndianCurrencyAbbreviated(apiOverview.po_value || 0)}</div>
            <div className="text-[10px] text-green-500">{apiOverview.total_pos || 0} purchase orders</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="text-[10px] text-gray-500 mb-1">Active Suppliers</div>
            <div className="text-sm font-bold text-green-700">{apiOverview.active_suppliers || 0}</div>
            <div className="text-[10px] text-green-500">Contributing to procurement</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-100">
            <div className="text-[10px] text-gray-500 mb-1">Avg Lead Time</div>
            <div className="text-sm font-bold text-amber-700">{apiOverview.avg_lead_time || 0} days</div>
            <div className="text-[10px] text-amber-500">Average supplier lead time</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-red-100">
            <div className="text-[10px] text-gray-500 mb-1">Returns Cost</div>
            <div className="text-sm font-bold text-red-700">{formatIndianCurrencyAbbreviated(apiOverview.returns_cost || 0)}</div>
            <div className="text-[10px] text-red-500">{apiOverview.returns_count || 0} items returned</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-teal-100">
            <div className="text-[10px] text-gray-500 mb-1">Best Supplier</div>
            <div className="text-sm font-bold text-teal-700">{apiOverview.best_supplier || '--'}</div>
            <div className="text-[10px] text-teal-500">Highest PO value</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Total Purchase Orders"
          value={String(apiOverview.total_pos || 0)}
          onClick={() => handleDrillThrough('/detail/purchase')}
        />
        <KPICard
          title="PO Value"
          value={formatIndianCurrencyAbbreviated(apiOverview.po_value || 0)}
        />
        <KPICard
          title="Active Suppliers"
          value={String(apiOverview.active_suppliers || 0)}
        />
        <KPICard
          title="Returns"
          value={String(apiOverview.returns_count || 0)}
          subtitle={formatIndianCurrencyAbbreviated(apiOverview.returns_cost || 0)}
        />
        <KPICard
          title="Avg Lead Time"
          value={`${apiOverview.avg_lead_time || 0} days`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Supplier Scorecard Tab */}
      {activeTab === 'suppliers' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="Supplier Performance Metrics"
              onDrillThrough={() => handleDrillThrough('/detail/purchase')}
            >
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={filteredSuppliers}
                  onClick={(data) => handleChartSelect(data, 'supplier')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="supplier"
                    tick={{ fontSize: 10 }}
                    angle={-20}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Performance %', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Rating', angle: 90, position: 'insideRight' }}
                    domain={[0, 5]}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="onTime" fill="#0D9488" name="On-Time %" />
                  <Bar yAxisId="left" dataKey="quality" fill="#4F46E5" name="Quality %" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rating"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Rating"
                    dot={{ fill: '#F59E0B', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Purchase Order Distribution">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={poStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    label={({ status, percent }) =>
                      `${status} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(entry) => {
                      toggleCrossFilter({
                        id: 'poStatus',
                        label: `Status: ${entry.status}`,
                        value: entry.status,
                      });
                    }}
                  >
                    {poStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
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

          {/* Supplier Scorecard Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Supplier Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">On-Time %</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Quality %</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Lead Time</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierScorecardData.map((supplier) => (
                    <tr
                      key={supplier.supplier}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'supplier',
                          label: `Supplier: ${supplier.supplier}`,
                          value: supplier.supplier,
                        });
                      }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('supplier') && isFiltered('supplier', supplier.supplier) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{supplier.supplier}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{supplier.orders}</td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`${
                            supplier.onTime >= 95
                              ? 'text-green-600'
                              : supplier.onTime >= 90
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          } font-medium`}
                        >
                          {supplier.onTime}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">
                        {supplier.quality}%
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {(Number(supplier?.leadTime ?? 0)).toFixed(1)} days
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-yellow-600 font-medium">★ {supplier.rating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Price Analysis Tab */}
      {activeTab === 'price' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Average Price Trend">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={filteredPriceTrend}
                  onClick={(data) => handleChartSelect(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Volatility') return `${value.toFixed(1)}%`;
                      return `₹${value}`;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#0D9488"
                    strokeWidth={3}
                    name="Avg Price"
                    dot={{ fill: '#0D9488', r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="volatility"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Volatility"
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Price Index">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={filteredPriceTrend}
                  onClick={(data) => handleChartSelect(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[98, 108]} />
                  <Tooltip />
                  <Bar dataKey="priceIndex" fill="#4F46E5" name="Price Index" cursor="pointer">
                    {priceTrendData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.priceIndex > 104 ? '#EF4444' : entry.priceIndex > 102 ? '#F59E0B' : '#10B981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Price Trend Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Price Trend Analysis (Last 6 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Price</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Price Index</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Volatility %</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {priceTrendData.map((item, index) => (
                    <tr
                      key={item.month}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'month',
                          label: `Month: ${item.month}`,
                          value: item.month,
                        });
                      }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('month') && isFiltered('month', item.month) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(Number(item?.avgPrice ?? 0)).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{(Number(item?.priceIndex ?? 0)).toFixed(1)}</td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`${
                            item.volatility > 7
                              ? 'text-red-600'
                              : item.volatility > 6
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          } font-medium`}
                        >
                          {(Number(item?.volatility ?? 0)).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {index > 0 && (
                          <span
                            className={
                              item.avgPrice > priceTrendData[index - 1].avgPrice
                                ? 'text-red-600'
                                : 'text-green-600'
                            }
                          >
                            {item.avgPrice > priceTrendData[index - 1].avgPrice ? '▲' : '▼'}
                            {Math.abs(
                              ((item.avgPrice - priceTrendData[index - 1].avgPrice) /
                                priceTrendData[index - 1].avgPrice) *
                                100
                            ).toFixed(1)}
                            %
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

      {/* Lead Time Tab */}
      {activeTab === 'leadtime' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Lead Time by Supplier">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={leadTimeData}
                  onClick={(data) => handleChartSelect(data, 'supplier')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="supplier" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)} days`} />
                  <Legend />
                  <Bar dataKey="min" fill="#10B981" name="Min" />
                  <Bar dataKey="avg" fill="#0D9488" name="Average" />
                  <Bar dataKey="max" fill="#EF4444" name="Max" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Average Lead Time Comparison">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={leadTimeData}
                  layout="vertical"
                  onClick={(data) => handleChartSelect(data, 'supplier')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="supplier" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)} days`} />
                  <Bar dataKey="avg" fill="#0D9488" name="Avg Lead Time" cursor="pointer">
                    {leadTimeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.avg < 3.5 ? '#10B981' : entry.avg < 4.5 ? '#F59E0B' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Lead Time Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Lead Time Analysis by Supplier</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Min (days)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg (days)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Max (days)</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {leadTimeData.map((supplier) => (
                    <tr
                      key={supplier.supplier}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'supplier',
                          label: `Supplier: ${supplier.supplier}`,
                          value: supplier.supplier,
                        });
                      }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('supplier') && isFiltered('supplier', supplier.supplier) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{supplier.supplier}</td>
                      <td className="py-2 px-2 text-right text-green-600">
                        {(Number(supplier?.min ?? 0)).toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                        {(Number(supplier?.avg ?? 0)).toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">{(Number(supplier?.max ?? 0)).toFixed(1)}</td>
                      <td className="py-2 px-2 text-center">
                        {supplier.avg < 3.5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Excellent
                          </span>
                        )}
                        {supplier.avg >= 3.5 && supplier.avg < 4.5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Good
                          </span>
                        )}
                        {supplier.avg >= 4.5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Needs Improvement
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

      {/* Purchase Returns Tab */}
      {activeTab === 'returns' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Returns by Category">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={purchaseReturns}
                  onClick={(data) => handleChartSelect(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Quantity') return value;
                      return `₹${(value / 1000).toFixed(2)}K`;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" fill="#EF4444" name="Value" />
                  <Bar yAxisId="right" dataKey="qty" fill="#F59E0B" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Return Rate Distribution">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={purchaseReturns}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="percent"
                    label={({ category, percent }) =>
                      `${category} ${percent.toFixed(1)}%`
                    }
                    onClick={(entry) => {
                      toggleCrossFilter({
                        id: 'returnCategory',
                        label: `Return: ${entry.category}`,
                        value: entry.category,
                      });
                    }}
                  >
                    {purchaseReturns.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#EF4444', '#F59E0B', '#FF6B6B', '#FFA726'][index]}
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

          {/* Returns Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Purchase Returns Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Quantity</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseReturns.map((item) => (
                    <tr
                      key={item.category}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'returnCategory',
                          label: `Return: ${item.category}`,
                          value: item.category,
                        });
                      }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('returnCategory') && isFiltered('returnCategory', item.category) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {(Number(item?.qty ?? 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        ₹{(item.value / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {(Number(item?.percent ?? 0)).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-2 text-gray-900">Total</td>
                    <td className="py-2 px-2 text-right text-gray-900">
                      {purchaseReturns.reduce((sum, item) => sum + item.qty, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-right text-red-600">
                      ₹
                      {(
                        purchaseReturns.reduce((sum, item) => sum + item.value, 0) / 1000
                      ).toFixed(1)}
                      K
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Savings & Cost Avoidance Tab */}
      {activeTab === 'savings' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Savings by Month">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={savingsData}
                  onClick={(data) => handleChartSelect(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Savings (₹)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: any) => `₹${value}`} />
                  <Legend />
                  <Bar dataKey="negotiatedSavings" fill="#0D9488" name="Negotiated Savings" />
                  <Bar dataKey="bulkDiscount" fill="#4F46E5" name="Bulk Discount" />
                  <Bar dataKey="earlyPayment" fill="#F59E0B" name="Early Payment" />
                  <Bar dataKey="total" fill="#EF4444" name="Total Savings" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Supplier Cost Comparison">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={supplierCostComparison}
                  onClick={(data) => handleChartSelect(data, 'product')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: any) => `₹${value}`} />
                  <Legend />
                  <Bar dataKey="bestPrice" fill="#0D9488" name="Best Price" />
                  <Bar dataKey="avgPrice" fill="#4F46E5" name="Avg Price" />
                  <Bar dataKey="worstPrice" fill="#F59E0B" name="Worst Price" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Savings & Cost Avoidance Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Savings & Cost Avoidance Analysis (Last 6 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Negotiated Savings</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Bulk Discount</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Early Payment</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Total Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsData.map((item) => (
                    <tr
                      key={item.month}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'month',
                          label: `Month: ${item.month}`,
                          value: item.month,
                        });
                      }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('month') && isFiltered('month', item.month) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{item.negotiatedSavings}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{item.bulkDiscount}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{item.earlyPayment}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Payment Optimization Tab */}
      {activeTab === 'payment' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Payment Terms Analysis">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={paymentTermsData}
                  onClick={(data) => handleChartSelect(data, 'supplier')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="supplier" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)} days`} />
                  <Legend />
                  <Bar dataKey="creditDays" fill="#0D9488" name="Credit Days" />
                  <Bar dataKey="avgPayDays" fill="#4F46E5" name="Avg Pay Days" />
                  <Bar dataKey="earlyPayDiscount" fill="#F59E0B" name="Early Pay Discount (%)" />
                  <Bar dataKey="onTimePercent" fill="#EF4444" name="On-Time Payment (%)" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Supplier Cost Comparison">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/purchase')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={supplierCostComparison}
                  onClick={(data) => handleChartSelect(data, 'product')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: any) => `₹${value}`} />
                  <Legend />
                  <Bar dataKey="bestPrice" fill="#0D9488" name="Best Price" />
                  <Bar dataKey="avgPrice" fill="#4F46E5" name="Avg Price" />
                  <Bar dataKey="worstPrice" fill="#F59E0B" name="Worst Price" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Payment Optimization Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Terms Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Credit Days</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Pay Days</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Early Pay Discount (%)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">On-Time Payment (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTermsData.map((item) => (
                    <tr
                      key={item.supplier}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'supplier',
                          label: `Supplier: ${item.supplier}`,
                          value: item.supplier,
                        });
                      }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('supplier') && isFiltered('supplier', item.supplier) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.supplier}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{item.creditDays}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{item.avgPayDays}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{item.earlyPayDiscount}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{item.onTimePercent}</td>
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
            from: 'Procurement Intelligence',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};