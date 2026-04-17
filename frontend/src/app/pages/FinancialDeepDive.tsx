import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';
import { numericize } from '../services/transforms';
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

const TEAL = '#0D9488';
const INDIGO = '#4F46E5';

export const FinancialDeepDive = () => {
  const [activeTab, setActiveTab] = useState<'pl' | 'bridge' | 'balance' | 'cashflow' | 'ratios'>('pl');
  const navigate = useNavigate();
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    page: string;
  }>({ visible: false, x: 0, y: 0, page: '' });

  // API integration
  const { data: apiPnl } = useApiData<any>('/financial/pnl/', {});
  const { data: apiPnlTrend } = useApiData<any[]>('/financial/pnl-trend/', []);
  const { data: apiExpenses } = useApiData<any[]>('/financial/expense-breakdown/', []);
  const { data: apiBalanceSheet } = useApiData<any>('/financial/balance-sheet/', {});
  const { data: apiCashFlow } = useApiData<any>('/financial/cash-flow/', {});
  const { data: apiRatios } = useApiData<any>('/financial/ratios/', {});
  const { data: apiProfitBridge } = useApiData<any[]>('/financial/profit-bridge/', []);

  // Transform P&L trend — use API's cogs and operating_expenses from pnl endpoint
  const cogs = Number(apiPnl.cogs) || 0;
  const opex = Number(apiPnl.operating_expenses) || 0;
  const totalExpenses = cogs + opex;
  const cogsRatio = totalExpenses > 0 ? cogs / totalExpenses : 0.6;

  const plTrendData = apiPnlTrend.map((r: any) => {
    const revenue = Number(r.revenue) || 0;
    const expenses = Number(r.expenses) || 0;
    const cogsPart = expenses * cogsRatio;
    const grossProfit = revenue - cogsPart;
    return {
      month: r.month || '',
      revenue,
      cogs: cogsPart,
      grossProfit,
      opex: expenses - cogsPart,
      netProfit: Number(r.net_profit) || 0,
    };
  });

  const expenseBreakdownData = apiExpenses.map((r: any) => ({
    name: r.account_name || r.category || '',
    category: r.account_name || r.category || '',
    amount: Number(r.amount) || 0,
  }));

  // Balance sheet — API returns { total_assets, total_liabilities, total_equity, asset_breakdown: [...], liability_breakdown: [...] }
  const assetItems = (apiBalanceSheet.asset_breakdown || []).map((r: any) => ({
    category: r.account_name || r.account_subtype || '',
    amount: Number(r.amount) || 0,
    type: 'asset' as const,
  }));
  const liabilityItems = (apiBalanceSheet.liability_breakdown || []).map((r: any) => ({
    category: r.account_name || r.account_subtype || '',
    amount: Number(r.amount) || 0,
    type: 'liability' as const,
  }));
  const balanceSheetItems = [...assetItems, ...liabilityItems];

  // Cash flow — API returns { operating, investing, financing, net_cash_flow, trend: [...] }
  const cashFlowItems = (Array.isArray(apiCashFlow.trend) && apiCashFlow.trend.length
    ? apiCashFlow.trend.map((r: any) => ({
        month: r.month || r.period || '',
        operating: Number(r.operating) || 0,
        investing: Number(r.investing) || 0,
        financing: Number(r.financing) || 0,
        net: Number(r.net ?? r.net_cash_flow) || 0,
      }))
    : apiCashFlow.operating !== undefined ? [{
        month: 'Current',
        operating: Number(apiCashFlow.operating) || 0,
        investing: Number(apiCashFlow.investing) || 0,
        financing: Number(apiCashFlow.financing) || 0,
        net: Number(apiCashFlow.net_cash_flow) || 0,
      }] : []);

  // Ratios — API returns { current_ratio, debt_to_equity, roe, roa, trend: [...] }
  const ratiosItems = (Array.isArray(apiRatios.trend) && apiRatios.trend.length
    ? apiRatios.trend.map((r: any) => numericize({
        month: r.month || r.period || '',
        currentRatio: Number(r.currentRatio ?? r.current_ratio) || 0,
        debtEquity: Number(r.debtEquity ?? r.debt_to_equity) || 0,
        roe: Number(r.roe) || 0,
        roa: Number(r.roa) || 0,
      }))
    : apiRatios.current_ratio !== undefined ? [numericize({
        month: 'Current',
        currentRatio: Number(apiRatios.current_ratio) || 0,
        debtEquity: Number(apiRatios.debt_to_equity) || 0,
        roe: Number(apiRatios.roe) || 0,
        roa: Number(apiRatios.roa) || 0,
      })] : []);

  // Profit bridge — already an array
  const profitBridgeItems = (Array.isArray(apiProfitBridge) ? apiProfitBridge : []).map((r: any) => ({
    name: r.name || '',
    value: Number(r.value) || 0,
    type: r.type || 'base',
    color: r.type === 'positive' ? '#10B981' : r.type === 'negative' ? '#EF4444' : INDIGO,
  }));

  const tabs = [
    { id: 'pl', label: 'P&L Statement' },
    { id: 'bridge', label: 'Profit Bridge' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'ratios', label: 'Financial Ratios' },
  ];

  // Left-click: toggle cross-filter (select/deselect)
  const handleChartSelect = (data: any, dimension: string) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const val = payload[dimension] || payload.name || payload.category;
      if (val) {
        toggleCrossFilter({ id: dimension, label: `${dimension}: ${val}`, value: val });
      }
    }
  };

  // Right-click: context menu for drill-through
  const handleChartRightClick = (e: MouseEvent, page: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page });
  };

  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));

  const handleDrillThrough = (page: string, filter?: any) => {
    navigate(page, {
      state: {
        drillThrough: {
          from: 'Financial Deep Dive',
          filters: filter ? [filter] : activeFilters.length > 0 ? activeFilters : [],
        },
      },
    });
  };

  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  // KPI values
  const netRevenue = Number(apiPnl.revenue) || 0;
  const grossProfit = Number(apiPnl.gross_profit) || 0;
  const netProfit = Number(apiPnl.net_profit) || 0;
  const grossMargin = netRevenue ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0.0';
  const netMargin = netRevenue ? ((netProfit / netRevenue) * 100).toFixed(1) : '0.0';
  const totalAssets = Number(apiBalanceSheet.total_assets) || 0;
  const totalLiabilities = Number(apiBalanceSheet.total_liabilities) || 0;
  const workingCapital = totalAssets - totalLiabilities;
  const currentRatio = totalLiabilities ? (totalAssets / totalLiabilities).toFixed(1) : '0.0';

  // Filtered data for cross-filtering
  const filteredPLData = plTrendData.filter(item =>
    !hasFilter('month') || isFiltered('month', item.month)
  );
  const filteredCashFlowData = cashFlowItems.filter(item =>
    !hasFilter('month') || isFiltered('month', item.month)
  );

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
        <KPICard title="Net Revenue" value={formatIndianCurrencyAbbreviated(netRevenue)} subtitle="Current Period" onClick={() => handleDrillThrough('/detail/financial')} />
        <KPICard title="Gross Profit" value={formatIndianCurrencyAbbreviated(grossProfit)} subtitle={`Margin: ${grossMargin}%`} />
        <KPICard title="Net Profit" value={formatIndianCurrencyAbbreviated(netProfit)} subtitle={`Margin: ${netMargin}%`} />
        <KPICard title="Total Assets" value={formatIndianCurrencyAbbreviated(totalAssets)} subtitle={`Liabilities: ${formatIndianCurrencyAbbreviated(totalLiabilities)}`} />
        <KPICard title="Working Capital" value={formatIndianCurrencyAbbreviated(workingCapital)} subtitle={`Current Ratio: ${currentRatio}`} />
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
            <ChartCard title="Revenue & Profit Trends" onDrillThrough={() => handleDrillThrough('/detail/financial')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={filteredPLData} onClick={(data) => handleChartSelect(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'Margin') return `${Number(value).toFixed(1)}%`;
                      return formatIndianCurrencyAbbreviated(Number(value));
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" cursor="pointer">
                      {filteredPLData.map((entry, i) => (
                        <Cell key={`rev-${i}`} fill={TEAL} stroke={hasFilter('month') && isFiltered('month', entry.month) ? '#065F46' : 'none'} strokeWidth={2} />
                      ))}
                    </Bar>
                    <Bar yAxisId="left" dataKey="grossProfit" name="Gross Profit" cursor="pointer">
                      {filteredPLData.map((entry, i) => (
                        <Cell key={`gp-${i}`} fill={INDIGO} stroke={hasFilter('month') && isFiltered('month', entry.month) ? '#312E81' : 'none'} strokeWidth={2} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" stroke="#F59E0B" strokeWidth={2} name="Margin" dot={{ fill: '#F59E0B', r: 4 }}
                      dataKey={(data: any) => data.revenue ? Number(((data.grossProfit / data.revenue) * 100).toFixed(1)) : 0} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Expense Breakdown">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/expense')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseBreakdownData} layout="vertical" onClick={(data) => handleChartSelect(data, 'category')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                    <Bar dataKey="amount" cursor="pointer">
                      {expenseBreakdownData.map((entry, i) => (
                        <Cell key={`exp-${i}`} fill={TEAL} stroke={hasFilter('category') && isFiltered('category', entry.category) ? '#065F46' : 'none'} strokeWidth={2} />
                      ))}
                    </Bar>
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
                  {plTrendData.map((item) => {
                    const selected = hasFilter('month') && isFiltered('month', item.month);
                    return (
                      <tr key={item.month}
                        onClick={() => toggleCrossFilter({ id: 'month', label: `Month: ${item.month}`, value: item.month })}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}>
                        <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(item.revenue)}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{formatIndianCurrencyAbbreviated(item.cogs)}</td>
                        <td className="py-2 px-2 text-right text-green-600 font-medium">{formatIndianCurrencyAbbreviated(item.grossProfit)}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{formatIndianCurrencyAbbreviated(item.opex)}</td>
                        <td className="py-2 px-2 text-right text-green-600 font-semibold">{formatIndianCurrencyAbbreviated(item.netProfit)}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{item.revenue ? ((item.netProfit / item.revenue) * 100).toFixed(1) : '0.0'}%</td>
                      </tr>
                    );
                  })}
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
            <ChartCard title="Profit Bridge" onDrillThrough={() => handleDrillThrough('/detail/financial')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitBridgeItems} onClick={(data) => handleChartSelect(data, 'name')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                    <Bar dataKey="value" cursor="pointer" name="Profit Bridge">
                      {profitBridgeItems.map((entry, i) => (
                        <Cell key={`bridge-${i}`} fill={entry.color} stroke={hasFilter('name') && isFiltered('name', entry.name) ? '#1F2937' : 'none'} strokeWidth={2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit Bridge</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Item</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody>
                {profitBridgeItems.map((item) => {
                  const selected = hasFilter('name') && isFiltered('name', item.name);
                  return (
                    <tr key={item.name}
                      onClick={() => toggleCrossFilter({ id: 'name', label: `Item: ${item.name}`, value: item.name })}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}>
                      <td className="py-2 px-2 font-medium text-gray-900">{item.name}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(item.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Balance Sheet Tab */}
      {activeTab === 'balance' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Assets Composition">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={assetItems} onClick={(data) => handleChartSelect(data, 'category')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                    <Bar dataKey="amount" cursor="pointer">
                      {assetItems.map((entry, i) => (
                        <Cell key={`asset-${i}`} fill={TEAL} stroke={hasFilter('category') && isFiltered('category', entry.category) ? '#065F46' : 'none'} strokeWidth={2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Liabilities & Equity">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={liabilityItems} onClick={(data) => handleChartSelect(data, 'category')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                    <Bar dataKey="amount" cursor="pointer">
                      {liabilityItems.map((entry, i) => (
                        <Cell key={`liab-${i}`} fill={INDIGO} stroke={hasFilter('category') && isFiltered('category', entry.category) ? '#312E81' : 'none'} strokeWidth={2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Balance Sheet Tables */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Assets</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Account</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {assetItems.map((item) => {
                    const selected = hasFilter('category') && isFiltered('category', item.category);
                    return (
                      <tr key={item.category}
                        onClick={() => toggleCrossFilter({ id: 'category', label: `Account: ${item.category}`, value: item.category })}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}>
                        <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(item.amount)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-2 text-gray-900">Total Assets</td>
                    <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(totalAssets)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Liabilities & Equity</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Account</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {liabilityItems.map((item) => {
                    const selected = hasFilter('category') && isFiltered('category', item.category);
                    return (
                      <tr key={item.category}
                        onClick={() => toggleCrossFilter({ id: 'category', label: `Account: ${item.category}`, value: item.category })}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}>
                        <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(item.amount)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-2 text-gray-900">Total Liabilities & Equity</td>
                    <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(totalLiabilities + Number(apiBalanceSheet.total_equity || 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Cash Flow Tab */}
      {activeTab === 'cashflow' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Cash Flow Breakdown" onDrillThrough={() => handleDrillThrough('/detail/financial')}>
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredCashFlowData} onClick={(data) => handleChartSelect(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                    <Legend />
                    <Bar dataKey="operating" fill={TEAL} name="Operating" cursor="pointer" />
                    <Bar dataKey="investing" fill="#EF4444" name="Investing" cursor="pointer" />
                    <Bar dataKey="financing" fill="#F59E0B" name="Financing" cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Net Cash Flow">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredCashFlowData} onClick={(data) => handleChartSelect(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                    <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                    <Area type="monotone" dataKey="net" stroke={TEAL} fill={TEAL} fillOpacity={0.3} name="Net Cash Flow" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Cash Flow Statement</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Period</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Operating</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Investing</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Financing</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowItems.map((item) => {
                  const selected = hasFilter('month') && isFiltered('month', item.month);
                  return (
                    <tr key={item.month}
                      onClick={() => toggleCrossFilter({ id: 'month', label: `Period: ${item.month}`, value: item.month })}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}>
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-green-600">{formatIndianCurrencyAbbreviated(item.operating)}</td>
                      <td className="py-2 px-2 text-right text-red-600">{formatIndianCurrencyAbbreviated(item.investing)}</td>
                      <td className="py-2 px-2 text-right text-red-600">{formatIndianCurrencyAbbreviated(item.financing)}</td>
                      <td className="py-2 px-2 text-right text-green-600 font-semibold">{formatIndianCurrencyAbbreviated(item.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Financial Ratios Tab */}
      {activeTab === 'ratios' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="Liquidity Ratios">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratiosItems} onClick={(data) => handleChartSelect(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => Number(value).toFixed(2)} />
                    <Legend />
                    <Bar dataKey="currentRatio" fill={TEAL} name="Current Ratio" cursor="pointer" />
                    <Bar dataKey="debtEquity" fill={INDIGO} name="Debt/Equity" cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Profitability Ratios">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/financial')} className="cursor-pointer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratiosItems} onClick={(data) => handleChartSelect(data, 'month')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="roe" fill={INDIGO} name="ROE" cursor="pointer" />
                    <Bar dataKey="roa" fill="#F59E0B" name="ROA" cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Financial Ratios</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Period</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Current Ratio</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Debt/Equity</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">ROE (%)</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">ROA (%)</th>
                </tr>
              </thead>
              <tbody>
                {ratiosItems.map((item) => {
                  const selected = hasFilter('month') && isFiltered('month', item.month);
                  return (
                    <tr key={item.month}
                      onClick={() => toggleCrossFilter({ id: 'month', label: `Period: ${item.month}`, value: item.month })}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${selected ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}>
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{Number(item.currentRatio).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{Number(item.debtEquity).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{Number(item.roe).toFixed(1)}%</td>
                      <td className="py-2 px-2 text-right text-green-600">{Number(item.roa).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Context Menu (right-click drill-through) */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{ from: 'Financial Deep Dive', filters: activeFilters }}
        />
      )}
    </div>
  );
};
