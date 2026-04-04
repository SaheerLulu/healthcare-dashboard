import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';
import { numericize } from '../services/transforms';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  ComposedChart,
  AreaChart,
  Area,
} from 'recharts';


const COLORS = ['#0D9488', '#4F46E5', '#F59E0B', '#EF4444', '#10B981'];

export const TDSTracker = () => {
  const [activeTab, setActiveTab] = useState<'deduction' | 'challan' | 'section'>('deduction');
  const navigate = useNavigate();
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const { data: apiTdsOverview } = useApiData<any>('/tds/overview/', {});
  const { data: apiTdsTrend } = useApiData<any[]>('/tds/trend/', []);
  const { data: apiTdsChallans } = useApiData<any[]>('/tds/challans/', []);
  const { data: apiTdsSections } = useApiData<any[]>('/tds/sections/', []);

  const tdsDeductionData = apiTdsTrend.map(numericize);
  const challanData = apiTdsChallans.map(numericize);
  const sectionWiseData = apiTdsSections.map(numericize);

  const tabs = [
    { id: 'deduction', label: 'Deduction Register' },
    { id: 'challan', label: 'Challan Register' },
    { id: 'section', label: 'Section-wise Analysis' },
  ];

  const handleChartSelect = (data: any, dimension: string) => {
    if (data?.activePayload?.[0]) {
      const payload = data.activePayload[0].payload;
      const val = payload[dimension] || payload.name;
      if (val) toggleCrossFilter({ id: dimension, label: `${dimension}: ${val}`, value: val });
    }
  };

  const hasFilter = (dimension: string) => activeFilters.some(f => f.id === dimension);

  const filteredTDSData = tdsDeductionData.filter(item =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">TDS Tracker</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Download Form 26Q
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            Pay TDS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Total TDS Deducted"
          value={apiTdsOverview.total_deducted_display || '₹0'}
          subtitle={apiTdsOverview.total_deducted_period || ''}
          trend={{ value: apiTdsOverview.total_deducted_trend || '0%', direction: 'up' }}
        />
        <KPICard
          title="TDS 194C"
          value={apiTdsOverview.tds_194c_display || '₹0'}
          subtitle={apiTdsOverview.tds_194c_subtitle || ''}
          trend={{ value: apiTdsOverview.tds_194c_trend || '0%', direction: 'up' }}
        />
        <KPICard
          title="TDS 194Q"
          value={apiTdsOverview.tds_194q_display || '₹0'}
          subtitle={apiTdsOverview.tds_194q_subtitle || ''}
          trend={{ value: apiTdsOverview.tds_194q_trend || '0%', direction: 'up' }}
        />
        <KPICard
          title="TDS 194O"
          value={apiTdsOverview.tds_194o_display || '₹0'}
          subtitle={apiTdsOverview.tds_194o_subtitle || ''}
          trend={{ value: apiTdsOverview.tds_194o_trend || '0%', direction: 'up' }}
        />
        <KPICard
          title="Challans Paid"
          value={String(apiTdsOverview.challans_paid ?? 0)}
          subtitle={apiTdsOverview.challans_subtitle || ''}
          trend={{ value: '0', direction: 'up' }}
        />
      </div>

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

      {activeTab === 'deduction' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ChartCard title="TDS Deduction Trend">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/tds')} className="cursor-context-menu">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={filteredTDSData} onClick={(data) => handleChartSelect(data, 'month')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                  <Legend />
                  <Bar dataKey="tds194C" stackId="a" fill="#0D9488" name="194C" />
                  <Bar dataKey="tds194Q" stackId="a" fill="#4F46E5" name="194Q" />
                  <Bar dataKey="tds194O" stackId="a" fill="#F59E0B" name="194O" />
                  <Line type="monotone" dataKey="total" stroke="#EF4444" strokeWidth={2} name="Total" dot={{ fill: '#EF4444', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="TDS by Section">
              <div onContextMenu={(e) => handleChartRightClick(e, '/detail/tds')} className="cursor-context-menu">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectionWiseData.map(s => ({ name: s.section || '', value: Number(s.deducted) || 0 }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">TDS Deduction Register (Last 6 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">194C</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">194Q</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">194O</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tdsDeductionData.map((item) => (
                    <tr key={item.month} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                      <td className="py-2 px-2 font-medium text-gray-900">{item.month}</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(item.tds194C / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(item.tds194Q / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-gray-900">₹{(item.tds194O / 1000).toFixed(1)}K</td>
                      <td className="py-2 px-2 text-right text-teal-600 font-semibold">₹{(item.total / 1000).toFixed(1)}K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'challan' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">TDS Challan Register</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Challan No</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Section</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {challanData.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                    <td className="py-2 px-2 text-gray-900">{item.date}</td>
                    <td className="py-2 px-2 font-medium text-gray-900">{item.challan}</td>
                    <td className="py-2 px-2 text-gray-900">{item.section}</td>
                    <td className="py-2 px-2 text-right text-gray-900">₹{(item.amount / 1000).toFixed(1)}K</td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'section' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Section-wise TDS Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Section</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Description</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Rate</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Transactions</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Amount Deducted</th>
                </tr>
              </thead>
              <tbody>
                {sectionWiseData.map((item) => (
                  <tr key={item.section} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                    <td className="py-2 px-2 font-medium text-gray-900">{item.section}</td>
                    <td className="py-2 px-2 text-gray-600">{item.description}</td>
                    <td className="py-2 px-2 text-center text-gray-900">{item.rate}</td>
                    <td className="py-2 px-2 text-right text-gray-900">{item.count}</td>
                    <td className="py-2 px-2 text-right text-teal-600 font-semibold">₹{(item.deducted / 1000).toFixed(1)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'TDS Tracker', filters: activeFilters }} />}
    </div>
  );
};

export const WorkingCapital = () => {
  const navigate = useNavigate();
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const { data: apiWcOverview } = useApiData<any>('/working-capital/overview/', {});
  const { data: apiReceivables } = useApiData<any>('/working-capital/receivables/', {});
  const { data: apiPayables } = useApiData<any>('/working-capital/payables/', {});
  const { data: apiCcc } = useApiData<any>('/working-capital/ccc/', {});

  const receivablesData = (apiReceivables.breakdown || []).map(numericize);
  const payablesData = (apiPayables.breakdown || []).map(numericize);

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
  const cccData = (apiCcc.trend || []).map(numericize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Working Capital</h1>
        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Current Ratio"
          value={apiWcOverview.current_ratio_display || '0'}
          subtitle={apiWcOverview.current_ratio_subtitle || ''}
          trend={{ value: apiWcOverview.current_ratio_trend || '0', direction: 'up' }}
        />
        <KPICard
          title="Receivables"
          value={apiWcOverview.receivables_display || '₹0'}
          subtitle={apiWcOverview.receivables_subtitle || ''}
          trend={{ value: apiWcOverview.receivables_trend || '0%', direction: 'down' }}
        />
        <KPICard
          title="Payables"
          value={apiWcOverview.payables_display || '₹0'}
          subtitle={apiWcOverview.payables_subtitle || ''}
          trend={{ value: apiWcOverview.payables_trend || '0%', direction: 'up' }}
        />
        <KPICard
          title="Cash Conversion Cycle"
          value={apiWcOverview.ccc_display || '0 days'}
          subtitle={apiWcOverview.ccc_subtitle || ''}
          trend={{ value: apiWcOverview.ccc_trend || '0d', direction: 'up' }}
        />
        <KPICard
          title="Working Capital"
          value={apiWcOverview.working_capital_display || '₹0'}
          subtitle={apiWcOverview.working_capital_subtitle || ''}
          trend={{ value: apiWcOverview.working_capital_trend || '0%', direction: 'up' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Receivables Aging">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/working-capital')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={receivablesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
              <Bar dataKey="amount">
                {receivablesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.status === 'critical' ? '#EF4444' : entry.status === 'overdue' ? '#F59E0B' : entry.status === 'upcoming' ? '#4F46E5' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payables Aging">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/working-capital')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payablesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: any) => `₹${(value / 1000).toFixed(2)}K`} />
              <Bar dataKey="amount">
                {payablesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.status === 'critical' ? '#EF4444' : entry.status === 'overdue' ? '#F59E0B' : entry.status === 'upcoming' ? '#4F46E5' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Cash Conversion Cycle (Last 6 Months)</h3>
        <ChartCard title="">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/working-capital')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cccData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dio" stroke="#4F46E5" strokeWidth={2} name="DIO" dot={{ fill: '#4F46E5', r: 4 }} />
              <Line type="monotone" dataKey="dso" stroke="#F59E0B" strokeWidth={2} name="DSO" dot={{ fill: '#F59E0B', r: 4 }} />
              <Line type="monotone" dataKey="dpo" stroke="#10B981" strokeWidth={2} name="DPO" dot={{ fill: '#10B981', r: 4 }} />
              <Line type="monotone" dataKey="ccc" stroke="#EF4444" strokeWidth={3} name="CCC" dot={{ fill: '#EF4444', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'Working Capital', filters: activeFilters }} />}
    </div>
  );
};

export const LocationBenchmarking = () => {
  const navigate = useNavigate();
  const { toggleCrossFilter, activeFilters, isFiltered } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
  const { data: apiLocations } = useApiData<any[]>('/location/comparison/', []);
  const { data: apiLocTrend } = useApiData<any[]>('/location/trend/', []);

  const locationPerformance = apiLocations.map((r: any) => ({
    ...numericize(r),
    location: r.location_name || '',
    margin: Number(r.margin_pct || r.avg_margin_pct) || 0,
    footfall: Number(r.orders) || 0,
    conversion: Number(r.margin_pct) || 0,
  }));

  // Build trend: pivot by location so each location is a column
  const trendByMonth: Record<string, any> = {};
  const locationNames: string[] = [];
  for (const r of apiLocTrend) {
    const m = r.sale_month?.slice(5) || '';
    const loc = r.location_name || '';
    if (!trendByMonth[m]) trendByMonth[m] = { month: m };
    trendByMonth[m][loc] = Number(r.revenue) || 0;
    if (!locationNames.includes(loc) && loc) locationNames.push(loc);
  }
  const locationRevenueTrend = Object.values(trendByMonth);

  const filteredLocationTrend = locationRevenueTrend.filter((item: any) =>
    !activeFilters.length || activeFilters.some(f => f.value === item.month)
  );

  const totalLocations = apiLocations.length;
  const bestPerformer = locationPerformance.length ? locationPerformance.reduce((a: any, b: any) => (a.revenue > b.revenue ? a : b)) : null;
  const avgMargin = locationPerformance.length ? (locationPerformance.reduce((s: number, l: any) => s + (l.margin || 0), 0) / locationPerformance.length).toFixed(1) : '0';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Location Benchmarking</h1>
        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Compare Locations
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard title="Total Locations" value={String(totalLocations)} />
        <KPICard title="Best Performer" value={bestPerformer?.location || '--'} subtitle={bestPerformer ? `₹${(bestPerformer.revenue / 100000).toFixed(2)}L revenue` : ''} />
        <KPICard title="Avg Margin" value={`${avgMargin}%`} />
        <KPICard title="Total Orders" value={String(locationPerformance.reduce((s: number, l: any) => s + (l.footfall || 0), 0))} />
        <KPICard title="Total Customers" value={String(locationPerformance.reduce((s: number, l: any) => s + (Number(l.customers) || 0), 0))} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Revenue by Location">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/location')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="location" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={100} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
              <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
              <Legend />
              <Bar dataKey="revenue" fill="#0D9488" name="Revenue" />
              <Bar dataKey="profit" fill="#10B981" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue Trend by Location">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/location')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredLocationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
              <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
              <Legend />
              {locationNames.map((loc, i) => (
                <Line key={loc} type="monotone" dataKey={loc} stroke={['#0D9488','#4F46E5','#F59E0B','#EF4444','#10B981'][i % 5]} strokeWidth={2} name={loc} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Location Performance Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Location</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Profit</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Margin %</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Footfall</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {locationPerformance.map((loc) => (
                <tr key={loc.location} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                  <td className="py-2 px-2 font-medium text-gray-900">{loc.location}</td>
                  <td className="py-2 px-2 text-right text-gray-900">₹{(loc.revenue / 100000).toFixed(2)}L</td>
                  <td className="py-2 px-2 text-right text-green-600">₹{(loc.profit / 100000).toFixed(2)}L</td>
                  <td className="py-2 px-2 text-right text-gray-900">{loc.margin}%</td>
                  <td className="py-2 px-2 text-right text-gray-900">{loc.footfall.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right text-gray-900">{loc.conversion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'Location Benchmarking', filters: activeFilters }} />}
    </div>
  );
};

export const ProductIntelligence = () => {
  const navigate = useNavigate();
  const { activeFilters } = useCrossFilter();
  const { data: apiProductOverview } = useApiData<any>('/product/overview/', {});
  const { data: apiLifecycle } = useApiData<any[]>('/product/lifecycle/', []);
  const { data: apiPricing } = useApiData<any[]>('/product/pricing/', []);

  const productLifecycle = apiLifecycle.map(numericize);
  const productPricing = apiPricing.map(numericize);

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Intelligence</h1>
        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Product Analysis
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard title="Active SKUs" value={String(apiProductOverview.active_skus ?? 0)} subtitle={apiProductOverview.active_skus_subtitle || ''} trend={{ value: apiProductOverview.active_skus_trend || '0', direction: 'up' }} />
        <KPICard title="Avg Margin" value={apiProductOverview.avg_margin_display || '0%'} subtitle={apiProductOverview.avg_margin_subtitle || ''} trend={{ value: apiProductOverview.avg_margin_trend || '0pp', direction: 'up' }} />
        <KPICard title="Fast Moving" value={String(apiProductOverview.fast_moving ?? 0)} subtitle={apiProductOverview.fast_moving_subtitle || ''} trend={{ value: apiProductOverview.fast_moving_trend || '0', direction: 'up' }} />
        <KPICard title="Slow Moving" value={String(apiProductOverview.slow_moving ?? 0)} subtitle={apiProductOverview.slow_moving_subtitle || ''} trend={{ value: apiProductOverview.slow_moving_trend || '0', direction: 'down' }} />
        <KPICard title="Portfolio Value" value={apiProductOverview.portfolio_value_display || '₹0'} subtitle={apiProductOverview.portfolio_value_subtitle || ''} trend={{ value: apiProductOverview.portfolio_value_trend || '0%', direction: 'up' }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Product Lifecycle Distribution">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/product')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productLifecycle}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="revenue"
                label={({ stage, percent }) => `${stage} ${(percent * 100).toFixed(0)}%`}
              >
                {productLifecycle.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `₹${(value / 100000).toFixed(2)}L`} />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Pricing & Margin Analysis">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/product')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productPricing}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="product" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={100} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cost" fill="#4F46E5" name="Cost" />
              <Bar yAxisId="left" dataKey="mrp" fill="#0D9488" name="MRP" />
              <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#10B981" strokeWidth={2} name="Margin %" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Products by Margin</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Cost</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">MRP</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Margin %</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Volume</th>
              </tr>
            </thead>
            <tbody>
              {productPricing.map((prod) => (
                <tr key={prod.product} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                  <td className="py-2 px-2 font-medium text-gray-900">{prod.product}</td>
                  <td className="py-2 px-2 text-right text-gray-900">₹{prod.cost}</td>
                  <td className="py-2 px-2 text-right text-gray-900">₹{prod.mrp}</td>
                  <td className="py-2 px-2 text-right text-green-600 font-semibold">{prod.margin.toFixed(1)}%</td>
                  <td className="py-2 px-2 text-right text-gray-900">{prod.volume.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'Product Intelligence', filters: activeFilters }} />}
    </div>
  );
};

export const DispatchFulfillment = () => {
  const navigate = useNavigate();
  const { activeFilters } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
  const { data: apiDispatchPipeline } = useApiData<any[]>('/dispatch/pipeline/', []);
  const { data: apiCourier } = useApiData<any[]>('/dispatch/courier-performance/', []);

  const dispatchPipeline = apiDispatchPipeline.map((r: any) => ({
    ...numericize(r),
    orders: Number(r.count) || 0,
  }));
  const courierPerformance = apiCourier.map((r: any) => ({
    ...numericize(r),
    courier: r.courier_partner || '',
    orders: Number(r.total_orders) || 0,
    onTime: Number(r.total_orders) > 0 ? Math.round((Number(r.delivered_count) || 0) / Number(r.total_orders) * 100) : 0,
    avgDays: 0,
    rating: 0,
  }));

  const pendingCount = dispatchPipeline.filter((d: any) => d.status === 'pending').reduce((s: number, d: any) => s + d.orders, 0);
  const inTransitCount = dispatchPipeline.filter((d: any) => ['dispatched', 'in_transit'].includes(d.status)).reduce((s: number, d: any) => s + d.orders, 0);
  const deliveredCount = dispatchPipeline.filter((d: any) => d.status === 'delivered').reduce((s: number, d: any) => s + d.orders, 0);
  const totalOrders = dispatchPipeline.reduce((s: number, d: any) => s + d.orders, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch & Fulfillment</h1>
        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Create Shipment
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard title="Orders Pending" value={String(pendingCount)} />
        <KPICard title="In Transit" value={String(inTransitCount)} />
        <KPICard title="Delivered" value={String(deliveredCount)} />
        <KPICard title="Total Dispatches" value={String(totalOrders)} />
        <KPICard title="Couriers" value={String(courierPerformance.length)} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Order Pipeline Status">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/dispatch')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dispatchPipeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#0D9488" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Courier Performance">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/dispatch')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courierPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="courier" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="onTime" fill="#10B981" name="On-Time %" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Courier Partner Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Courier</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">On-Time %</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Days</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Rating</th>
              </tr>
            </thead>
            <tbody>
              {courierPerformance.map((courier: any) => (
                <tr key={courier.courier} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                  <td className="py-2 px-2 font-medium text-gray-900">{courier.courier}</td>
                  <td className="py-2 px-2 text-right text-gray-900">{(courier.orders || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={`${courier.onTime >= 95 ? 'text-green-600' : courier.onTime >= 90 ? 'text-yellow-600' : 'text-red-600'} font-medium`}>
                      {courier.onTime || 0}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-900">{(courier.avgDays || 0).toFixed(1)}</td>
                  <td className="py-2 px-2 text-right text-yellow-600 font-medium">★ {courier.rating || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'Dispatch & Fulfillment', filters: activeFilters }} />}
    </div>
  );
};

export const LoyaltyAnalytics = () => {
  const navigate = useNavigate();
  const { activeFilters } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
  const { data: apiLoyaltyOverview } = useApiData<any>('/loyalty/overview/', {});
  const { data: apiLoyaltyTiers } = useApiData<any[]>('/loyalty/tiers/', []);
  const { data: apiRedemption } = useApiData<any[]>('/loyalty/redemption/', []);

  const loyaltyTiers = apiLoyaltyTiers.map((r: any) => ({
    tier: r.customer_type || r.tier || 'Unknown',
    members: Number(r.members) || 0,
    revenue: Number(r.revenue) || 0,
    orders: Number(r.orders) || 0,
    avgSpend: Number(r.avg_order_value || r.avgSpend) || 0,
  }));
  const loyaltyRedemption = apiRedemption.map(numericize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Analytics</h1>
        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Member Report
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard title="Total Members" value={apiLoyaltyOverview.total_members_display || '0'} subtitle={apiLoyaltyOverview.total_members_subtitle || ''} trend={{ value: apiLoyaltyOverview.total_members_trend || '0%', direction: 'up' }} />
        <KPICard title="Points Issued" value={apiLoyaltyOverview.points_issued_display || '0'} subtitle={apiLoyaltyOverview.points_issued_subtitle || ''} trend={{ value: apiLoyaltyOverview.points_issued_trend || '0%', direction: 'up' }} />
        <KPICard title="Points Redeemed" value={apiLoyaltyOverview.points_redeemed_display || '0'} subtitle={apiLoyaltyOverview.points_redeemed_subtitle || ''} trend={{ value: apiLoyaltyOverview.points_redeemed_trend || '0pp', direction: 'up' }} />
        <KPICard title="Points Balance" value={apiLoyaltyOverview.points_balance_display || '0'} subtitle={apiLoyaltyOverview.points_balance_subtitle || ''} trend={{ value: apiLoyaltyOverview.points_balance_trend || '0%', direction: 'up' }} />
        <KPICard title="Avg Redemption" value={apiLoyaltyOverview.avg_redemption_display || '0%'} subtitle={apiLoyaltyOverview.avg_redemption_subtitle || ''} trend={{ value: apiLoyaltyOverview.avg_redemption_trend || '0pp', direction: 'up' }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Members by Tier">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/loyalty')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={loyaltyTiers}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="members"
                label={({ tier, percent }) => `${tier} ${(percent * 100).toFixed(0)}%`}
              >
                {loyaltyTiers.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Points Redemption Trend">
          <div onContextMenu={(e) => handleChartRightClick(e, '/detail/loyalty')} className="cursor-context-menu">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={loyaltyRedemption}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: any) => value.toLocaleString('en-IN')} />
              <Legend />
              <Line type="monotone" dataKey="issued" stroke="#10B981" strokeWidth={2} name="Issued" />
              <Line type="monotone" dataKey="redeemed" stroke="#EF4444" strokeWidth={2} name="Redeemed" />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Tier Performance Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Tier</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Members</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Revenue</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Order</th>
              </tr>
            </thead>
            <tbody>
              {loyaltyTiers.map((tier) => (
                <tr key={tier.tier} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                  <td className="py-2 px-2 font-medium text-gray-900">{tier.tier}</td>
                  <td className="py-2 px-2 text-right text-gray-900">{tier.members}</td>
                  <td className="py-2 px-2 text-right text-gray-900">{tier.orders}</td>
                  <td className="py-2 px-2 text-right text-gray-900">{formatIndianCurrencyAbbreviated(tier.revenue)}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{formatIndianCurrencyAbbreviated(tier.avgSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'Loyalty Analytics', filters: activeFilters }} />}
    </div>
  );
};

export const AuditDataHealth = () => {
  const navigate = useNavigate();
  const { activeFilters } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; page: string }>({ visible: false, x: 0, y: 0, page: '' });
  const handleChartRightClick = (e: MouseEvent, page: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, page }); };
  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
  const { data: apiAuditOverview } = useApiData<any>('/audit/overview/', {}, { noFilters: true });
  const { data: apiPipelineStatus } = useApiData<any[]>('/audit/pipeline-status/', [], { noFilters: true });
  const { data: apiFreshness } = useApiData<any>('/audit/data-freshness/', {}, { noFilters: true });
  const { data: apiDataQuality } = useApiData<any[]>('/audit/data-quality/', [], { noFilters: true });
  const { data: apiUserActivity } = useApiData<any[]>('/audit/user-activity/', [], { noFilters: true });

  const dataQualityMetrics = apiDataQuality.map(numericize);
  const userActivityData = apiUserActivity.map(numericize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit & Data Health</h1>
        <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
          Run Audit
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard title="Data Quality Score" value={apiAuditOverview.data_quality_display || '0%'} subtitle={apiAuditOverview.data_quality_subtitle || ''} trend={{ value: apiAuditOverview.data_quality_trend || '0pp', direction: 'up' }} />
        <KPICard title="Sync Status" value={apiAuditOverview.sync_status_display || '0%'} subtitle={apiAuditOverview.sync_status_subtitle || ''} trend={{ value: apiAuditOverview.sync_status_trend || '0%', direction: 'up' }} />
        <KPICard title="Active Users" value={String(apiAuditOverview.active_users ?? 0)} subtitle={apiAuditOverview.active_users_subtitle || ''} trend={{ value: apiAuditOverview.active_users_trend || '0', direction: 'up' }} />
        <KPICard title="Failed Syncs" value={String(apiAuditOverview.failed_syncs ?? 0)} subtitle={apiAuditOverview.failed_syncs_subtitle || ''} trend={{ value: apiAuditOverview.failed_syncs_trend || '0', direction: 'down' }} />
        <KPICard title="Audit Trail" value={apiAuditOverview.audit_trail_display || '0'} subtitle={apiAuditOverview.audit_trail_subtitle || ''} trend={{ value: apiAuditOverview.audit_trail_trend || '0%', direction: 'up' }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4" onContextMenu={(e) => handleChartRightClick(e, '/detail/audit')}>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Data Quality Metrics</h3>
          <div className="space-y-4">
            {dataQualityMetrics.map((metric) => (
              <div key={metric.metric}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">{metric.metric}</span>
                  <span className={`text-xs font-semibold ${metric.status === 'excellent' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {metric.value}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metric.status === 'excellent' ? 'bg-green-600' : 'bg-yellow-600'}`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4" onContextMenu={(e) => handleChartRightClick(e, '/detail/audit')}>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">User Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">User</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Role</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Logins</th>
                </tr>
              </thead>
              <tbody>
                {userActivityData.map((user) => (
                  <tr key={user.user} className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                    <td className="py-2 px-2 font-medium text-gray-900">{user.user}</td>
                    <td className="py-2 px-2 text-gray-600">{user.role}</td>
                    <td className="py-2 px-2 text-right text-gray-900">{user.logins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {contextMenu.visible && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} drillThroughTarget={contextMenu.page} drillThroughContext={{ from: 'Audit & Data Health', filters: activeFilters }} />}
    </div>
  );
};