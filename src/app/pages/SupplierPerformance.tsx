import { Truck, Clock, CheckCircle, IndianRupee } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supplierPerformance } from '../data/computedData';
import { purchaseOrders } from '../data/transactions/purchaseOrders';
import { formatINR, formatINRCompact, formatPercent, formatNumber } from '../lib/formatUtils';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export function SupplierPerformance() {
  const activeSuppliers = supplierPerformance.filter(s => s.totalOrders > 0).length;

  const avgOnTimeRate = useMemo(() => {
    const withDeliveries = supplierPerformance.filter(s => (s.onTimeDeliveries + s.lateDeliveries) > 0);
    return withDeliveries.length > 0
      ? withDeliveries.reduce((sum, s) => sum + s.onTimeRate, 0) / withDeliveries.length
      : 0;
  }, []);

  const avgLeadTime = useMemo(() => {
    const withOrders = supplierPerformance.filter(s => s.totalOrders > 0);
    return withOrders.length > 0
      ? Math.round(withOrders.reduce((sum, s) => sum + s.avgLeadTimeDays, 0) / withOrders.length)
      : 0;
  }, []);

  const outstandingPayables = useMemo(() => {
    return purchaseOrders
      .filter(o => o.paymentStatus === 'Pending' || o.paymentStatus === 'Partial')
      .reduce((sum, o) => {
        if (o.paymentStatus === 'Pending') return sum + o.netAmount;
        return sum + o.netAmount * 0.5;
      }, 0);
  }, []);

  const kpis: KPICardConfig[] = [
    { title: 'Active Suppliers', value: String(activeSuppliers), icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-100', subtitle: `of ${supplierPerformance.length} total` },
    { title: 'Avg On-Time Rate', value: formatPercent(avgOnTimeRate), icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Avg Lead Time', value: `${avgLeadTime} days`, icon: Clock, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { title: 'Outstanding Payables', value: formatINR(outstandingPayables), icon: IndianRupee, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];

  // On-Time Rate by Supplier
  const onTimeData = useMemo(() => {
    return supplierPerformance
      .filter(s => (s.onTimeDeliveries + s.lateDeliveries) > 0)
      .sort((a, b) => a.onTimeRate - b.onTimeRate)
      .map(s => ({
        name: s.supplierName.length > 20 ? s.supplierName.substring(0, 20) + '...' : s.supplierName,
        onTimeRate: s.onTimeRate,
      }));
  }, []);

  // Lead Time Comparison
  const leadTimeData = useMemo(() => {
    return supplierPerformance
      .filter(s => s.totalOrders > 0)
      .sort((a, b) => b.avgLeadTimeDays - a.avgLeadTimeDays)
      .map(s => ({
        name: s.supplierName.length > 20 ? s.supplierName.substring(0, 20) + '...' : s.supplierName,
        leadTime: s.avgLeadTimeDays,
      }));
  }, []);

  // Purchase Value Share
  const valueShare = useMemo(() => {
    return supplierPerformance
      .filter(s => s.totalPurchaseValue > 0)
      .sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue)
      .map(s => ({
        name: s.supplierName.length > 18 ? s.supplierName.substring(0, 18) + '...' : s.supplierName,
        value: s.totalPurchaseValue,
      }));
  }, []);

  // Return Rate by Supplier
  const returnRateData = useMemo(() => {
    return supplierPerformance
      .filter(s => s.totalOrders > 0)
      .sort((a, b) => b.returnRate - a.returnRate)
      .map(s => ({
        name: s.supplierName.length > 20 ? s.supplierName.substring(0, 20) + '...' : s.supplierName,
        returnRate: s.returnRate,
      }));
  }, []);

  // Scorecard sorted by total value
  const scorecard = useMemo(() => {
    return [...supplierPerformance]
      .filter(s => s.totalOrders > 0)
      .sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue);
  }, []);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-500' : 'text-gray-300'}>
          {'\u2605'}
        </span>
      );
    }
    return <span className="inline-flex">{stars}</span>;
  };

  return (
    <PageLayout title="Supplier Performance" subtitle="On-time delivery, lead times, and supplier scorecards" icon={Truck} iconColor="text-indigo-600">
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* On-Time Rate */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">On-Time Delivery Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={onTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <ReferenceLine x={90} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '90%', fontSize: 10, fill: '#ef4444' }} />
                  <Bar dataKey="onTimeRate" name="On-Time %" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Time */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Lead Time Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v} days`} />
                  <Bar dataKey="leadTime" name="Avg Lead Time (days)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Purchase Value Share */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Purchase Value Share</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={valueShare} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name }) => name}>
                    {valueShare.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Return Rate */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Return Rate by Supplier</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                  <Bar dataKey="returnRate" name="Return Rate %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Scorecard Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Supplier Scorecard</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Supplier</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Orders</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">On-Time %</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Avg Lead Time</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Total Value</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Return Rate</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Rating</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.map(s => (
                  <tr key={s.supplierId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-medium">{s.supplierName}</td>
                    <td className="py-1.5 px-2 text-right">{s.totalOrders}</td>
                    <td className="py-1.5 px-2 text-right">
                      <span className={s.onTimeRate >= 90 ? 'text-green-600' : s.onTimeRate >= 75 ? 'text-yellow-600' : 'text-red-600'}>
                        {s.onTimeRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right">{s.avgLeadTimeDays} days</td>
                    <td className="py-1.5 px-2 text-right">{formatINR(s.totalPurchaseValue)}</td>
                    <td className="py-1.5 px-2 text-right">
                      <span className={s.returnRate > 5 ? 'text-red-600' : s.returnRate > 2 ? 'text-yellow-600' : 'text-green-600'}>
                        {s.returnRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center">{renderStars(s.rating)}</td>
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
