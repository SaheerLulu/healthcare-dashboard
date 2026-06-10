import { useState } from 'react';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { DrillSource } from '../contexts/DrillSourceContext';
import { useDrillThrough } from '../hooks/useDrillThrough';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';
import { numericize } from '../services/transforms';
import { DrillFilter, monthOf } from '../utils/drill';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';
import {
  BarChart,
  Bar,
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

// Honesty notes shared across this page's visuals (DRILLTHROUGH_DESIGN.md §4)
const REVENUE_NOTE =
  'Revenue from sales fact (journal REVENUE rows are inflated by inter-entry duplication — deliberately not used).';
const CASHFLOW_NOTE =
  'Operating / investing / financing split is classified by narration keywords (heuristic).';
const BALANCE_NOTE =
  'Inventory is injected at cost from the latest stock snapshot (journals do not book it); equity is derived as assets − liabilities so the sheet balances.';
const RATIOS_NOTE =
  'Monthly ratios are running-total approximations (no opening balances).';

export const FinancialDeepDive = () => {
  const [activeTab, setActiveTab] = useState<'pl' | 'bridge' | 'balance' | 'cashflow' | 'ratios'>('pl');
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const { drillTo, openContextMenu, contextMenuElement } = useDrillThrough();

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
      // Raw 'YYYY-MM' for drill filters — chart label drops it
      period: monthOf(r) || '',
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

  // Cash flow — API returns { operating, investing, financing, net_cash_flow, trend: [...] }
  const cashFlowItems = (Array.isArray(apiCashFlow.trend) && apiCashFlow.trend.length
    ? apiCashFlow.trend.map((r: any) => ({
        month: r.month || r.period || '',
        period: monthOf(r) || '',
        operating: Number(r.operating) || 0,
        investing: Number(r.investing) || 0,
        financing: Number(r.financing) || 0,
        net: Number(r.net ?? r.net_cash_flow) || 0,
      }))
    : apiCashFlow.operating !== undefined ? [{
        month: 'Current',
        period: '',
        operating: Number(apiCashFlow.operating) || 0,
        investing: Number(apiCashFlow.investing) || 0,
        financing: Number(apiCashFlow.financing) || 0,
        net: Number(apiCashFlow.net_cash_flow) || 0,
      }] : []);

  // Ratios — API returns { current_ratio, debt_to_equity, roe, roa, trend: [...] }
  const ratiosItems = (Array.isArray(apiRatios.trend) && apiRatios.trend.length
    ? apiRatios.trend.map((r: any) => numericize({
        month: r.month || r.period || '',
        period: monthOf(r) || '',
        currentRatio: Number(r.currentRatio ?? r.current_ratio) || 0,
        debtEquity: Number(r.debtEquity ?? r.debt_to_equity) || 0,
        roe: Number(r.roe) || 0,
        roa: Number(r.roa) || 0,
      }))
    : apiRatios.current_ratio !== undefined ? [numericize({
        month: 'Current',
        period: '',
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

  // ── Drill-filter translation (DRILLTHROUGH_DESIGN.md §1) ────────────────
  // Chart x-axis labels are short month names ('Oct'); drill filters must
  // carry the RAW 'YYYY-MM'. Rebuild label → raw map from the API rows.
  const rawMonthByLabel: Record<string, string> = {};
  for (const r of [
    ...apiPnlTrend,
    ...(Array.isArray(apiCashFlow.trend) ? apiCashFlow.trend : []),
    ...(Array.isArray(apiRatios.trend) ? apiRatios.trend : []),
  ]) {
    const raw = monthOf(r);
    if (raw && r.month) rawMonthByLabel[String(r.month)] = raw;
  }

  const toRawMonth = (value: string): string | undefined =>
    /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : rawMonthByLabel[value];

  // Active month cross-filters translated to raw backend `month` params.
  const monthDrillFilters = (): DrillFilter[] =>
    activeFilters
      .filter(f => f.id === 'month')
      .map((f): DrillFilter | null => {
        const raw = toRawMonth(String(f.value));
        return raw ? { id: 'month', label: `Month: ${raw}`, value: raw } : null;
      })
      .filter((f): f is DrillFilter => !!f);

  // Expense-breakdown cross-filters ('category') hold ledger account names →
  // backend `account_name` param.
  const expenseDrillFilters = (): DrillFilter[] => [
    ...monthDrillFilters(),
    ...activeFilters
      .filter(f => f.id === 'category')
      .map((f): DrillFilter => ({ id: 'account_name', label: `Account: ${f.value}`, value: String(f.value) })),
  ];

  // Balance-sheet 'category' values are account subtypes (Receivable, Cash…).
  const balanceDrillFilters = (accountType: string) => (): DrillFilter[] => [
    { id: 'account_type', label: `Type: ${accountType}`, value: accountType },
    ...activeFilters
      .filter(f => f.id === 'category')
      .map((f): DrillFilter => ({ id: 'account_subtype', label: `Subtype: ${f.value}`, value: String(f.value) })),
    ...monthDrillFilters(),
  ];

  // Cash-flow visuals drill to the cash-touching journal lines.
  const cashFlowDrillFilters = (): DrillFilter[] => [
    { id: 'account_subtype', label: 'Account: Cash/Bank', value: 'Cash,Bank' },
    ...monthDrillFilters(),
  ];

  // Row helper: raw-month filter for a table row (skips synthetic rows).
  const monthRowFilters = (period: string): DrillFilter[] =>
    period && /^\d{4}-\d{2}/.test(period)
      ? [{ id: 'month', label: `Month: ${period}`, value: period }]
      : [];

  // Profit-bridge rows: expense steps carry their account subtype.
  const bridgeRowFilters = (item: { name: string; type: string }): DrillFilter[] =>
    item.type === 'negative' && item.name !== 'COGS'
      ? [
          { id: 'account_type', label: 'Type: EXPENSE', value: 'EXPENSE' },
          { id: 'account_subtype', label: `Subtype: ${item.name}`, value: item.name },
          ...monthDrillFilters(),
        ]
      : monthDrillFilters();

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

  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  // KPI values
  const netRevenue = Number(apiPnl.revenue) || 0;
  const grossProfit = Number(apiPnl.gross_profit) || 0;
  const netProfit = Number(apiPnl.net_profit) || 0;
  const grossMargin = netRevenue ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0.0';
  const netMargin = netRevenue ? ((netProfit / netRevenue) * 100).toFixed(1) : '0.0';
  const totalAssets = Number(apiBalanceSheet.total_assets) || 0;
  const totalLiabilities = Number(apiBalanceSheet.total_liabilities) || 0;
  // Use Receivables - Payables to match the /working-capital page; previously
  // this used `total_assets - total_liabilities` which gave a different number
  // for the same data on the two pages.
  const findAmt = (arr: any[] = [], subtype: string) => {
    const row = arr.find((r: any) => r.account_subtype === subtype);
    return row ? Number(row.amount) || 0 : 0;
  };
  const receivablesAmt = findAmt(apiBalanceSheet.asset_breakdown, 'Receivable');
  const payablesAmt = findAmt(apiBalanceSheet.liability_breakdown, 'Payable');
  const workingCapital = receivablesAmt - payablesAmt;
  const currentRatio = totalLiabilities ? (totalAssets / totalLiabilities).toFixed(1) : '0.0';

  // Filtered data for cross-filtering
  const filteredPLData = plTrendData.filter(item =>
    !hasFilter('month') || isFiltered('month', item.month)
  );
  const filteredCashFlowData = cashFlowItems.filter(item =>
    !hasFilter('month') || isFiltered('month', item.month)
  );

  return (
    <DrillSource name="Financial Deep Dive">
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Deep Dive</h1>
        <div className="flex gap-2 flex-shrink-0">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap">
            Export P&L
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap">
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
          onClick={() => drillTo('/detail/financial', monthDrillFilters())}
          info={{
            formula: 'Σ line_total of POS + B2B sales lines in the selected window',
            source: 'report_sales via /financial/pnl/',
            notes: REVENUE_NOTE,
          }}
        />
        <KPICard
          title="Gross Profit"
          value={formatIndianCurrencyAbbreviated(grossProfit)}
          subtitle={`Margin: ${grossMargin}%`}
          onClick={() => drillTo('/detail/financial', monthDrillFilters())}
          info={{
            formula: 'Σ gross_margin (line revenue − cost) on sales lines; margin % = gross profit ÷ revenue',
            source: 'report_sales via /financial/pnl/',
            notes: `COGS is estimated as unit_price × 0.7 when the purchase rate is missing in the source (pipeline estimate). ${REVENUE_NOTE}`,
          }}
        />
        <KPICard
          title="Net Profit"
          value={formatIndianCurrencyAbbreviated(netProfit)}
          subtitle={`Margin: ${netMargin}%`}
          onClick={() => drillTo('/detail/financial', [
            { id: 'account_type', label: 'Type: EXPENSE', value: 'EXPENSE' },
            ...monthDrillFilters(),
          ])}
          info={{
            formula: 'Gross profit − operating expenses (EXPENSE ledgers excl. Purchases)',
            source: 'report_sales (revenue, margin) + report_financial (expenses) via /financial/pnl/',
            notes: `COGS estimated as unit_price × 0.7 when purchase rate is missing. ${REVENUE_NOTE}`,
          }}
        />
        <KPICard
          title="Total Assets"
          value={formatIndianCurrencyAbbreviated(totalAssets)}
          subtitle={`Liabilities: ${formatIndianCurrencyAbbreviated(totalLiabilities)}`}
          onClick={() => drillTo('/detail/financial', [
            { id: 'account_type', label: 'Type: ASSET', value: 'ASSET' },
            ...monthDrillFilters(),
          ])}
          info={{
            formula: 'Σ debit − credit on ASSET ledgers + inventory at cost from the latest snapshot',
            source: 'report_financial + report_inventory via /financial/balance-sheet/',
            notes: BALANCE_NOTE,
          }}
        />
        <KPICard
          title="Working Capital"
          value={formatIndianCurrencyAbbreviated(workingCapital)}
          subtitle={`Current Ratio: ${currentRatio}`}
          onClick={() => drillTo('/detail/financial', [
            { id: 'account_subtype', label: 'Subtype: Receivable/Payable', value: 'Receivable,Payable' },
            ...monthDrillFilters(),
          ])}
          info={{
            formula: 'Receivables − Payables (matches the Working Capital page)',
            source: 'report_financial breakdown via /financial/balance-sheet/',
            notes: 'Current ratio shown = total assets ÷ total liabilities (with inventory injected on the asset side).',
          }}
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
              data={filteredPLData}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'month', label: 'Month' },
                { key: 'revenue', label: 'Revenue', format: formatIndianCurrencyAbbreviated },
                { key: 'cogs', label: 'COGS', format: formatIndianCurrencyAbbreviated },
                { key: 'grossProfit', label: 'Gross Profit', format: formatIndianCurrencyAbbreviated },
                { key: 'opex', label: 'OPEX', format: formatIndianCurrencyAbbreviated },
                { key: 'netProfit', label: 'Net Profit', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/financial"
              drillFilters={monthDrillFilters}
              info={{
                formula: 'Monthly Σ revenue (sales line_total) vs gross profit; margin % = gross profit ÷ revenue × 100',
                source: 'report_sales (revenue) + report_financial (expenses) via /financial/pnl-trend/',
                notes: `${REVENUE_NOTE} Monthly COGS/OPEX split is approximated using the period-total COGS ratio.`,
              }}
            >
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
                    dataKey={(data: any) => {
                      // Skip months with no revenue (early periods often
                      // have expense entries but no sales — division blew
                      // up to -6000%). Cap remaining at [-100, 100].
                      if (!data.revenue) return null;
                      const m = (data.grossProfit / data.revenue) * 100;
                      if (!isFinite(m)) return null;
                      return Number(Math.max(-100, Math.min(100, m)).toFixed(1));
                    }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Expense Breakdown"
              data={expenseBreakdownData}
              columns={[
                { key: 'category', label: 'Account' },
                { key: 'amount', label: 'Amount', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/expense"
              drillFilters={expenseDrillFilters}
              info={{
                formula: 'Σ debit − credit per expense ledger account (account_type = EXPENSE)',
                source: 'report_financial via /financial/expense-breakdown/',
              }}
            >
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
                        onContextMenu={(e) => openContextMenu(e, '/detail/financial', monthRowFilters(item.period), item)}
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
            <ChartCard
              title="Profit Bridge"
              data={profitBridgeItems}
              columns={[
                { key: 'name', label: 'Item' },
                { key: 'value', label: 'Value', format: formatIndianCurrencyAbbreviated },
                { key: 'type', label: 'Type' },
              ]}
              drillTarget="/detail/financial"
              drillFilters={monthDrillFilters}
              info={{
                formula: 'Revenue − COGS = gross profit, then minus each expense subtype (top 8 by amount) = net profit',
                source: 'report_sales (revenue, margin) + report_financial EXPENSE rows via /financial/profit-bridge/',
                notes: `${REVENUE_NOTE} COGS estimated as unit_price × 0.7 when purchase rate is missing.`,
              }}
            >
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
                      onContextMenu={(e) => openContextMenu(e, '/detail/financial', bridgeRowFilters(item), item)}
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
            <ChartCard
              title="Assets Composition"
              data={assetItems}
              columns={[
                { key: 'category', label: 'Account' },
                { key: 'amount', label: 'Amount', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/financial"
              drillFilters={balanceDrillFilters('ASSET')}
              info={{
                formula: 'Σ debit − credit per ASSET account subtype, plus inventory at cost',
                source: 'report_financial + report_inventory via /financial/balance-sheet/',
                notes: BALANCE_NOTE,
              }}
            >
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
            </ChartCard>

            <ChartCard
              title="Liabilities & Equity"
              data={liabilityItems}
              columns={[
                { key: 'category', label: 'Account' },
                { key: 'amount', label: 'Amount', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/financial"
              drillFilters={balanceDrillFilters('LIABILITY,EQUITY')}
              info={{
                formula: 'Σ credit − debit per LIABILITY and EQUITY account subtype',
                source: 'report_financial via /financial/balance-sheet/',
                notes: BALANCE_NOTE,
              }}
            >
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
                        onContextMenu={(e) => openContextMenu(e, '/detail/financial', [
                          { id: 'account_type', label: 'Type: ASSET', value: 'ASSET' },
                          { id: 'account_subtype', label: `Subtype: ${item.category}`, value: item.category },
                          ...monthDrillFilters(),
                        ], item)}
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
                        onContextMenu={(e) => openContextMenu(e, '/detail/financial', [
                          { id: 'account_type', label: 'Type: LIABILITY/EQUITY', value: 'LIABILITY,EQUITY' },
                          { id: 'account_subtype', label: `Subtype: ${item.category}`, value: item.category },
                          ...monthDrillFilters(),
                        ], item)}
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
            <ChartCard
              title="Cash Flow Breakdown"
              data={filteredCashFlowData}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'month', label: 'Month' },
                { key: 'operating', label: 'Operating', format: formatIndianCurrencyAbbreviated },
                { key: 'investing', label: 'Investing', format: formatIndianCurrencyAbbreviated },
                { key: 'financing', label: 'Financing', format: formatIndianCurrencyAbbreviated },
                { key: 'net', label: 'Net Cash Flow', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/financial"
              drillFilters={cashFlowDrillFilters}
              info={{
                formula: 'Monthly Σ debit − credit on Cash & Bank ledger lines, bucketed into operating / investing / financing',
                source: 'report_financial via /financial/cash-flow/',
                notes: CASHFLOW_NOTE,
              }}
            >
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
            </ChartCard>

            <ChartCard
              title="Net Cash Flow"
              data={filteredCashFlowData}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'month', label: 'Month' },
                { key: 'net', label: 'Net Cash Flow', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/financial"
              drillFilters={cashFlowDrillFilters}
              info={{
                formula: 'Operating + investing + financing per month (net movement on Cash & Bank ledgers)',
                source: 'report_financial via /financial/cash-flow/',
                notes: CASHFLOW_NOTE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={filteredCashFlowData} onClick={(data) => handleChartSelect(data, 'month')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatIndianCurrencyAbbreviated(v)} />
                  <Tooltip formatter={(value: any) => formatIndianCurrencyAbbreviated(value)} />
                  <Area type="monotone" dataKey="net" stroke={TEAL} fill={TEAL} fillOpacity={0.3} name="Net Cash Flow" />
                </AreaChart>
              </ResponsiveContainer>
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
                      onContextMenu={(e) => openContextMenu(e, '/detail/financial', [
                        { id: 'account_subtype', label: 'Account: Cash/Bank', value: 'Cash,Bank' },
                        ...monthRowFilters(item.period),
                      ], item)}
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
            <ChartCard
              title="Liquidity Ratios"
              data={ratiosItems}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'month', label: 'Month' },
                { key: 'currentRatio', label: 'Current Ratio' },
                { key: 'debtEquity', label: 'Debt/Equity' },
              ]}
              drillTarget="/detail/financial"
              drillFilters={monthDrillFilters}
              info={{
                formula: 'Current ratio = current assets ÷ current liabilities; debt/equity = total liabilities ÷ equity, per month',
                source: 'report_financial via /financial/ratios/',
                notes: RATIOS_NOTE,
              }}
            >
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
            </ChartCard>

            <ChartCard
              title="Profitability Ratios"
              data={ratiosItems}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'month', label: 'Month' },
                { key: 'roe', label: 'ROE %' },
                { key: 'roa', label: 'ROA %' },
              ]}
              drillTarget="/detail/financial"
              drillFilters={monthDrillFilters}
              info={{
                formula: 'ROE = net profit ÷ equity × 100; ROA = net profit ÷ total assets × 100, per month',
                source: 'report_financial via /financial/ratios/',
                notes: RATIOS_NOTE,
              }}
            >
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
                      onContextMenu={(e) => openContextMenu(e, '/detail/financial', monthRowFilters(item.period), item)}
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

      {/* Context menu for non-ChartCard visuals (table rows) */}
      {contextMenuElement}
    </div>
    </DrillSource>
  );
};
