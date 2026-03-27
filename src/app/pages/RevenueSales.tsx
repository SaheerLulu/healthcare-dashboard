import { useMemo } from 'react';
import { IndianRupee, ShoppingCart, Receipt, CreditCard } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { revenueByMonth, productProfitability } from '../data/computedData';
import { posOrders, b2bOrders, customers, locations } from '../data/index';
import { formatINR, formatINRCompact, formatPercent, formatDate } from '../lib/formatUtils';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#06b6d4', '#d97706'];

export function RevenueSales() {
  // KPI calculations
  const fyTotalRevenue = revenueByMonth.reduce((s, m) => s + m.totalRevenue, 0);
  const fyPOSRevenue = revenueByMonth.reduce((s, m) => s + m.posRevenue, 0);
  const fyB2BRevenue = revenueByMonth.reduce((s, m) => s + m.b2bRevenue, 0);
  const totalOrders = revenueByMonth.reduce((s, m) => s + m.orderCount, 0);

  const completedPOS = posOrders.filter(o => o.status === 'completed');
  const avgBasketValue = completedPOS.length > 0
    ? completedPOS.reduce((s, o) => s + o.netAmount, 0) / completedPOS.length
    : 0;

  const totalInvoices = completedPOS.length + b2bOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Draft').length;

  const kpis: KPICardConfig[] = [
    {
      title: 'FY Total Revenue',
      value: formatINR(fyTotalRevenue),
      icon: IndianRupee,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: `${revenueByMonth.length} months`,
    },
    {
      title: 'POS / B2B Split',
      value: `${formatPercent(fyPOSRevenue / fyTotalRevenue * 100, 0)} / ${formatPercent(fyB2BRevenue / fyTotalRevenue * 100, 0)}`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: `POS ${formatINRCompact(fyPOSRevenue)} | B2B ${formatINRCompact(fyB2BRevenue)}`,
    },
    {
      title: 'Avg Basket Value',
      value: formatINR(avgBasketValue),
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: 'POS orders',
    },
    {
      title: 'Total Invoices',
      value: String(totalInvoices),
      icon: Receipt,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      subtitle: `${totalOrders} total orders`,
    },
  ];

  // Chart 2: Payment mode distribution
  const paymentModeData = useMemo(() => {
    const modes: Record<string, number> = {};
    for (const o of completedPOS) {
      modes[o.paymentMode] = (modes[o.paymentMode] || 0) + o.netAmount;
    }
    return Object.entries(modes).map(([name, value]) => ({ name, value }));
  }, []);

  const PAYMENT_COLORS: Record<string, string> = {
    'Cash': '#10b981',
    'UPI': '#3b82f6',
    'Card': '#8b5cf6',
    'Credit': '#f59e0b',
  };

  // Chart 3: Top 10 products by revenue
  const topProducts = useMemo(() => {
    return [...productProfitability]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map(p => ({
        name: p.productName.length > 25 ? p.productName.substring(0, 22) + '...' : p.productName,
        revenue: p.totalRevenue,
      }));
  }, []);

  // Chart 4: Revenue by Location
  const revenueByLocation = useMemo(() => {
    const locMap: Record<string, number> = {};
    for (const o of completedPOS) {
      const loc = locations.find(l => l.id === o.locationId);
      const name = loc?.name || o.locationId;
      locMap[name] = (locMap[name] || 0) + o.netAmount;
    }
    for (const o of b2bOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Draft')) {
      const loc = locations.find(l => l.id === o.locationId);
      const name = loc?.name || o.locationId;
      locMap[name] = (locMap[name] || 0) + o.netAmount;
    }
    return Object.entries(locMap)
      .map(([location, revenue]) => ({ location, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, []);

  // Chart 5: Daily Sales last 30 days
  const dailySales = useMemo(() => {
    const dayMap: Record<string, { pos: number; b2b: number }> = {};
    const cutoff = '2026-02-25';
    for (const o of completedPOS) {
      if (o.orderDate >= cutoff) {
        if (!dayMap[o.orderDate]) dayMap[o.orderDate] = { pos: 0, b2b: 0 };
        dayMap[o.orderDate].pos += o.netAmount;
      }
    }
    for (const o of b2bOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Draft')) {
      if (o.orderDate >= cutoff) {
        if (!dayMap[o.orderDate]) dayMap[o.orderDate] = { pos: 0, b2b: 0 };
        dayMap[o.orderDate].b2b += o.netAmount;
      }
    }
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: date.substring(5),
        pos: Math.round(vals.pos),
        b2b: Math.round(vals.b2b),
        total: Math.round(vals.pos + vals.b2b),
      }));
  }, []);

  // Chart 6: Sales by Hour
  const salesByHour = useMemo(() => {
    const hourMap: Record<number, number> = {};
    for (const o of completedPOS) {
      const hour = parseInt(o.orderTime.split(':')[0], 10);
      hourMap[hour] = (hourMap[hour] || 0) + o.netAmount;
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      revenue: Math.round(hourMap[h] || 0),
    })).filter(d => d.revenue > 0);
  }, []);

  // Table: Last 20 orders
  const recentOrders = useMemo(() => {
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const posEntries = completedPOS.map(o => ({
      id: o.id,
      type: 'POS' as const,
      customer: customerMap.get(o.customerId)?.name || 'Walk-in',
      date: o.orderDate,
      amount: o.netAmount,
      status: 'Completed',
      paymentMode: o.paymentMode,
    }));

    const b2bEntries = b2bOrders
      .filter(o => o.status !== 'Cancelled')
      .map(o => ({
        id: o.id,
        type: 'B2B' as const,
        customer: customerMap.get(o.customerId)?.name || o.customerId,
        date: o.orderDate,
        amount: o.netAmount,
        status: o.status,
        paymentMode: o.paymentStatus,
      }));

    return [...posEntries, ...b2bEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, []);

  return (
    <PageLayout
      title="Revenue & Sales"
      subtitle="Sales performance, trends, and channel analysis"
      icon={IndianRupee}
      iconColor="text-green-600"
    >
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-3 gap-4">
        {/* 1. Monthly Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue Trend</CardTitle>
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

        {/* 2. Payment Mode Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatINRCompact(value)}`}
                  >
                    {paymentModeData.map((entry) => (
                      <Cell key={entry.name} fill={PAYMENT_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Top 10 Products by Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 10 Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. Revenue by Location */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByLocation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 5. Daily Sales Last 30 Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Sales (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="pos" name="POS" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="b2b" name="B2B" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 6. Sales by Hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales by Hour of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Orders (Last 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id}</TableCell>
                  <TableCell>
                    <Badge variant={order.type === 'POS' ? 'default' : 'secondary'} className={order.type === 'POS' ? 'bg-blue-600' : 'bg-green-600 text-white'}>
                      {order.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{order.customer}</TableCell>
                  <TableCell>{formatDate(order.date)}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(order.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      order.status === 'Completed' || order.status === 'Delivered' ? 'text-green-700 border-green-300' :
                      order.status === 'Dispatched' ? 'text-blue-700 border-blue-300' :
                      order.status === 'Confirmed' ? 'text-orange-700 border-orange-300' :
                      'text-gray-700 border-gray-300'
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
