import { LayoutDashboard, IndianRupee, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { revenueByMonth, stockHealth, expiryAlerts, productProfitability } from '../data/computedData';
import { formatINR, formatINRCompact, formatPercent } from '../lib/formatUtils';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Dashboard() {
  // KPI calculations
  const currentMonth = revenueByMonth[revenueByMonth.length - 1];
  const prevMonth = revenueByMonth[revenueByMonth.length - 2];
  const revenueChange = prevMonth?.totalRevenue > 0
    ? ((currentMonth.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue * 100).toFixed(1)
    : '0';

  const totalProfit = productProfitability.reduce((s, p) => s + p.grossProfit, 0);
  const totalRevenue = productProfitability.reduce((s, p) => s + p.totalRevenue, 0);
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  const inventoryValue = stockHealth.reduce((s, p) => s + p.stockValue, 0);

  const criticalAlerts = stockHealth.filter(s => s.stockStatus === 'Critical' || s.stockStatus === 'Out of Stock').length
    + expiryAlerts.filter(e => e.status === 'Expired' || e.status === 'Critical').length;

  const kpis: KPICardConfig[] = [
    {
      title: 'Revenue (This Month)',
      value: formatINR(currentMonth?.totalRevenue || 0),
      icon: IndianRupee,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: { value: `${revenueChange}%`, isPositive: Number(revenueChange) >= 0 },
      subtitle: 'vs last month',
    },
    {
      title: 'Gross Margin',
      value: formatPercent(overallMargin),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Inventory Value',
      value: formatINR(inventoryValue),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: `${stockHealth.filter(s => s.totalOnHand > 0).length} SKUs`,
    },
    {
      title: 'Critical Alerts',
      value: String(criticalAlerts),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      subtitle: 'Low stock + expiring',
    },
  ];

  // Stock health pie data
  const stockStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of stockHealth) {
      counts[s.stockStatus] = (counts[s.stockStatus] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    'Adequate': '#10b981',
    'Low': '#f59e0b',
    'Critical': '#ef4444',
    'Out of Stock': '#6b7280',
    'Overstocked': '#3b82f6',
  };

  // Expiry bucket data
  const expiryBuckets = useMemo(() => {
    const buckets = { 'Expired': 0, '<30 days': 0, '<90 days': 0, '<180 days': 0 };
    for (const a of expiryAlerts) {
      if (a.status === 'Expired') buckets['Expired']++;
      else if (a.status === 'Critical') buckets['<30 days']++;
      else if (a.status === 'Warning') buckets['<90 days']++;
      else buckets['<180 days']++;
    }
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, []);

  // Category revenue - top 10
  const categoryRevenue = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const p of productProfitability) {
      catMap[p.category] = (catMap[p.category] || 0) + p.totalRevenue;
    }
    return Object.entries(catMap)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, []);

  return (
    <PageLayout
      title="Pharma Inventory Dashboard"
      subtitle="Executive overview - Financial Year 2025-26"
      icon={LayoutDashboard}
    >
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Trend (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="posRevenue" name="POS" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="b2bRevenue" name="B2B" stackId="1" fill="#10b981" stroke="#10b981" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Categories by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Health Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stockStatusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiry Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expiryBuckets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Products">
                    {expiryBuckets.map((entry, i) => (
                      <Cell key={i} fill={['#ef4444', '#f59e0b', '#fb923c', '#84cc16'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
