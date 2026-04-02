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
  Area,
  AreaChart,
} from 'recharts';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { numericize } from '../services/transforms';


const COLORS = ['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981'];

export const GSTCompliance = () => {
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b' | 'itc' | 'rcm'>('gstr1');
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
  const { data: apiGstOverview } = useApiData<any>('/gst/overview/', {});
  const { data: apiGstr1 } = useApiData<any[]>('/gst/gstr1/', []);
  const { data: apiGstr3b } = useApiData<any[]>('/gst/gstr3b/', []);
  const { data: apiItc } = useApiData<any>('/gst/itc/', {});
  const { data: apiRcm } = useApiData<any[]>('/gst/rcm/', []);
  const { data: apiByRate } = useApiData<any[]>('/gst/by-rate/', []);
  const { data: apiComplianceStatus } = useApiData<any[]>('/gst/compliance-status/', []);

  // Transform API data
  const effectiveGstr1 = apiGstr1.map(numericize);
  const effectiveGstr3b = apiGstr3b.map(numericize);
  const effectiveItc = (apiItc.breakdown || []).map(numericize);
  const effectiveByRate = apiByRate.map(numericize);
  const effectiveRcm = apiRcm.map(numericize);
  const effectiveComplianceStatus = apiComplianceStatus.map(numericize);

  const tabs = [
    { id: 'gstr1', label: 'GSTR-1 (Sales)' },
    { id: 'gstr3b', label: 'GSTR-3B (Monthly)' },
    { id: 'itc', label: 'ITC Analysis' },
    { id: 'rcm', label: 'Reverse Charge' },
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

  const handleChartClick = (data: any, dimension: string, detailPage: string = '/detail/gst') => {
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
          from: 'GST & Compliance Center',
          filters: activeFilters.length > 0 ? activeFilters : filter ? [filter] : [],
        },
      },
    });
  };

  // Apply cross-filtering
  const filteredGSTR1 = effectiveGstr1.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  const filteredGSTR3B = effectiveGstr3b.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">GST & Compliance Center</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Download Returns
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            File GSTR-1
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Output GST"
          value={apiGstOverview.output_gst_display || '₹0'}
          subtitle={apiGstOverview.output_gst_period || ''}
          trend={{ value: apiGstOverview.output_gst_trend || '0%', direction: 'up' }}
          onClick={() => handleDrillThrough('/detail/gst')}
          icon={<FileText className="w-5 h-5 text-teal-600" />}
        />
        <KPICard
          title="Input Tax Credit"
          value={apiGstOverview.itc_display || '₹0'}
          subtitle={apiGstOverview.itc_subtitle || ''}
          trend={{ value: apiGstOverview.itc_trend || '0%', direction: 'up' }}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
        />
        <KPICard
          title="GST Payable"
          value={apiGstOverview.payable_display || '₹0'}
          subtitle={apiGstOverview.payable_subtitle || ''}
          trend={{ value: apiGstOverview.payable_trend || '0%', direction: 'up' }}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
        />
        <KPICard
          title="Pending Returns"
          value={String(apiGstOverview.pending_returns ?? 0)}
          subtitle={apiGstOverview.pending_returns_subtitle || ''}
          trend={{ value: '0', direction: 'up' }}
        />
        <KPICard
          title="Compliance Rate"
          value={apiGstOverview.compliance_rate_display || '0%'}
          subtitle={apiGstOverview.compliance_rate_subtitle || ''}
          trend={{ value: apiGstOverview.compliance_rate_trend || '0%', direction: 'up' }}
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
              onDrillThrough={() => handleDrillThrough('/detail/gst')}
            >
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={filteredGSTR1}
                  onClick={(data) => handleChartClick(data, 'month')}
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
              </div>
            </ChartCard>

            <ChartCard title="Output GST by Tax Rate">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={effectiveByRate}
                  onClick={(data) => handleChartClick(data, 'rate')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="rate" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      return `₹${(value / 1000).toFixed(2)}K`;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="base" fill="#0D9488" name="Base Amount" />
                  <Bar dataKey="gst" fill="#EF4444" name="GST Amount" />
                </BarChart>
              </ResponsiveContainer>
              </div>
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
                        ₹{(item.b2b / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.b2c / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        ₹{(item.export / 1000).toFixed(0)}K
                      </td>
                      <td className="py-2 px-2 text-right text-teal-600 font-semibold">
                        ₹{(item.total / 1000).toFixed(0)}K
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
            <ChartCard title="GST Computation Trend">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={filteredGSTR3B}
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
              </div>
            </ChartCard>

            <ChartCard title="Net GST Payable">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                {(() => {
                  const outputVal = Number(apiGstOverview.output_gst) || 0;
                  const itcVal = Number(apiGstOverview.itc) || 0;
                  const netPayable = Number(apiGstOverview.payable) || (outputVal - itcVal);
                  const waterfallData = [
                    { label: 'Output GST', amount: outputVal, color: '#0D9488' },
                    { label: 'Input Tax Credit', amount: -itcVal, color: '#4F46E5' },
                    { label: 'Net Payable', amount: netPayable, color: '#EF4444' },
                  ];
                  return (
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
                  );
                })()}
              </ResponsiveContainer>
              </div>
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
            <ChartCard title="ITC Utilization">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
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
                      addCrossFilter({
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
              </div>
            </ChartCard>

            <ChartCard title="ITC Status Breakdown">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={effectiveItc}
                  onClick={(data) => handleChartClick(data, 'category')}
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
              </div>
            </ChartCard>
          </div>

          {/* ITC Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Input Tax Credit Analysis (Mar 2026)</h3>
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
                        addCrossFilter({
                          id: 'itcCategory',
                          label: `ITC: ${item.category}`,
                          value: item.category,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-gray-900">{item.category}</td>
                      <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                        ₹{(item.value / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {item.percent.toFixed(1)}%
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
            <ChartCard title="RCM Liability by Supplier">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
              >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={effectiveRcm}
                  onClick={(data) => handleChartClick(data, 'supplier')}
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
              </div>
            </ChartCard>

            <ChartCard title="Total RCM Liability">
              <div
                onContextMenu={(e) => handleChartRightClick(e, '/detail/gst')}
                className="cursor-context-menu"
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
                      addCrossFilter({
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
              </div>
            </ChartCard>
          </div>

          {/* RCM Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Reverse Charge Mechanism (Mar 2026)</h3>
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
                        addCrossFilter({
                          id: 'rcmSupplier',
                          label: `Supplier: ${item.supplier}`,
                          value: item.supplier,
                        });
                      }}
                      className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors"
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
                  className="border-b border-gray-100 hover:bg-teal-50 transition-colors"
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

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{
            from: 'GST & Compliance Center',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};