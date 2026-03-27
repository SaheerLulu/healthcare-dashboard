import { useMemo } from 'react';
import { Truck, IndianRupee, Clock, FileText } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { purchasesByMonth, supplierPerformance } from '../data/computedData';
import { purchaseOrders, suppliers } from '../data/index';
import { formatINR, formatINRCompact, formatDate } from '../lib/formatUtils';

export function Purchases() {
  // KPI calculations
  const fyTotalPurchases = purchasesByMonth.reduce((s, m) => s + m.totalPurchases, 0);
  const fyPendingPayments = purchasesByMonth.reduce((s, m) => s + m.pendingAmount, 0);

  const activePOs = purchaseOrders.filter(o => o.status !== 'Cancelled');
  const receivedPOs = activePOs.filter(o => o.status === 'Received' || o.status === 'Partial');
  const avgLeadTime = useMemo(() => {
    let totalDays = 0;
    let count = 0;
    for (const po of receivedPOs) {
      if (po.actualDeliveryDate && po.orderDate) {
        const days = Math.floor(
          (new Date(po.actualDeliveryDate).getTime() - new Date(po.orderDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days > 0 && days < 90) {
          totalDays += days;
          count++;
        }
      }
    }
    return count > 0 ? Math.round(totalDays / count) : 0;
  }, []);

  const openPOs = purchaseOrders.filter(o => o.status === 'Draft' || o.status === 'Confirmed' || o.status === 'Partial').length;

  const kpis: KPICardConfig[] = [
    {
      title: 'Total Purchases (FY)',
      value: formatINR(fyTotalPurchases),
      icon: IndianRupee,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: `${activePOs.length} purchase orders`,
    },
    {
      title: 'Pending Payments',
      value: formatINR(fyPendingPayments),
      icon: IndianRupee,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      subtitle: 'Outstanding to suppliers',
    },
    {
      title: 'Avg Lead Time',
      value: `${avgLeadTime} days`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: 'Order to delivery',
    },
    {
      title: 'Open POs',
      value: String(openPOs),
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: 'Draft + Confirmed + Partial',
    },
  ];

  // Chart 1: Monthly Purchase Trend (total vs paid)
  const monthlyPurchaseData = purchasesByMonth.map(m => ({
    monthLabel: m.monthLabel,
    total: m.totalPurchases,
    paid: m.paidAmount,
    pending: m.pendingAmount,
  }));

  // Chart 2: Top 10 Suppliers by purchase value
  const topSuppliers = useMemo(() => {
    return [...supplierPerformance]
      .sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue)
      .slice(0, 10)
      .map(s => ({
        name: s.supplierName.length > 20 ? s.supplierName.substring(0, 17) + '...' : s.supplierName,
        value: s.totalPurchaseValue,
      }));
  }, []);

  // Chart 3: PO Status Distribution
  const poStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const po of purchaseOrders) {
      counts[po.status] = (counts[po.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    'Draft': '#6b7280',
    'Confirmed': '#3b82f6',
    'Partial': '#f59e0b',
    'Received': '#10b981',
    'Cancelled': '#ef4444',
  };

  // Chart 4: Payment Aging
  const paymentAging = useMemo(() => {
    const today = new Date('2026-03-27');
    const buckets = { 'Current': 0, '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, '90+ days': 0 };
    for (const po of purchaseOrders) {
      if (po.paymentStatus === 'Paid' || po.status === 'Cancelled') continue;
      const dueDate = new Date(po.paymentDueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = po.paymentStatus === 'Partial' ? po.netAmount * 0.5 : po.netAmount;

      if (daysOverdue <= 0) buckets['Current'] += amount;
      else if (daysOverdue <= 30) buckets['1-30 days'] += amount;
      else if (daysOverdue <= 60) buckets['31-60 days'] += amount;
      else if (daysOverdue <= 90) buckets['61-90 days'] += amount;
      else buckets['90+ days'] += amount;
    }
    return Object.entries(buckets).map(([bucket, amount]) => ({ bucket, amount: Math.round(amount) }));
  }, []);

  // Table: Outstanding payments
  const outstandingPayments = useMemo(() => {
    const today = new Date('2026-03-27');
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));

    return purchaseOrders
      .filter(po => po.paymentStatus !== 'Paid' && po.status !== 'Cancelled')
      .map(po => {
        const supplier = supplierMap.get(po.supplierId);
        const dueDate = new Date(po.paymentDueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const outstandingAmount = po.paymentStatus === 'Partial' ? po.netAmount * 0.5 : po.netAmount;

        return {
          id: po.id,
          supplierName: supplier?.name || po.supplierId,
          invoiceNumber: po.invoiceNumber,
          amount: outstandingAmount,
          dueDate: po.paymentDueDate,
          daysOverdue: Math.max(0, daysOverdue),
          paymentStatus: po.paymentStatus,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 20);
  }, []);

  return (
    <PageLayout
      title="Purchases & Procurement"
      subtitle="Purchase orders, supplier payments, and procurement analytics"
      icon={Truck}
      iconColor="text-orange-600"
    >
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4">
        {/* 1. Monthly Purchase Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Purchase Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPurchaseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                  <Bar dataKey="total" name="Total Purchases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="Paid Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Top 10 Suppliers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 10 Suppliers by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSuppliers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="value" name="Purchase Value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. PO Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PO Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={poStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {poStatusData.map((entry) => (
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

        {/* 4. Payment Aging */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment Aging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentAging}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="amount" name="Outstanding Amount">
                    {paymentAging.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#991b1b'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments Table */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstandingPayments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[180px] truncate">{row.supplierName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.invoiceNumber}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(row.amount)}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    <span className={
                      row.daysOverdue > 60 ? 'text-red-600 font-semibold' :
                      row.daysOverdue > 30 ? 'text-orange-600 font-medium' :
                      row.daysOverdue > 0 ? 'text-yellow-600' : 'text-green-600'
                    }>
                      {row.daysOverdue > 0 ? `${row.daysOverdue}d` : 'Current'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      row.paymentStatus === 'Pending' ? 'text-red-700 border-red-300' : 'text-orange-700 border-orange-300'
                    }>
                      {row.paymentStatus}
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
