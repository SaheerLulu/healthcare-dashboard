import { Users, IndianRupee, Heart, UserPlus } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { customerAnalytics } from '../data/computedData';
import { posOrders } from '../data/transactions/posOrders';
import { b2bOrders } from '../data/transactions/b2bOrders';
import { customers } from '../data/seed/customers';
import { formatINR, formatINRCompact, formatNumber, formatDate } from '../lib/formatUtils';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export function CustomerAnalytics() {
  const activeCustomers = customerAnalytics.filter(c => c.totalOrders > 0).length;

  const totalReceivables = customers
    .filter(c => c.outstandingBalance > 0)
    .reduce((sum, c) => sum + c.outstandingBalance, 0);

  const avgLTV = useMemo(() => {
    const withSpend = customerAnalytics.filter(c => c.totalSpend > 0);
    return withSpend.length > 0
      ? withSpend.reduce((sum, c) => sum + c.totalSpend, 0) / withSpend.length
      : 0;
  }, []);

  // New customers: those with first order in the last 90 days
  const newCustomers = customerAnalytics.filter(c => c.totalOrders > 0 && c.daysSinceLastOrder <= 90 && c.totalOrders <= 3).length;

  const kpis: KPICardConfig[] = [
    { title: 'Active Customers', value: formatNumber(activeCustomers), icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100', subtitle: `of ${customers.length} total` },
    { title: 'Total Receivables', value: formatINR(totalReceivables), icon: IndianRupee, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { title: 'Avg Customer LTV', value: formatINR(avgLTV), icon: Heart, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { title: 'New Customers', value: String(newCustomers), icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100', subtitle: 'last 90 days' },
  ];

  // Revenue by Customer Segment
  const segmentRevenue = useMemo(() => {
    const segMap: Record<string, number> = {};
    for (const c of customerAnalytics) {
      segMap[c.customerType] = (segMap[c.customerType] || 0) + c.totalSpend;
    }
    return Object.entries(segMap)
      .map(([name, value]) => ({ name, value }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, []);

  // Top 10 Customers by Spend
  const topCustomers = useMemo(() => {
    return [...customerAnalytics]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10)
      .map(c => ({
        name: c.customerName.length > 20 ? c.customerName.substring(0, 20) + '...' : c.customerName,
        spend: c.totalSpend,
      }));
  }, []);

  // Receivables Aging (B2B customers)
  const receivablesAging = useMemo(() => {
    const b2bCustomers = customerAnalytics.filter(c =>
      c.customerType.startsWith('B2B') && c.totalOrders > 0
    );
    const buckets = { 'Current': 0, '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, '>90 days': 0 };

    for (const c of b2bCustomers) {
      const cust = customers.find(cu => cu.id === c.customerId);
      if (!cust || cust.outstandingBalance <= 0) continue;

      const overdueDays = c.daysSinceLastOrder - (cust.creditDays || 30);
      if (overdueDays <= 0) buckets['Current'] += cust.outstandingBalance;
      else if (overdueDays <= 30) buckets['1-30 days'] += cust.outstandingBalance;
      else if (overdueDays <= 60) buckets['31-60 days'] += cust.outstandingBalance;
      else if (overdueDays <= 90) buckets['61-90 days'] += cust.outstandingBalance;
      else buckets['>90 days'] += cust.outstandingBalance;
    }

    return Object.entries(buckets).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, []);

  // Monthly Active Customers
  const monthlyActive = useMemo(() => {
    const monthSet: Record<string, Set<string>> = {};

    for (const o of posOrders) {
      if (o.status !== 'completed') continue;
      const month = o.orderDate.substring(0, 7);
      if (!monthSet[month]) monthSet[month] = new Set();
      monthSet[month].add(o.customerId);
    }

    for (const o of b2bOrders) {
      if (o.status === 'Cancelled') continue;
      const month = o.orderDate.substring(0, 7);
      if (!monthSet[month]) monthSet[month] = new Set();
      monthSet[month].add(o.customerId);
    }

    return Object.entries(monthSet)
      .map(([month, custSet]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        customers: custSet.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, []);

  // Customer ledger - top 30 by spend
  const customerLedger = useMemo(() => {
    return [...customerAnalytics]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 30)
      .map(c => {
        const cust = customers.find(cu => cu.id === c.customerId);
        return {
          ...c,
          creditLimit: cust?.creditLimit || 0,
        };
      });
  }, []);

  return (
    <PageLayout title="Customer Analytics" subtitle="Customer segments, lifetime value, and receivables tracking" icon={Users} iconColor="text-violet-600">
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Revenue by Segment */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue by Customer Segment</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segmentRevenue} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${formatINRCompact(value)}`}>
                    {segmentRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Customers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top 10 Customers by Spend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="spend" name="Total Spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Receivables Aging */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Receivables Aging (B2B)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receivablesAging}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="value" name="Outstanding Amount">
                    {receivablesAging.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#dc2626'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Active Customers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Active Customers</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyActive}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="customers" name="Active Customers" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Ledger Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Customer Ledger (Top 30)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Name</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Type</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Total Spend</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Last Order</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Outstanding</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Credit Limit</th>
                </tr>
              </thead>
              <tbody>
                {customerLedger.map(c => (
                  <tr key={c.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-medium max-w-[160px] truncate">{c.customerName}</td>
                    <td className="py-1.5 px-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        c.customerType === 'Walk-in' ? 'bg-gray-100 text-gray-700' :
                        c.customerType === 'Regular' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right">{formatINR(c.totalSpend)}</td>
                    <td className="py-1.5 px-2 text-right">{c.totalOrders}</td>
                    <td className="py-1.5 px-2">{c.lastOrderDate ? formatDate(c.lastOrderDate) : '-'}</td>
                    <td className={`py-1.5 px-2 text-right ${c.outstandingBalance > 0 ? 'text-red-600 font-medium' : ''}`}>
                      {formatINR(c.outstandingBalance)}
                    </td>
                    <td className="py-1.5 px-2 text-right">{c.creditLimit > 0 ? formatINR(c.creditLimit) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
