import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { useApiData } from '../hooks/useApiData';
import { toMonthlyTrend, toTopProducts, toPaymentMix, toHourlySales, toCustomers, toDoctors, toCategoryPie } from '../services/transforms';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';

const COLORS = ['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899'];

export const SalesCommandCenter = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'product' | 'customer' | 'doctor' | 'returns'>('overview');
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
  const { data: apiOverview } = useApiData<any>('/sales/overview/', { kpis: {}, daily_trend: [], monthly_trend: [] });
  const { data: apiHourly } = useApiData<any[]>('/sales/hourly/', []);
  const { data: apiPaymentMix } = useApiData<any[]>('/sales/payment-mix/', []);
  const { data: apiProducts } = useApiData<any[]>('/sales/products/', []);
  const { data: apiCategories } = useApiData<any[]>('/sales/categories/', []);
  const { data: apiCustomers } = useApiData<any[]>('/sales/customers/', []);
  const { data: apiCustomerSegments } = useApiData<any[]>('/sales/customer-segments/', []);
  const { data: apiDoctors } = useApiData<any[]>('/sales/doctors/', []);
  const { data: apiDoctorSpecialties } = useApiData<any[]>('/sales/doctor-specialties/', []);
  const { data: apiReturns } = useApiData<any>('/sales/returns/overview/', { kpis: {}, trend: [], by_reason: [] });

  // Additional API hooks for data previously hardcoded
  const { data: apiSlowMovers } = useApiData<any[]>('/sales/slow-movers/', []);
  const { data: apiProductProfitability } = useApiData<any[]>('/sales/product-profitability/', []);
  const { data: apiCustomerGrowth } = useApiData<any[]>('/sales/customer-growth/', []);
  const { data: apiOutstandingAging } = useApiData<any[]>('/sales/outstanding-aging/', []);
  const { data: apiDoctorPrescriptionTrend } = useApiData<any[]>('/sales/doctor-prescription-trend/', []);
  const { data: apiDoctorRadar } = useApiData<any[]>('/sales/doctor-radar/', []);
  const { data: apiReturnsByCategory } = useApiData<any[]>('/sales/returns/by-category/', []);
  const { data: apiReturnImpact } = useApiData<any[]>('/sales/returns/profit-impact/', []);

  // Transform API data
  const salesTrendData = (apiOverview.daily_trend || []).map((r: any) => ({
    date: r.sale_date?.slice(5) || '', sales: Number(r.revenue) || 0, orders: Number(r.orders) || 0, avgBasket: r.orders ? Math.round(Number(r.revenue) / Number(r.orders)) : 0,
  }));
  const hourlySalesData = toHourlySales(apiHourly);
  const paymentMethodDataLive = toPaymentMix(apiPaymentMix);
  const monthlySalesTrendData = toMonthlyTrend(apiOverview.monthly_trend || []);
  const topProductsData = toTopProducts(apiProducts);
  const categoryRevenueData = toCategoryPie(apiCategories);
  const topCustomersData = toCustomers(apiCustomers);
  const topDoctorsData = toDoctors(apiDoctors);
  const customerSegmentationData = apiCustomerSegments;
  const customerGrowthData = apiCustomerGrowth;
  const outstandingAgingData = apiOutstandingAging;
  const specialityRevenueData = apiDoctorSpecialties;
  const doctorPrescriptionTrendData = apiDoctorPrescriptionTrend;
  const doctorRadarData = apiDoctorRadar;
  const productProfitabilityData = apiProductProfitability;
  const slowMovingProductsData = apiSlowMovers;
  const returnsTrendData = apiReturns.trend || [];
  const returnsByReasonData = apiReturns.by_reason || [];
  const returnsByCategoryData = apiReturnsByCategory;
  const returnImpactData = apiReturnImpact;

  const handleChartClick = (data: any, dimension: string, detailPage: string = '/detail/sales') => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const filter = {
        id: dimension,
        label: `${dimension}: ${payload[dimension]}`,
        value: payload[dimension],
      };
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
          from: 'Sales Command Center',
          filters: filter ? [filter] : activeFilters.length > 0 ? activeFilters : [],
        },
      },
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'product', label: 'Product Analysis' },
    { id: 'customer', label: 'Customer Analysis' },
    { id: 'doctor', label: 'Doctor Analysis' },
    { id: 'returns', label: 'Returns & Refunds' },
  ];

  // Apply cross-filtering
  const filteredSalesTrend = salesTrendData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.date)
  );
  const filteredMonthlySales = monthlySalesTrendData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  // KPI values from API
  const kpis = apiOverview.kpis || {};
  const returnsKpis = apiReturns.kpis || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Command Center</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Download Report
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            New Sale
          </button>
        </div>
      </div>

      {/* Sales → Profit Story Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-white to-green-50 rounded-lg border border-teal-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-900">Sales → Profit Story</h3>
          <span className="text-xs text-gray-500 ml-auto">How sales performance translates to profit</span>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <div className="bg-white rounded-lg p-3 border border-teal-100">
            <div className="text-[10px] text-gray-500 mb-1">Revenue</div>
            <div className="text-sm font-bold text-teal-700">{formatIndianCurrencyAbbreviated(kpis.total_revenue || 0)}</div>
            <div className="text-[10px] text-green-600">↑ {kpis.revenue_growth_pct ?? 0}% vs prev</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="text-[10px] text-gray-500 mb-1">COGS ({kpis.cogs_pct ?? 0}%)</div>
            <div className="text-sm font-bold text-gray-700">{formatIndianCurrencyAbbreviated(kpis.cogs || 0)}</div>
            <div className="text-[10px] text-red-500">↑ {kpis.cogs_growth_pct ?? 0}% vs prev</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="text-[10px] text-gray-500 mb-1">Gross Profit</div>
            <div className="text-sm font-bold text-green-700">{formatIndianCurrencyAbbreviated(kpis.gross_profit || 0)}</div>
            <div className="text-[10px] text-amber-500">Margin: {kpis.gross_margin_pct ?? 0}%</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-100">
            <div className="text-[10px] text-gray-500 mb-1">Returns Impact</div>
            <div className="text-sm font-bold text-red-600">{kpis.returns_impact ? `-${formatIndianCurrencyAbbreviated(Math.abs(kpis.returns_impact))}` : '-'}</div>
            <div className="text-[10px] text-red-500">{returnsKpis.total_returns ?? 0} items returned</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <div className="text-[10px] text-gray-500 mb-1">Top Margin Product</div>
            <div className="text-sm font-bold text-indigo-700">{kpis.top_margin_product || '-'}</div>
            <div className="text-[10px] text-green-600">{kpis.top_margin_product_growth ? `↑ ${kpis.top_margin_product_growth}% growth` : '-'}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <div className="text-[10px] text-gray-500 mb-1">Net Profit</div>
            <div className="text-sm font-bold text-green-700">{formatIndianCurrencyAbbreviated(kpis.net_profit || 0)}</div>
            <div className="text-[10px] text-gray-500">Margin: {kpis.net_margin_pct ?? 0}%</div>
          </div>
        </div>
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

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard
              title="Revenue Today"
              value={formatIndianCurrencyAbbreviated(kpis.today_revenue || 0)}
              subtitle={`${kpis.today_orders ?? 0} Orders`}
              trend={{ value: `${kpis.today_revenue_growth_pct ?? 0}%`, direction: (kpis.today_revenue_growth_pct ?? 0) >= 0 ? 'up' : 'down' }}
              onClick={() => handleDrillThrough('/detail/sales')}
            />
            <KPICard
              title="MTD Revenue"
              value={formatIndianCurrencyAbbreviated(kpis.total_revenue || 0)}
              subtitle={`${(kpis.total_orders ?? 0).toLocaleString('en-IN')} Orders`}
              trend={{ value: `${kpis.revenue_growth_pct ?? 0}%`, direction: (kpis.revenue_growth_pct ?? 0) >= 0 ? 'up' : 'down' }}
            />
            <KPICard
              title="Avg Basket Size"
              value={formatIndianCurrencyAbbreviated(kpis.avg_order_value || 0)}
              subtitle="Today's Average"
              trend={{ value: `${kpis.avg_basket_growth_pct ?? 0}%`, direction: (kpis.avg_basket_growth_pct ?? 0) >= 0 ? 'up' : 'down' }}
            />
            <KPICard
              title="Gross Margin"
              value={`${kpis.gross_margin_pct ?? 0}%`}
              subtitle={`Target: ${kpis.margin_target_pct ?? 0}%`}
              trend={{ value: `${kpis.margin_change_pp ?? 0}pp`, direction: (kpis.margin_change_pp ?? 0) >= 0 ? 'up' : 'down' }}
            />
            <KPICard
              title="Return Rate"
              value={`${returnsKpis.return_rate_pct ?? 0}%`}
              subtitle={`${returnsKpis.total_returns ?? 0} Items / ${formatIndianCurrencyAbbreviated(returnsKpis.total_return_value || 0)}`}
              trend={{ value: `${returnsKpis.return_rate_change_pp ?? 0}pp`, direction: (returnsKpis.return_rate_change_pp ?? 0) >= 0 ? 'up' : 'down' }}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="Daily Sales Trend (Last 7 Days)"
              onDrillThrough={() => handleDrillThrough('/detail/sales')}
            >
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={filteredSalesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Orders' ? value : `₹${(value / 1000).toFixed(1)}K`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" fill="#0D9488" name="Revenue" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#4F46E5" strokeWidth={2} name="Orders" dot={{ fill: '#4F46E5', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Revenue by Payment Method">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodDataLive}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      onClick={(entry) => addCrossFilter({ id: 'paymentMethod', label: `Payment: ${entry.name}`, value: entry.name })}
                    >
                      {paymentMethodDataLive.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Hourly Sales Pattern (Today)">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={hourlySalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(1)}K`} />
                    <Area type="monotone" dataKey="sales" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Monthly Revenue & Profit Trend">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={filteredMonthlySales} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Margin %' ? `${value}%` : `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#0D9488" name="Revenue" cursor="pointer" />
                    <Bar yAxisId="left" dataKey="profit" fill="#10B981" name="Gross Profit" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#F59E0B" strokeWidth={2} name="Margin %" dot={{ fill: '#F59E0B', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Products (MTD)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Qty</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsData.slice(0, 10).map((product) => (
                      <tr
                        key={product.name}
                        onClick={() => addCrossFilter({ id: 'product', label: `Product: ${product.name}`, value: product.name })}
                        className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{product.name}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{product.qty.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-gray-900">₹{(product.revenue / 1000).toFixed(1)}K</td>
                        <td className="py-2 px-2 text-right">
                          <span className={product.margin >= 20 ? 'text-green-600 font-medium' : product.margin >= 17 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                            {product.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Customers (MTD)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Customer</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomersData.map((customer) => (
                      <tr
                        key={customer.name}
                        onClick={() => addCrossFilter({ id: 'customer', label: `Customer: ${customer.name}`, value: customer.name })}
                        className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{customer.name}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{customer.orders}</td>
                        <td className="py-2 px-2 text-right text-gray-900">₹{(customer.revenue / 1000).toFixed(0)}K</td>
                        <td className="py-2 px-2 text-right">
                          {customer.outstanding > 0 ? (
                            <span className="text-red-600">₹{(customer.outstanding / 1000).toFixed(0)}K</span>
                          ) : (
                            <span className="text-green-600">Cleared</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== PRODUCT ANALYSIS TAB ==================== */}
      {activeTab === 'product' && (
        <>
          {/* Product KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Total SKUs Sold" value={String(kpis.total_skus_sold ?? 0)} subtitle={`Out of ${kpis.total_active_skus ?? 0} active`} trend={{ value: String(kpis.skus_sold_change ?? 0), direction: (kpis.skus_sold_change ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Revenue per SKU" value={formatIndianCurrencyAbbreviated(kpis.revenue_per_sku || 0)} subtitle="Avg across sold SKUs" trend={{ value: `${kpis.revenue_per_sku_growth_pct ?? 0}%`, direction: (kpis.revenue_per_sku_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Top Category" value={kpis.top_category_name || '-'} subtitle={`${formatIndianCurrencyAbbreviated(kpis.top_category_revenue || 0)} (${kpis.top_category_share_pct ?? 0}%)`} trend={{ value: `${kpis.top_category_growth_pct ?? 0}%`, direction: (kpis.top_category_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Highest Margin" value={`${kpis.highest_margin_category || '-'} ${kpis.highest_margin_pct ?? 0}%`} subtitle={`${formatIndianCurrencyAbbreviated(kpis.highest_margin_revenue || 0)} revenue`} trend={{ value: `${kpis.highest_margin_change_pp ?? 0}pp`, direction: (kpis.highest_margin_change_pp ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Slow Movers" value={String(kpis.slow_movers_count ?? 0)} subtitle="<10 units/month" trend={{ value: String(kpis.slow_movers_change ?? 0), direction: (kpis.slow_movers_change ?? 0) <= 0 ? 'down' : 'up' }} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Revenue by Category" onDrillThrough={() => handleDrillThrough('/detail/product')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/product')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={categoryRevenueData} onClick={(data) => handleChartClick(data, 'category', '/detail/product')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Margin %' ? `${value}%` : name === 'Growth %' ? `${value}%` : `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#0D9488" name="Revenue" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#F59E0B" strokeWidth={2} name="Margin %" dot={{ fill: '#F59E0B', r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#4F46E5" strokeWidth={2} name="Growth %" dot={{ fill: '#4F46E5', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Product Profitability Scatter (Revenue vs Margin)">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/product')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="revenue" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} name="Revenue" />
                    <YAxis dataKey="margin" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} name="Margin" domain={['auto', 'auto']} />
                    <ZAxis dataKey="qty" range={[50, 400]} name="Quantity" />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === 'Revenue') return `₹${(value / 1000).toFixed(1)}K`;
                        if (name === 'Margin') return `${value}%`;
                        return value.toLocaleString('en-IN');
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                              <p className="font-semibold text-gray-900">{data.name}</p>
                              <p className="text-gray-600">Revenue: ₹{(data.revenue / 1000).toFixed(1)}K</p>
                              <p className="text-gray-600">Margin: {data.margin}%</p>
                              <p className="text-gray-600">Qty Sold: {data.qty?.toLocaleString('en-IN')}</p>
                              <p className="text-gray-600">Profit Contribution: {data.profitContrib}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={productProfitabilityData} fill="#0D9488" cursor="pointer">
                      {productProfitabilityData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.margin >= 22 ? '#10B981' : entry.margin >= 19 ? '#F59E0B' : '#EF4444'}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Product Performance Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Product Performance (MTD)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">#</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Qty</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Cost</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Profit</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Margin</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductsData.map((product, index) => (
                    <tr
                      key={product.name}
                      onClick={() => addCrossFilter({ id: 'product', label: `Product: ${product.name}`, value: product.name })}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">{product.name}</td>
                      <td className="py-2 px-2 text-gray-600">{product.category}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{product.qty.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(product.revenue / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-gray-600">₹{(product.cost / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">₹{(product.profit / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right">
                        <span className={product.margin >= 20 ? 'text-green-600 font-medium' : product.margin >= 17 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                          {product.margin}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={product.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.growth > 0 ? '↑' : '↓'}{Math.abs(product.growth)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slow Moving Products */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Slow Moving Products (Action Required)</h3>
              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">{kpis.slow_movers_count ?? 0} products below threshold</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Sold (MTD)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Days Since Last Sale</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Stock on Hand</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {slowMovingProductsData.map((product: any) => (
                    <tr
                      key={product.name}
                      onClick={() => addCrossFilter({ id: 'product', label: `Product: ${product.name}`, value: product.name })}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{product.name}</td>
                      <td className="py-2 px-2 text-right text-red-600">{product.qty}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{((product.revenue || 0) / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-amber-600">{product.daysLastSold}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{(product.stockQty || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'declining' ? 'bg-red-100 text-red-800' :
                          product.status === 'stagnant' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {product.status === 'declining' ? '↓ Declining' : product.status === 'stagnant' ? '→ Stagnant' : '↑ Reviving'}
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

      {/* ==================== CUSTOMER ANALYSIS TAB ==================== */}
      {activeTab === 'customer' && (
        <>
          {/* Customer KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Active Customers" value={String(kpis.active_customers ?? 0)} subtitle="B2B & Walk-in combined" trend={{ value: String(kpis.active_customers_change ?? 0), direction: (kpis.active_customers_change ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="New Customers" value={String(kpis.new_customers ?? 0)} subtitle="This Month" trend={{ value: String(kpis.new_customers_change ?? 0), direction: (kpis.new_customers_change ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Customer Retention" value={`${kpis.customer_retention_pct ?? 0}%`} subtitle="Last 6 months" trend={{ value: `${kpis.retention_change_pp ?? 0}pp`, direction: (kpis.retention_change_pp ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Outstanding Receivables" value={formatIndianCurrencyAbbreviated(kpis.outstanding_receivables || 0)} subtitle={`${kpis.outstanding_customer_count ?? 0} Customers`} trend={{ value: `${kpis.outstanding_growth_pct ?? 0}%`, direction: (kpis.outstanding_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Avg Customer LTV" value={formatIndianCurrencyAbbreviated(kpis.avg_customer_ltv || 0)} subtitle="Per active customer" trend={{ value: `${kpis.ltv_growth_pct ?? 0}%`, direction: (kpis.ltv_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Customer Segmentation by Revenue" onDrillThrough={() => handleDrillThrough('/detail/sales')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerSegmentationData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={5} dataKey="revenue"
                      label={({ segment, share }) => `${(segment || '').split(' ')[0]} ${share ?? 0}%`}
                      onClick={(entry) => addCrossFilter({ id: 'segment', label: `Segment: ${entry.segment}`, value: entry.segment })}
                    >
                      {customerSegmentationData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Customer Growth & B2B Revenue Trend">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={customerGrowthData} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'B2B Revenue' ? `₹${(value / 100000).toFixed(2)}L` : value} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="newCustomers" fill="#10B981" name="New Customers" />
                    <Bar yAxisId="left" dataKey="churnedCustomers" fill="#EF4444" name="Churned" />
                    <Line yAxisId="right" type="monotone" dataKey="b2bRevenue" stroke="#0D9488" strokeWidth={2} name="B2B Revenue" dot={{ fill: '#0D9488', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Outstanding Aging */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Outstanding Receivables Aging">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={outstandingAgingData} onClick={(data) => handleChartClick(data, 'range')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(1)}K`} />
                    <Bar dataKey="amount" cursor="pointer">
                      {outstandingAgingData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index < 2 ? '#10B981' : index < 3 ? '#F59E0B' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Segmentation Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Segment Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Segment</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Customers</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Orders</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerSegmentationData.map((seg: any) => (
                      <tr
                        key={seg.segment}
                        onClick={() => addCrossFilter({ id: 'segment', label: `Segment: ${seg.segment}`, value: seg.segment })}
                        className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{seg.segment}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{seg.customers}</td>
                        <td className="py-2 px-2 text-right text-gray-900">₹{((seg.revenue || 0) / 100000).toFixed(2)}L</td>
                        <td className="py-2 px-2 text-right text-gray-600">{seg.avgOrders}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={(seg.retention ?? 0) >= 90 ? 'text-green-600 font-medium' : (seg.retention ?? 0) >= 80 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                            {seg.retention}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Full Customer Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Customers Detail (MTD)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Customer</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Tier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Order</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Outstanding</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Frequency</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomersData.map((customer) => (
                    <tr
                      key={customer.name}
                      onClick={() => addCrossFilter({ id: 'customer', label: `Customer: ${customer.name}`, value: customer.name })}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{customer.name}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          customer.loyalty === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                          customer.loyalty === 'Gold' ? 'bg-amber-100 text-amber-800' :
                          customer.loyalty === 'Silver' ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {customer.loyalty || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">{customer.orders}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(customer.revenue / 1000).toFixed(0)}K</td>
                      <td className="py-2 px-2 text-right text-gray-600">₹{(customer.avgOrderValue || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-right">
                        {customer.outstanding > 0 ? (
                          <span className="text-red-600 font-medium">₹{(customer.outstanding / 1000).toFixed(0)}K</span>
                        ) : (
                          <span className="text-green-600">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-gray-600">{customer.frequency || '-'}</td>
                      <td className="py-2 px-2 text-gray-600">{customer.lastOrder || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================== DOCTOR ANALYSIS TAB ==================== */}
      {activeTab === 'doctor' && (
        <>
          {/* Doctor KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Active Prescribers" value={String(kpis.active_prescribers ?? 0)} subtitle="MTD prescriptions" trend={{ value: String(kpis.prescribers_change ?? 0), direction: (kpis.prescribers_change ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Total Prescriptions" value={String(kpis.total_prescriptions ?? 0)} subtitle="This month" trend={{ value: `${kpis.prescriptions_growth_pct ?? 0}%`, direction: (kpis.prescriptions_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Avg Rx Value" value={formatIndianCurrencyAbbreviated(kpis.avg_rx_value || 0)} subtitle="Per prescription" trend={{ value: `${kpis.avg_rx_growth_pct ?? 0}%`, direction: (kpis.avg_rx_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Top Prescriber" value={kpis.top_prescriber_name || '-'} subtitle={`${kpis.top_prescriber_rx ?? 0} Rx / ${formatIndianCurrencyAbbreviated(kpis.top_prescriber_revenue || 0)}`} trend={{ value: `${kpis.top_prescriber_growth_pct ?? 0}%`, direction: (kpis.top_prescriber_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="New Doctors" value={String(kpis.new_doctors ?? 0)} subtitle="Onboarded this month" trend={{ value: String(kpis.new_doctors_change ?? 0), direction: (kpis.new_doctors_change ?? 0) >= 0 ? 'up' : 'down' }} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Revenue by Speciality" onDrillThrough={() => handleDrillThrough('/detail/sales')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={specialityRevenueData} layout="vertical" onClick={(data) => handleChartClick(data, 'speciality')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <YAxis type="category" dataKey="speciality" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                    <Bar dataKey="revenue" fill="#0D9488" cursor="pointer">
                      {specialityRevenueData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Top 3 Doctors - Performance Radar">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={doctorRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {doctorRadarData.length > 0 && Object.keys(doctorRadarData[0]).filter(k => k !== 'metric').map((doctorKey, i) => (
                      <Radar key={doctorKey} name={doctorKey} dataKey={doctorKey} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
                    ))}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Doctor Prescription Trend */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Prescription Volume Trend">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={doctorPrescriptionTrendData} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalRx" fill="#0D9488" name="Total Rx" />
                    <Line yAxisId="right" type="monotone" dataKey="uniqueDoctors" stroke="#4F46E5" strokeWidth={2} name="Active Doctors" dot={{ fill: '#4F46E5', r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="newDoctors" stroke="#F59E0B" strokeWidth={2} name="New Doctors" dot={{ fill: '#F59E0B', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Speciality Summary Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Speciality</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Speciality</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Doctors</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Rx Count</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Rx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialityRevenueData.map((spec: any) => (
                      <tr
                        key={spec.speciality}
                        onClick={() => addCrossFilter({ id: 'speciality', label: `Speciality: ${spec.speciality}`, value: spec.speciality })}
                        className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{spec.speciality}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{spec.doctors}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{spec.prescriptions}</td>
                        <td className="py-2 px-2 text-right text-gray-900">₹{((spec.revenue || 0) / 100000).toFixed(2)}L</td>
                        <td className="py-2 px-2 text-right text-gray-600">₹{(spec.avgValue || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Full Doctor Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Prescribers Detail (MTD)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">#</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Doctor</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Speciality</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Rx Count</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Rx Value</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Top Drug</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {topDoctorsData.map((doctor, index) => (
                    <tr
                      key={doctor.name}
                      onClick={() => addCrossFilter({ id: 'doctor', label: `Doctor: ${doctor.name}`, value: doctor.name })}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">{doctor.name}</td>
                      <td className="py-2 px-2 text-gray-600">{doctor.speciality}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{doctor.prescriptions}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(doctor.revenue / 1000).toFixed(0)}K</td>
                      <td className="py-2 px-2 text-right text-gray-600">₹{(doctor.avgRxValue || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-gray-600">{doctor.topDrug || '-'}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={(doctor.growth ?? 0) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {(doctor.growth ?? 0) > 0 ? '↑' : '↓'}{Math.abs(doctor.growth ?? 0)}%
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

      {/* ==================== RETURNS & REFUNDS TAB ==================== */}
      {activeTab === 'returns' && (
        <>
          {/* Returns KPIs */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard title="Total Returns (MTD)" value={String(returnsKpis.total_returns ?? 0)} subtitle={`${formatIndianCurrencyAbbreviated(returnsKpis.total_return_value || 0)} value`} trend={{ value: String(returnsKpis.returns_change ?? 0), direction: (returnsKpis.returns_change ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Return Rate" value={`${returnsKpis.return_rate_pct ?? 0}%`} subtitle={`Target: <${returnsKpis.return_rate_target_pct ?? 0}%`} trend={{ value: `${returnsKpis.return_rate_change_pp ?? 0}pp`, direction: (returnsKpis.return_rate_change_pp ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Avg Return Value" value={formatIndianCurrencyAbbreviated(returnsKpis.avg_return_value || 0)} subtitle="Per return item" trend={{ value: `${returnsKpis.avg_return_growth_pct ?? 0}%`, direction: (returnsKpis.avg_return_growth_pct ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Top Return Reason" value={returnsKpis.top_reason || '-'} subtitle={`${returnsKpis.top_reason_pct ?? 0}% of returns`} trend={{ value: `${returnsKpis.top_reason_change_pp ?? 0}pp`, direction: (returnsKpis.top_reason_change_pp ?? 0) >= 0 ? 'up' : 'down' }} />
            <KPICard title="Net Profit Impact" value={returnsKpis.net_profit_impact ? `-${formatIndianCurrencyAbbreviated(Math.abs(returnsKpis.net_profit_impact))}` : '-'} subtitle={`${returnsKpis.profit_impact_pct ?? 0}% of gross profit`} trend={{ value: formatIndianCurrencyAbbreviated(Math.abs(returnsKpis.profit_impact_change || 0)), direction: (returnsKpis.profit_impact_change ?? 0) >= 0 ? 'up' : 'down' }} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Returns Trend (Last 6 Months)" onDrillThrough={() => handleDrillThrough('/detail/sales')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={returnsTrendData} onClick={(data) => handleChartClick(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Return Rate %' ? `${value}%` : name === 'Return Count' ? value : `₹${(value / 1000).toFixed(1)}K`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="value" fill="#EF4444" name="Return Value" cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={2} name="Return Rate %" dot={{ fill: '#F59E0B', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Returns by Reason">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={returnsByReasonData} layout="vertical" onClick={(data) => handleChartClick(data, 'reason')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="reason" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(1)}K`} />
                    <Bar dataKey="value" cursor="pointer">
                      {returnsByReasonData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#6B7280', '#EC4899'][index % 6]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Returns by Category + Profit Impact */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Return Rate by Category">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/sales')} className="cursor-context-menu">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={returnsByCategoryData} onClick={(data) => handleChartClick(data, 'category')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Bar dataKey="rate" name="Return Rate %" cursor="pointer">
                      {returnsByCategoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={(entry.rate ?? 0) > 3 ? '#EF4444' : (entry.rate ?? 0) > 2.5 ? '#F59E0B' : '#10B981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Profit Impact Waterfall */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Returns Impact on Profit</h3>
              <div className="space-y-3">
                {returnImpactData.map((item: any) => (
                  <div key={item.item} className="flex items-center justify-between">
                    <span className={`text-sm ${item.item === 'Net Profit Impact' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {item.item}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 rounded-full ${(item.value ?? 0) >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(Math.abs(item.value || 0) / 1000, 100)}px` }}
                      />
                      <span className={`text-sm font-medium ${
                        item.item === 'Net Profit Impact' ? 'text-red-700 font-bold' :
                        (item.value ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(item.value ?? 0) >= 0 ? '+' : ''}₹{((item.value || 0) / 1000).toFixed(1)}K
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-xs text-gray-500">
                    Returns erode <span className="font-semibold text-red-600">{returnsKpis.profit_impact_pct ?? 0}%</span> of your gross profit.
                    {returnsKpis.top_action ? ` Top action: ${returnsKpis.top_action}.` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Returns Detail Tables */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Returns by Reason (Detail)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Reason</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Qty</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Share</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-600">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnsByReasonData.map((item: any) => (
                      <tr
                        key={item.reason}
                        onClick={() => addCrossFilter({ id: 'returnReason', label: `Reason: ${item.reason}`, value: item.reason })}
                        className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{item.reason}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{item.qty}</td>
                        <td className="py-2 px-2 text-right text-red-600">₹{((item.value || 0) / 1000).toFixed(1)}K</td>
                        <td className="py-2 px-2 text-right text-gray-600">{item.percent}%</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            item.trend === 'up' ? 'bg-red-100 text-red-800' :
                            item.trend === 'down' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.trend === 'up' ? '↑ Rising' : item.trend === 'down' ? '↓ Falling' : '→ Stable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Total</td>
                      <td className="py-2 px-2 text-right text-gray-900">{returnsByReasonData.reduce((s: number, i: any) => s + (i.qty || 0), 0)}</td>
                      <td className="py-2 px-2 text-right text-red-600">₹{(returnsByReasonData.reduce((s: number, i: any) => s + (i.value || 0), 0) / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-gray-900">100%</td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Returns by Category (Detail)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Returns</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Return Value</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Total Sales</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Return Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnsByCategoryData.map((item: any) => (
                      <tr
                        key={item.category}
                        onClick={() => addCrossFilter({ id: 'category', label: `Category: ${item.category}`, value: item.category })}
                        className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{item.returns}</td>
                        <td className="py-2 px-2 text-right text-red-600">₹{((item.value || 0) / 1000).toFixed(1)}K</td>
                        <td className="py-2 px-2 text-right text-gray-600">₹{((item.totalSales || 0) / 100000).toFixed(2)}L</td>
                        <td className="py-2 px-2 text-right">
                          <span className={(item.rate ?? 0) > 3 ? 'text-red-600 font-medium' : (item.rate ?? 0) > 2.5 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                            {item.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            from: 'Sales Command Center',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};
