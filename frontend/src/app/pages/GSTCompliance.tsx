import { useState } from 'react';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { DrillSource } from '../contexts/DrillSourceContext';
import { useDrillThrough } from '../hooks/useDrillThrough';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useFilters } from '../contexts/FilterContext';
import { DrillFilter } from '../utils/drill';
import { formatIndianCurrencyAbbreviated } from '../utils/formatters';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { numericize, monthLabel } from '../services/transforms';


const COLORS = ['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981'];

const GST_SOURCE = 'report_gst — unioned from accounting GSTR-1 / GSTR-3B / GSTR-2B / ITC / RCM registers';

// Cross-filter dimension id → backend drill param (DRILLTHROUGH_DESIGN.md §1).
// itcCategory has no backend dimension and is dropped on translation.
const CROSS_TO_DRILL_ID: Record<string, string> = {
  month: 'month',
  rate: 'gst_rate',
  supplier: 'supplier_name',
  rcmSupplier: 'supplier_name',
};

/** Paginated detail endpoints return {results: [...]}; older ones a plain array. */
const asRows = (d: any): any[] =>
  Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];

/** '2025-10' → 'Oct 25' (chart label); raw period is kept alongside for drills. */
const monYY = (period: string): string =>
  /^\d{4}-\d{2}/.test(period || '') ? `${monthLabel(period)} ${period.slice(2, 4)}` : period || '';

const taxOf = (r: any): number =>
  (Number(r.cgst) || 0) + (Number(r.sgst) || 0) + (Number(r.igst) || 0);

export const GSTCompliance = () => {
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b' | 'itc' | 'rcm'>('gstr1');
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const { filters } = useFilters();
  const { drillTo, openContextMenu, contextMenuElement } = useDrillThrough();

  // API integration
  const { data: apiGstOverview } = useApiData<any>('/gst/overview/', {});
  const { data: apiGstr1 } = useApiData<any>('/gst/gstr1/', []);
  // gstr3b/rcm are paginated (default page 50); these page aggregates need
  // the full window, so request the server cap explicitly.
  const { data: apiGstr3b } = useApiData<any>('/gst/gstr3b/', [], { params: { page_size: 500 } });
  const { data: apiItc } = useApiData<any>('/gst/itc/', {});
  const { data: apiRcm } = useApiData<any>('/gst/rcm/', [], { params: { page_size: 500 } });
  const { data: apiByRate } = useApiData<any>('/gst/by-rate/', []);
  const { data: apiComplianceStatus } = useApiData<any>('/gst/compliance-status/', []);

  // ── Page-local adapters: rebuild chart shapes (and raw YYYY-MM periods)
  //    from the API rows (DRILLTHROUGH_DESIGN.md §1 — drills carry raw month).

  // GSTR-1: rows are {period, invoice_type, taxable, cgst, sgst, igst} —
  // pivot to one row per month with b2b / b2c / export stacks.
  const gstr1Raw = asRows(apiGstr1).map(numericize);
  const effectiveGstr1 = (() => {
    if (gstr1Raw.length && gstr1Raw[0].invoice_type === undefined && gstr1Raw[0].total !== undefined) {
      return gstr1Raw; // legacy pre-pivoted shape
    }
    const byMonth: Record<string, any> = {};
    for (const r of gstr1Raw) {
      const period = String(r.period || r.month || '').slice(0, 7);
      if (!period) continue;
      if (!byMonth[period]) {
        byMonth[period] = { period, month: monYY(period), b2b: 0, b2c: 0, export: 0, total: 0 };
      }
      const row = byMonth[period];
      const tax = taxOf(r);
      const t = String(r.invoice_type || '').toUpperCase();
      if (t.startsWith('B2B')) row.b2b += tax;
      else if (t.startsWith('B2C')) row.b2c += tax;
      else if (t.startsWith('EXP')) row.export += tax;
      row.total += tax;
    }
    return Object.keys(byMonth).sort().map((k) => byMonth[k]);
  })();

  // GSTR-3B: rows are {period, cgst.., itc_*, net_payable_*, filing_status} —
  // aggregate per month across locations.
  const gstr3bRaw = asRows(apiGstr3b).map(numericize);
  const effectiveGstr3b = (() => {
    const byMonth: Record<string, any> = {};
    for (const r of gstr3bRaw) {
      const period = String(r.period || r.month || '').slice(0, 7);
      if (!period) continue;
      if (!byMonth[period]) {
        byMonth[period] = { period, month: monYY(period), output: 0, itc: 0, payable: 0, filed: true };
      }
      const row = byMonth[period];
      row.output += Number(r.output) || taxOf(r);
      row.itc +=
        Number(r.itc) ||
        (Number(r.itc_cgst) || 0) + (Number(r.itc_sgst) || 0) + (Number(r.itc_igst) || 0);
      row.payable +=
        Number(r.payable) ||
        (Number(r.net_payable_cgst) || 0) +
          (Number(r.net_payable_sgst) || 0) +
          (Number(r.net_payable_igst) || 0);
      if ((r.filing_status || r.status) !== 'filed') row.filed = false;
    }
    return Object.keys(byMonth)
      .sort()
      .map((k) => {
        const row = byMonth[k];
        return { ...row, status: row.filed ? 'filed' : 'pending', paid: row.filed ? row.payable : 0 };
      });
  })();

  // ITC: endpoint returns {eligible, ineligible, matched, unmatched, missing} amounts/counts.
  const itcBreakdownRaw: any[] = Array.isArray(apiItc.breakdown)
    ? apiItc.breakdown.map(numericize)
    : [
        { category: 'Eligible ITC', value: Number(apiItc.eligible) || 0 },
        { category: 'Ineligible ITC', value: Number(apiItc.ineligible) || 0 },
      ].filter((r) => r.value > 0);
  const itcTotal = itcBreakdownRaw.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const effectiveItc = itcBreakdownRaw.map((r) => ({
    ...r,
    percent: r.percent ?? (itcTotal ? ((Number(r.value) || 0) / itcTotal) * 100 : 0),
  }));

  // RCM: rows are {period, supplier_name, taxable_value, cgst, sgst, igst} —
  // aggregate per supplier.
  const rcmRaw = asRows(apiRcm).map(numericize);
  const effectiveRcm = (() => {
    if (rcmRaw.length && rcmRaw[0].amount !== undefined && rcmRaw[0].supplier !== undefined) {
      return rcmRaw; // legacy pre-aggregated shape
    }
    const bySupplier: Record<string, any> = {};
    for (const r of rcmRaw) {
      const supplier = r.supplier_name || r.supplier || 'Unknown';
      if (!bySupplier[supplier]) {
        bySupplier[supplier] = { supplier, supplier_name: supplier, amount: 0, gst: 0, period: '', month: '' };
      }
      const row = bySupplier[supplier];
      row.amount += Number(r.taxable_value) || 0;
      row.gst += taxOf(r);
      const period = String(r.period || '').slice(0, 7);
      if (period > row.period) {
        row.period = period;
        row.month = monYY(period);
      }
    }
    return Object.values(bySupplier).sort((a: any, b: any) => b.gst - a.gst);
  })();

  // By-rate: rows are {gst_rate, count, taxable, total_tax}.
  const effectiveByRate = asRows(apiByRate)
    .map(numericize)
    .map((r: any) => ({
      ...r,
      gst_rate: r.gst_rate ?? (typeof r.rate === 'string' ? parseFloat(r.rate) : r.rate),
      rate: r.gst_rate !== undefined && r.gst_rate !== null ? `${r.gst_rate}%` : r.rate,
      base: r.base ?? r.taxable ?? 0,
      gst: r.gst ?? r.total_tax ?? 0,
    }));

  // Compliance status: rows are {period, filing_status, filed_date, location_name}.
  // GSTR-3B is due on the 20th of the following month.
  const now = new Date();
  const effectiveComplianceStatus = asRows(apiComplianceStatus)
    .map(numericize)
    .map((r: any) => {
      if (r.return || r.return_type) return r; // legacy shape
      const period = String(r.period || '').slice(0, 7);
      const [y, m] = period.split('-').map(Number);
      let dueDate = '';
      let daysLeft = 0;
      if (y && m) {
        const due = new Date(y, m, 20);
        dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-20`;
        daysLeft = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000));
      }
      const filed = r.filing_status === 'filed';
      return {
        ...r,
        return: 'GSTR-3B',
        period,
        dueDate,
        status: filed ? 'filed' : 'pending',
        daysLeft,
        filedOn: r.filed_date || '',
      };
    });

  // KPI numbers (legacy *_display fields win when the API provides them).
  const outputGst = Number(apiGstOverview.output_gst) || 0;
  const itcAmount = Number(apiGstOverview.input_tax_credit ?? apiGstOverview.itc) || 0;
  const netPayable = Number(apiGstOverview.net_liability ?? apiGstOverview.payable) || 0;
  const pendingReturns = Number(apiGstOverview.filings_pending ?? apiGstOverview.pending_returns) || 0;
  const filedCount = effectiveComplianceStatus.filter((r: any) => r.status === 'filed').length;
  const complianceRate = effectiveComplianceStatus.length
    ? (filedCount / effectiveComplianceStatus.length) * 100
    : 0;

  // BUG FIX: table titles used to hardcode 'Mar 2026' — derive the label from
  // the active date-filter window instead.
  const fmtMonthYear = (iso: string): string => {
    const m = /^(\d{4})-(\d{2})/.exec(iso || '');
    return m ? `${monthLabel(`${m[1]}-${m[2]}`)} ${m[1]}` : '';
  };
  const windowLabel = (() => {
    const s = fmtMonthYear(filters.dateRange.start);
    const e = fmtMonthYear(filters.dateRange.end);
    if (!s && !e) return '';
    if (s === e) return s;
    return `${s} – ${e}`;
  })();

  const tabs = [
    { id: 'gstr1', label: 'GSTR-1 (Sales)' },
    { id: 'gstr3b', label: 'GSTR-3B (Monthly)' },
    { id: 'itc', label: 'ITC Analysis' },
    { id: 'rcm', label: 'Reverse Charge' },
  ];

  const handleChartSelect = (data: any, dimension: string) => {
    if (data?.activePayload?.[0]) {
      const payload = data.activePayload[0].payload;
      const val = payload[dimension] || payload.name || payload.category;
      if (val) toggleCrossFilter({ id: dimension, label: `${dimension}: ${val}`, value: val });
    }
  };

  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  // Month chart labels ('Oct 25') → raw 'YYYY-MM' for drill params.
  const rawMonthByLabel: Record<string, string> = {};
  for (const r of [...effectiveGstr1, ...effectiveGstr3b]) {
    if (r.period && r.month) rawMonthByLabel[r.month] = r.period;
  }

  // Active cross-filters translated to backend drill params (rule §1).
  const crossDrillFilters = (): DrillFilter[] =>
    activeFilters
      .map((f): DrillFilter | null => {
        const id = CROSS_TO_DRILL_ID[f.id];
        if (!id) return null; // e.g. itcCategory — no backend dimension
        let value = String(f.value);
        if (f.id === 'month') {
          const raw = /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : rawMonthByLabel[value];
          if (!raw) return null;
          value = raw;
        }
        if (f.id === 'rate') value = value.replace('%', '');
        return { id, label: f.label, value };
      })
      .filter((f): f is DrillFilter => !!f);

  const sourceFilter = (table: string, label: string): DrillFilter => ({
    id: 'source_table',
    label: `Register: ${label}`,
    value: table,
  });

  /** Chart-level drill filters: register + this page's active cross-filters. */
  const drillWithSource = (table: string, label: string) => (): DrillFilter[] => [
    sourceFilter(table, label),
    ...crossDrillFilters(),
  ];

  const monthFilter = (item: any): DrillFilter[] =>
    item.period
      ? [{ id: 'month', label: `Month: ${item.month || item.period}`, value: item.period }]
      : [];

  // Apply cross-filtering
  const filteredGSTR1 = effectiveGstr1.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  const filteredGSTR3B = effectiveGstr3b.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  // Net GST Payable waterfall (GSTR-3B tab).
  const waterfallData = [
    { label: 'Output GST', amount: outputGst, color: '#0D9488' },
    { label: 'Input Tax Credit', amount: -itcAmount, color: '#4F46E5' },
    { label: 'Net Payable', amount: netPayable || outputGst - itcAmount, color: '#EF4444' },
  ];

  return (
    <DrillSource name="GST & Compliance Center">
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">GST & Compliance Center</h1>
        <div className="flex gap-2 flex-shrink-0">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap">
            Download Returns
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap">
            File GSTR-1
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Output GST"
          value={apiGstOverview.output_gst_display || formatIndianCurrencyAbbreviated(outputGst)}
          subtitle={apiGstOverview.output_gst_period || windowLabel}
          trend={{ value: apiGstOverview.output_gst_trend || '0%', direction: 'up' }}
          onClick={() => drillTo('/detail/gst', [sourceFilter('gstr1', 'GSTR-1'), ...crossDrillFilters()])}
          icon={<FileText className="w-5 h-5 text-teal-600" />}
          info={{
            formula: 'Σ (CGST + SGST + IGST) on GSTR-1 outward supply lines in the selected window',
            source: GST_SOURCE,
          }}
        />
        <KPICard
          title="Input Tax Credit"
          value={apiGstOverview.itc_display || formatIndianCurrencyAbbreviated(itcAmount)}
          subtitle={apiGstOverview.itc_subtitle || windowLabel}
          trend={{ value: apiGstOverview.itc_trend || '0%', direction: 'up' }}
          onClick={() => drillTo('/detail/gst', [sourceFilter('itc,gstr2b', 'ITC / GSTR-2B'), ...crossDrillFilters()])}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          info={{
            formula: 'Σ ITC heads (CGST + SGST + IGST) from GSTR-3B summaries in the window',
            source: GST_SOURCE,
            notes: 'When no GSTR-3B summary exists for the window, ITC falls back to Σ tax on GSTR-2B inward supplies.',
          }}
        />
        <KPICard
          title="GST Payable"
          value={apiGstOverview.payable_display || formatIndianCurrencyAbbreviated(netPayable)}
          subtitle={apiGstOverview.payable_subtitle || windowLabel}
          trend={{ value: apiGstOverview.payable_trend || '0%', direction: 'up' }}
          onClick={() => drillTo('/detail/gst', [sourceFilter('gstr3b', 'GSTR-3B'), ...crossDrillFilters()])}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          info={{
            formula: 'Σ net payable (CGST + SGST + IGST) from GSTR-3B summaries in the window',
            source: GST_SOURCE,
            notes: 'When no GSTR-3B summary exists, payable is derived as max(Output GST − ITC, 0).',
          }}
        />
        <KPICard
          title="Pending Returns"
          value={String(pendingReturns)}
          subtitle={apiGstOverview.pending_returns_subtitle || windowLabel}
          trend={{ value: '0', direction: 'up' }}
          onClick={() =>
            drillTo('/detail/gst', [
              { id: 'filing_status', label: 'Filing status: draft', value: 'draft' },
              ...crossDrillFilters(),
            ])
          }
          info={{
            formula: 'Count of GSTR-3B summaries in the window with filing_status = draft',
            source: GST_SOURCE,
          }}
        />
        <KPICard
          title="Compliance Rate"
          value={apiGstOverview.compliance_rate_display || `${complianceRate.toFixed(0)}%`}
          subtitle={apiGstOverview.compliance_rate_subtitle || `${filedCount}/${effectiveComplianceStatus.length} returns filed`}
          trend={{ value: apiGstOverview.compliance_rate_trend || '0%', direction: 'up' }}
          onClick={() => drillTo('/detail/gst', [sourceFilter('gstr3b', 'GSTR-3B'), ...crossDrillFilters()])}
          info={{
            formula: 'Filed GSTR-3B returns ÷ returns due in the window × 100',
            source: GST_SOURCE,
            notes: 'Computed client-side from GSTR-3B filing-status rows; due dates assume the standard 20th-of-following-month GSTR-3B deadline.',
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

      {/* GSTR-1 Tab */}
      {activeTab === 'gstr1' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="GSTR-1 Output GST Trend"
              data={filteredGSTR1}
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'b2b', label: 'B2B GST', format: formatIndianCurrencyAbbreviated },
                { key: 'b2c', label: 'B2C GST', format: formatIndianCurrencyAbbreviated },
                { key: 'export', label: 'Export GST', format: formatIndianCurrencyAbbreviated },
                { key: 'total', label: 'Total Output GST', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('gstr1', 'GSTR-1')}
              info={{
                formula: 'Monthly Σ (CGST + SGST + IGST) on GSTR-1 outward supplies, stacked by invoice type (B2B / B2C / Export)',
                source: GST_SOURCE,
                notes: 'Other invoice types (e.g. credit notes) are included in the Total line but not in the stacked bars.',
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={filteredGSTR1}
                  onClick={(data) => handleChartSelect(data, 'month')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Legend />
                  <Bar dataKey="b2b" stackId="a" fill="#0D9488" name="B2B" />
                  <Bar dataKey="b2c" stackId="a" fill="#4F46E5" name="B2C" />
                  <Bar dataKey="export" stackId="a" fill="#F59E0B" name="Export" />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Total"
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Output GST by Tax Rate"
              data={effectiveByRate}
              columns={[
                { key: 'rate', label: 'GST Rate' },
                { key: 'base', label: 'Base Amount', format: formatIndianCurrencyAbbreviated },
                { key: 'gst', label: 'GST Amount', format: formatIndianCurrencyAbbreviated },
                { key: 'count', label: 'Lines' },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('gstr1', 'GSTR-1')}
              info={{
                formula: 'Σ taxable value (base) and Σ (CGST + SGST + IGST) on GSTR-1 lines, grouped by GST rate',
                source: GST_SOURCE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={effectiveByRate}
                  onClick={(data) => handleChartSelect(data, 'rate')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="rate" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: any) => {
                      return `₹${(value / 1000).toFixed(2)}K`;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="base" fill="#0D9488" name="Base Amount" />
                  <Bar dataKey="gst" fill="#EF4444" name="GST Amount" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* GSTR-1 Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">GSTR-1 Monthly Summary (Last 6 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">B2B Sales</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">B2C Sales</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Exports</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Total Output GST</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveGstr1.map((item) => (
                    <tr
                      key={item.month}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'month',
                          label: `Month: ${item.month}`,
                          value: item.month,
                        });
                      }}
                      onContextMenu={(e) =>
                        openContextMenu(
                          e,
                          '/detail/gst',
                          [sourceFilter('gstr1', 'GSTR-1'), ...monthFilter(item)],
                          item,
                        )
                      }
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('month') && isFiltered('month', item.month) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{((Number(item.b2b) || 0) / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{((Number(item.b2c) || 0) / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{((Number(item.export) || 0) / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-teal-600 font-semibold">
                        ₹{((Number(item.total) || 0) / 1000).toFixed(0)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* GSTR-3B Tab */}
      {activeTab === 'gstr3b' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="GST Computation Trend"
              data={filteredGSTR3B}
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'output', label: 'Output GST', format: formatIndianCurrencyAbbreviated },
                { key: 'itc', label: 'Input Tax Credit', format: formatIndianCurrencyAbbreviated },
                { key: 'payable', label: 'GST Payable', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('gstr3b', 'GSTR-3B')}
              info={{
                formula: 'Per month from GSTR-3B summaries: Output GST = Σ (CGST + SGST + IGST); ITC = Σ ITC heads; Payable = Σ net-payable heads',
                source: GST_SOURCE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={filteredGSTR3B}
                  onClick={(data) => handleChartSelect(data, 'month')}
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
                    dataKey="output"
                    stroke="#0D9488"
                    strokeWidth={2}
                    name="Output GST"
                    dot={{ fill: '#0D9488', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="itc"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    name="Input Tax Credit"
                    dot={{ fill: '#4F46E5', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="payable"
                    stroke="#EF4444"
                    strokeWidth={3}
                    name="GST Payable"
                    dot={{ fill: '#EF4444', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Net GST Payable"
              data={waterfallData}
              columns={[
                { key: 'label', label: 'Component' },
                { key: 'amount', label: 'Amount', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/gst"
              drillFilters={crossDrillFilters}
              info={{
                formula: 'Net payable = Output GST (GSTR-1) − Input Tax Credit, shown as a three-step waterfall',
                source: GST_SOURCE,
                notes: 'When no GSTR-3B summary exists for the window, ITC falls back to GSTR-2B and net payable to max(Output − ITC, 0).',
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={waterfallData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Bar dataKey="amount">
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* GSTR-3B Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">GSTR-3B Filing Status (Last 6 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Output GST</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">ITC</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Payable</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Paid</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveGstr3b.map((item) => (
                    <tr
                      key={item.month}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'month',
                          label: `Month: ${item.month}`,
                          value: item.month,
                        });
                      }}
                      onContextMenu={(e) =>
                        openContextMenu(
                          e,
                          '/detail/gst',
                          [sourceFilter('gstr3b', 'GSTR-3B'), ...monthFilter(item)],
                          item,
                        )
                      }
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('month') && isFiltered('month', item.month) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.output / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-green-600">
                        ₹{(item.itc / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-red-600 font-semibold">
                        ₹{(item.payable / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {item.paid > 0 ? `₹${(item.paid / 1000).toFixed(1)}K` : '—'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {item.status === 'filed' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Filed
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
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

      {/* ITC Analysis Tab */}
      {activeTab === 'itc' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="ITC Utilization"
              data={effectiveItc}
              columns={[
                { key: 'category', label: 'Category' },
                { key: 'value', label: 'Amount', format: formatIndianCurrencyAbbreviated },
                { key: 'percent', label: '% of Total' },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('itc,gstr2b', 'ITC / GSTR-2B')}
              info={{
                formula: 'Σ (CGST + SGST + IGST) on GSTR-2B / ITC register rows, split by itc_eligible flag',
                source: GST_SOURCE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={effectiveItc}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ category, percent }) =>
                      `${category} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(entry) => {
                      toggleCrossFilter({
                        id: 'itcCategory',
                        label: `ITC: ${entry.category}`,
                        value: entry.category,
                      });
                    }}
                  >
                    {effectiveItc.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#F59E0B'}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="ITC Status Breakdown"
              data={effectiveItc}
              columns={[
                { key: 'category', label: 'Category' },
                { key: 'value', label: 'Amount', format: formatIndianCurrencyAbbreviated },
                { key: 'percent', label: '% of Total' },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('itc,gstr2b', 'ITC / GSTR-2B')}
              info={{
                formula: 'Eligible vs ineligible ITC amounts: Σ (CGST + SGST + IGST) grouped by the itc_eligible flag',
                source: GST_SOURCE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={effectiveItc}
                  onClick={(data) => handleChartSelect(data, 'category')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={80} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Bar dataKey="value" cursor="pointer">
                    {effectiveItc.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#F59E0B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ITC Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Input Tax Credit Analysis{windowLabel ? ` (${windowLabel})` : ''}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">% of Total</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveItc.map((item) => (
                    <tr
                      key={item.category}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'itcCategory',
                          label: `ITC: ${item.category}`,
                          value: item.category,
                        });
                      }}
                      onContextMenu={(e) =>
                        openContextMenu(
                          e,
                          '/detail/gst',
                          [sourceFilter('itc,gstr2b', 'ITC / GSTR-2B'), ...crossDrillFilters()],
                          item,
                        )
                      }
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('itcCategory') && isFiltered('itcCategory', item.category) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                      <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                        ₹{(item.value / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {(Number(item?.percent ?? 0)).toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-center">
                        {item.category === 'Eligible ITC' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        )}
                        {item.category === 'Ineligible ITC' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Blocked
                          </span>
                        )}
                        {item.category === 'Pending Docs' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-2 text-gray-900">Total</td>
                    <td className="py-2 px-2 text-right text-gray-900">
                      ₹{(effectiveItc.reduce((sum: number, item: any) => sum + item.value, 0) / 1000).toFixed(1)}K
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900">100%</td>
                    <td className="py-2 px-2 text-center">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reverse Charge Tab */}
      {activeTab === 'rcm' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard
              title="RCM Liability by Supplier"
              data={effectiveRcm}
              columns={[
                { key: 'supplier', label: 'Supplier' },
                { key: 'amount', label: 'Base Amount', format: formatIndianCurrencyAbbreviated },
                { key: 'gst', label: 'GST Payable', format: formatIndianCurrencyAbbreviated },
                { key: 'month', label: 'Latest Period' },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('rcm', 'RCM')}
              info={{
                formula: 'Per supplier: Σ taxable value (base) and Σ (CGST + SGST + IGST) payable under reverse charge',
                source: GST_SOURCE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={effectiveRcm}
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
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#0D9488" name="Base Amount" />
                  <Bar dataKey="gst" fill="#EF4444" name="GST Payable" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Total RCM Liability"
              data={effectiveRcm}
              columns={[
                { key: 'supplier', label: 'Supplier' },
                { key: 'gst', label: 'GST Payable', format: formatIndianCurrencyAbbreviated },
              ]}
              drillTarget="/detail/gst"
              drillFilters={drillWithSource('rcm', 'RCM')}
              info={{
                formula: 'Share of total reverse-charge GST payable, by supplier: Σ (CGST + SGST + IGST)',
                source: GST_SOURCE,
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={effectiveRcm}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="gst"
                    label={({ supplier, percent }) =>
                      `${supplier.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(entry) => {
                      toggleCrossFilter({
                        id: 'rcmSupplier',
                        label: `Supplier: ${entry.supplier}`,
                        value: entry.supplier,
                      });
                    }}
                  >
                    {effectiveRcm.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* RCM Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Reverse Charge Mechanism{windowLabel ? ` (${windowLabel})` : ''}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Base Amount</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">GST @ 18%</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Total</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-600">Month</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveRcm.map((item) => (
                    <tr
                      key={item.supplier}
                      onClick={() => {
                        toggleCrossFilter({
                          id: 'rcmSupplier',
                          label: `Supplier: ${item.supplier}`,
                          value: item.supplier,
                        });
                      }}
                      onContextMenu={(e) =>
                        openContextMenu(
                          e,
                          '/detail/gst',
                          [
                            sourceFilter('rcm', 'RCM'),
                            { id: 'supplier_name', label: `Supplier: ${item.supplier}`, value: item.supplier },
                            ...monthFilter(item),
                          ],
                          item,
                        )
                      }
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${hasFilter('rcmSupplier') && isFiltered('rcmSupplier', item.supplier) ? 'bg-teal-100 ring-1 ring-teal-400' : 'hover:bg-teal-50'}`}
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.supplier}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.amount / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-right text-red-600 font-semibold">
                        ₹{(item.gst / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{((item.amount + item.gst) / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-center text-gray-600">{item.month}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-2 text-gray-900">Total</td>
                    <td className="py-2 px-2 text-right text-gray-900">
                      ₹{(effectiveRcm.reduce((sum, item) => sum + item.amount, 0) / 1000).toFixed(1)}K
                    </td>
                    <td className="py-2 px-2 text-right text-red-600">
                      ₹{(effectiveRcm.reduce((sum, item) => sum + item.gst, 0) / 1000).toFixed(1)}K
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900">
                      ₹
                      {(
                        effectiveRcm.reduce((sum, item) => sum + item.amount + item.gst, 0) / 1000
                      ).toFixed(1)}
                      K
                    </td>
                    <td className="py-2 px-2 text-center">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Compliance Status Widget */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Filing Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Return Type</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Period</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Due Date</th>
                <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Filed On</th>
              </tr>
            </thead>
            <tbody>
              {effectiveComplianceStatus.map((item: any, index: number) => (
                <tr
                  key={`${item.return}-${item.period}-${index}`}
                  onContextMenu={(e) =>
                    openContextMenu(
                      e,
                      '/detail/gst',
                      [
                        sourceFilter('gstr3b', 'GSTR-3B'),
                        ...monthFilter(item),
                        ...(item.filing_status
                          ? [{ id: 'filing_status', label: `Filing status: ${item.filing_status}`, value: String(item.filing_status) }]
                          : []),
                      ],
                      item,
                    )
                  }
                  className="border-b border-gray-100 hover:bg-teal-50 transition-colors cursor-context-menu"
                >
                  <td className="py-2 px-2 font-medium text-gray-900">{item.return || item.return_type || ''}</td>
                  <td className="py-2 px-2 text-gray-900">{item.period || ''}</td>
                  <td className="py-2 px-2 text-gray-900">{item.dueDate || item.due_date || ''}</td>
                  <td className="py-2 px-2 text-center">
                    {item.status === 'filed' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Filed
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending ({item.daysLeft || item.days_left || 0} days)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-gray-600">{item.filedOn || item.filed_on || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {contextMenuElement}
    </div>
    </DrillSource>
  );
};
