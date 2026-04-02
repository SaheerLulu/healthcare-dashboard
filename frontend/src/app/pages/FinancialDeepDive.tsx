import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';
import { toMonthlyTrend, numericize } from '../services/transforms';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
} from 'recharts';

export const FinancialDeepDive = () => {
  const [activeTab, setActiveTab] = useState<'pl' | 'bridge' | 'balance' | 'cashflow' | 'ratios'>('pl');
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
  const { data: apiPnl } = useApiData<any>('/financial/pnl/', {});
  const { data: apiPnlTrend } = useApiData<any[]>('/financial/pnl-trend/', []);
  const { data: apiExpenses } = useApiData<any[]>('/financial/expense-breakdown/', []);
  const { data: apiBalanceSheet } = useApiData<any>('/financial/balance-sheet/', {});
  const { data: apiCashFlow } = useApiData<any[]>('/financial/cash-flow/', []);
  const { data: apiRatios } = useApiData<any[]>('/financial/ratios/', []);
  const { data: apiProfitBridge } = useApiData<any[]>('/financial/profit-bridge/', []);

  // Transform API data
  const plTrendData = apiPnlTrend.map((r: any) => ({
    month: r.month || '', revenue: Number(r.revenue) || 0, cogs: Number(r.expenses) * 0.6 || 0,
    grossProfit: Number(r.revenue) - Number(r.expenses) * 0.6, opex: Number(r.expenses) * 0.4 || 0,
    netProfit: Number(r.net_profit) || 0,
  }));
  const expenseBreakdownData = apiExpenses.map((r: any) => ({
    name: r.account_name || r.category || '', value: Number(r.amount) || 0,
    category: r.account_name || r.category || '', amount: Number(r.amount) || 0,
    percent: Number(r.percent) || 0,
  }));

  // Balance sheet data from API
  const balanceSheetItems: { category: string; amount: number; type: string }[] = (() => {
    const items: { category: string; amount: number; type: string }[] = [];
    if (apiBalanceSheet.assets) {
      for (const [key, val] of Object.entries(apiBalanceSheet.assets)) {
        items.push({ category: key, amount: Number(val) || 0, type: 'asset' });
      }
    }
    if (apiBalanceSheet.liabilities) {
      for (const [key, val] of Object.entries(apiBalanceSheet.liabilities)) {
        items.push({ category: key, amount: Number(val) || 0, type: 'liability' });
      }
    }
    if (apiBalanceSheet.equity) {
      for (const [key, val] of Object.entries(apiBalanceSheet.equity)) {
        items.push({ category: key, amount: Number(val) || 0, type: 'equity' });
      }
    }
    // If API returns a flat array instead of nested object
    if (Array.isArray(apiBalanceSheet)) {
      return (apiBalanceSheet as any[]).map((r: any) => ({
        category: r.category || r.account_name || '',
        amount: Number(r.amount) || 0,
        type: r.type || 'asset',
      }));
    }
    return items;
  })();

  // Cash flow data from API
  const cashFlowItems = (Array.isArray(apiCashFlow) ? apiCashFlow : []).map((r: any) => ({
    month: r.month || '',
    operating: Number(r.operating) || 0,
    investing: Number(r.investing) || 0,
    financing: Number(r.financing) || 0,
    net: Number(r.net) || 0,
  }));

  // Financial ratios data from API
  const ratiosItems = (Array.isArray(apiRatios) ? apiRatios : []).map((r: any) => numericize({
    month: r.month || '',
    currentRatio: Number(r.currentRatio || r.current_ratio) || 0,
    debtEquity: Number(r.debtEquity || r.debt_equity) || 0,
    roe: Number(r.roe) || 0,
    roa: Number(r.roa) || 0,
  }));

  // Profit bridge data from API
  const profitBridgeItems = (Array.isArray(apiProfitBridge) ? apiProfitBridge : []).map((r: any) => ({
    name: r.name || '',
    value: Number(r.value) || 0,
    type: r.type || 'base',
    color: r.type === 'positive' ? '#10B981' : r.type === 'negative' ? '#EF4444' : '#4F46E5',
  }));

  const tabs = [
    { id: 'pl', label: 'P&L Statement' },
    { id: 'bridge', label: 'Profit Bridge' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'ratios', label: 'Financial Ratios' },
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

  const handleBarClick = (data: any, dimension: string) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const filter = {
        id: dimension,
        label: `${dimension}: ${payload[dimension]}`,
        value: payload[dimension],
      };
      // Navigate to detail page with drill-through context
      handleDrillThrough('/detail/financial', filter);
    }
  };

  const handleChartClick = (data: any, dimension: string, detailPage: string = '/detail/financial') => {
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

  const handleDrillThrough = (page: string, filter?: any) => {
    navigate(page, {
      state: {
        drillThrough: {
          from: 'Financial Deep Dive',
          filters: activeFilters.length > 0 ? activeFilters : filter ? [filter] : [],
        },
      },
    });
  };

  // Apply cross-filtering
  const filteredPLData = plTrendData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  const filteredCashFlowData = cashFlowItems.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  // Derive KPI values from API data
  const netRevenue = Number(apiPnl.revenue || apiPnl.total_revenue) || 0;
  const grossProfit = Number(apiPnl.gross_profit) || 0;
  const netProfit = Number(apiPnl.net_profit) || 0;
  const grossMargin = netRevenue ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0.0';
  const netMargin = netRevenue ? ((netProfit / netRevenue) * 100).toFixed(1) : '0.0';
  const totalAssets = balanceSheetItems.filter(i => i.type === 'asset').reduce((s, i) => s + i.amount, 0);
  const currentAssets = Number(apiBalanceSheet.current_assets) || totalAssets;
  const totalLiabilities = balanceSheetItems.filter(i => i.type === 'liability').reduce((s, i) => s + i.amount, 0);
  const currentLiabilities = Number(apiBalanceSheet.current_liabilities) || totalLiabilities;
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities ? (currentAssets / currentLiabilities).toFixed(1) : '0.0';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Deep Dive</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Export P&L
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Net Revenue"
          value={formatIndianCurrencyAbbreviated(netRevenue)}
          subtitle="Current Period"
          trend={{ value: '', direction: 'up' }}
          onClick={() => handleDrillThrough('/detail/financial')}
        />
        <KPICard
          title="Gross Profit"
          value={formatIndianCurrencyAbbreviated(grossProfit)}
          subtitle={`Margin: ${grossMargin}%`}
          trend={{ value: '', direction: 'up' }}
        />
        <KPICard
          title="Net Profit"
          value={formatIndianCurrencyAbbreviated(netProfit)}
          subtitle={`Margin: ${netMargin}%`}
          trend={{ value: '', direction: 'up' }}
        />
        <KPICard
          title="Total Assets"
          value={formatIndianCurrencyAbbreviated(totalAssets)}
          subtitle={`Current: ${formatIndianCurrencyAbbreviated(currentAssets)}`}
          trend={{ value: '', direction: 'up' }}
        />
        <KPICard
          title="Working Capital"
          value={formatIndianCurrencyAbbreviated(workingCapital)}
          subtitle={`Current Ratio: ${currentRatio}`}
          trend={{ value: '', direction: 'up' }}
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

      {/* P&L Statement Tab */}
      {activeTab === 'pl' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="Revenue & Profit Trends"
              onDrillThrough={() => handleDrillThrough('/detail/financial')}
            >
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={filteredPLData}
                    onClick={(data) => handleChartClick(data, 'month')}
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
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === 'Margin') return `${Number(value).toFixed(1)}%`;
                        return `₹${(Number(value) / 100000).toFixed(2)}L`;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#0D9488" name="Revenue" />
                    <Bar yAxisId="left" dataKey="grossProfit" fill="#4F46E5" name="Gross Profit" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={(data) => data.revenue ? Number(((data.grossProfit / data.revenue) * 100).toFixed(1)) : 0}
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Margin"
                      dot={{ fill: '#F59E0B', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Expense Breakdown">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={expenseBreakdownData}
                  layout="vertical"
                  onClick={(data) => handleChartClick(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Bar dataKey="amount" fill="#0D9488" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* P&L Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">COGS</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Gross Profit</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">OPEX</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Net Profit</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {plTrendData.map((item) => (
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
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.revenue / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">
                        ₹{(item.cogs / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">
                        ₹{(item.grossProfit / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">
                        ₹{(item.opex / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-2 text-right text-green-600 font-semibold">
                        ₹{(item.netProfit / 100000).toFixed(2)}L
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {item.revenue ? ((item.netProfit / item.revenue) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Profit Bridge Tab */}
      {activeTab === 'bridge' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="Profit Bridge"
              onDrillThrough={() => handleDrillThrough('/detail/financial')}
            >
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={profitBridgeItems}
                    onClick={(data) => handleChartClick(data, 'name')}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                    />
                    <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      cursor="pointer"
                      name="Profit Bridge"
                    >
                      {profitBridgeItems.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Profit Bridge Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit Bridge</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Item</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {profitBridgeItems.map((item) => (
                    <tr
                      key={item.name}
                      onClick={() => {
                        addCrossFilter({
                          id: 'name',
                          label: `Item: ${item.name}`,
                          value: item.name,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.name}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.value / 100000).toFixed(2)}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Balance Sheet Tab */}
      {activeTab === 'balance' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Assets Composition">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={balanceSheetItems.filter(item => item.type === 'asset')}
                  onClick={(data) => handleChartClick(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={80} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                  <Bar dataKey="amount" fill="#0D9488" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Liabilities & Equity">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={balanceSheetItems.filter(item => item.type !== 'asset')}
                  onClick={(data) => handleChartClick(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
                  <Bar dataKey="amount" fill="#4F46E5" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Balance Sheet Table */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Assets</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceSheetItems
                      .filter(item => item.type === 'asset')
                      .map((item) => (
                        <tr
                          key={item.category}
                          className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                          onClick={() => {
                            addCrossFilter({
                              id: 'category',
                              label: `Category: ${item.category}`,
                              value: item.category,
                            });
                          }}
                        >
                          <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                          <td className="py-2 px-2 text-right text-gray-900">
                            ₹{(item.amount / 100000).toFixed(2)}L
                          </td>
                        </tr>
                      ))}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Total Assets</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹
                        {(
                          balanceSheetItems
                            .filter(item => item.type === 'asset')
                            .reduce((sum, item) => sum + item.amount, 0) / 100000
                        ).toFixed(2)}
                        L
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Liabilities & Equity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceSheetItems
                      .filter(item => item.type !== 'asset')
                      .map((item) => (
                        <tr
                          key={item.category}
                          className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                          onClick={() => {
                            addCrossFilter({
                              id: 'category',
                              label: `Category: ${item.category}`,
                              value: item.category,
                            });
                          }}
                        >
                          <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                          <td className="py-2 px-2 text-right text-gray-900">
                            ₹{(item.amount / 100000).toFixed(2)}L
                          </td>
                        </tr>
                      ))}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Total Liabilities & Equity</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹
                        {(
                          balanceSheetItems
                            .filter(item => item.type !== 'asset')
                            .reduce((sum, item) => sum + item.amount, 0) / 100000
                        ).toFixed(2)}
                        L
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cash Flow Tab */}
      {activeTab === 'cashflow' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="Cash Flow Trends"
              onDrillThrough={() => handleDrillThrough('/detail/financial')}
            >
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={filteredCashFlowData}
                    onClick={(data) => handleChartClick(data, 'month')}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="operating"
                      stroke="#0D9488"
                      strokeWidth={2}
                      name="Operating"
                      dot={{ fill: '#0D9488', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="investing"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="Investing"
                      dot={{ fill: '#EF4444', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="financing"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Financing"
                      dot={{ fill: '#F59E0B', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Net Cash Flow">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={filteredCashFlowData}
                  onClick={(data) => handleChartClick(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#0D9488"
                    fill="#0D9488"
                    fillOpacity={0.3}
                    name="Net Cash Flow"
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Cash Flow Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Cash Flow Statement</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Operating</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Investing</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Financing</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Net Cash Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowItems.map((item) => (
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
                        ₹{(item.operating / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        ₹{(item.investing / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        ₹{(item.financing / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-green-600 font-semibold">
                        ₹{(item.net / 1000).toFixed(0)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Financial Ratios Tab */}
      {activeTab === 'ratios' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Liquidity Ratios">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ratiosItems} onClick={(data) => handleChartClick(data, 'month')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 3]} />
                  <Tooltip formatter={(value: any) => Number(value).toFixed(2)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="currentRatio"
                    stroke="#0D9488"
                    strokeWidth={2}
                    name="Current Ratio"
                    dot={{ fill: '#0D9488', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Profitability Ratios">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ratiosItems} onClick={(data) => handleChartClick(data, 'month')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 8]}
                  />
                  <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="roe"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    name="ROE"
                    dot={{ fill: '#4F46E5', r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="roa"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="ROA"
                    dot={{ fill: '#F59E0B', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Ratios Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Financial Ratios</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Current Ratio</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Debt/Equity</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">ROE (%)</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">ROA (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {ratiosItems.map((item) => (
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
                      <td className="py-2 px-2 text-right text-gray-900">
                        {Number(item.currentRatio).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {Number(item.debtEquity).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right text-green-600">
                        {Number(item.roe).toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right text-green-600">
                        {Number(item.roa).toFixed(1)}%
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
            from: 'Financial Deep Dive',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};
