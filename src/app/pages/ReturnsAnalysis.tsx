import { Undo2, ShoppingCart, Percent, Trash2 } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { returnsSummary, revenueByMonth } from '../data/computedData';
import { salesReturns, salesReturnLines, purchaseReturns } from '../data/transactions/returns';
import { stockMovements } from '../data/transactions/stockMovements';
import { products } from '../data/seed/products';
import { customers } from '../data/seed/customers';
import { formatINR, formatINRCompact, formatPercent, formatDate } from '../lib/formatUtils';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export function ReturnsAnalysis() {
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), []);
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), []);

  const salesReturnValue = returnsSummary.reduce((sum, r) => sum + r.salesReturnValue, 0);
  const purchaseReturnValue = returnsSummary.reduce((sum, r) => sum + r.purchaseReturnValue, 0);

  const totalRevenue = revenueByMonth.reduce((sum, m) => sum + m.totalRevenue, 0);
  const returnRate = totalRevenue > 0 ? (salesReturnValue / totalRevenue) * 100 : 0;

  // Write-off value from stock movements
  const writeOffValue = useMemo(() => {
    return stockMovements
      .filter(m => m.referenceType === 'Write-off')
      .reduce((sum, m) => {
        const prod = productMap.get(m.productId);
        return sum + Math.abs(m.quantityChange) * (prod?.purchasePrice || 0);
      }, 0);
  }, [productMap]);

  const kpis: KPICardConfig[] = [
    { title: 'Sales Returns (FY)', value: formatINR(salesReturnValue), icon: Undo2, color: 'text-blue-600', bgColor: 'bg-blue-100', subtitle: `${salesReturns.length} returns` },
    { title: 'Purchase Returns (FY)', value: formatINR(purchaseReturnValue), icon: ShoppingCart, color: 'text-green-600', bgColor: 'bg-green-100', subtitle: `${purchaseReturns.length} returns` },
    { title: 'Return Rate', value: formatPercent(returnRate), icon: Percent, color: 'text-orange-600', bgColor: 'bg-orange-100', subtitle: 'of total revenue' },
    { title: 'Write-off Value', value: formatINR(writeOffValue), icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

  // Monthly Returns Trend (dual line)
  const monthlyTrend = useMemo(() => {
    return returnsSummary.map(r => ({
      month: r.monthLabel,
      salesReturnValue: r.salesReturnValue,
      purchaseReturnValue: r.purchaseReturnValue,
    }));
  }, []);

  // Return Reasons (from sales returns)
  const returnReasons = useMemo(() => {
    const reasonMap: Record<string, number> = {};
    for (const r of salesReturns) {
      reasonMap[r.reason] = (reasonMap[r.reason] || 0) + 1;
    }
    return Object.entries(reasonMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  // Top Products by Return Value
  const topReturnProducts = useMemo(() => {
    const prodVal: Record<string, number> = {};
    for (const line of salesReturnLines) {
      prodVal[line.productId] = (prodVal[line.productId] || 0) + line.lineTotal;
    }
    return Object.entries(prodVal)
      .map(([productId, value]) => {
        const prod = productMap.get(productId);
        const name = prod?.name || productId;
        return {
          name: name.length > 22 ? name.substring(0, 22) + '...' : name,
          value,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [productMap]);

  // Return Status breakdown
  const statusBreakdown = useMemo(() => {
    const statusMap: Record<string, number> = {};
    for (const r of salesReturns) {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
    }
    return Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    'Pending': '#f59e0b',
    'Approved': '#3b82f6',
    'Processed': '#10b981',
    'Rejected': '#ef4444',
  };

  // Returns register - last 30 returns
  const recentReturns = useMemo(() => {
    const allReturns = [
      ...salesReturns.map(r => ({
        id: r.id,
        type: 'Sales' as const,
        customerName: customerMap.get(r.customerId)?.name || r.customerId,
        date: r.returnDate,
        reason: r.reason,
        amount: r.totalAmount,
        status: r.status,
      })),
      ...purchaseReturns.map(r => ({
        id: r.id,
        type: 'Purchase' as const,
        customerName: r.supplierId,
        date: r.returnDate,
        reason: r.reason,
        amount: r.totalAmount,
        status: r.status,
      })),
    ];
    return allReturns
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
  }, [customerMap]);

  return (
    <PageLayout title="Returns & Write-offs" subtitle="Sales returns, purchase returns, and write-off analysis" icon={Undo2} iconColor="text-red-600">
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Monthly Returns Trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Returns Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="salesReturnValue" name="Sales Returns" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="purchaseReturnValue" name="Purchase Returns" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Return Reasons */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Return Reasons</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={returnReasons} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {returnReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Top Products by Return Value */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Products by Return Value</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topReturnProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={120} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="value" name="Return Value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Return Status */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Return Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusBreakdown.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#9ca3af'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns Register Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Returns Register</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Return ID</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Type</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Customer / Supplier</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Reason</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Amount</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReturns.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-mono">{r.id}</td>
                    <td className="py-1.5 px-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        r.type === 'Sales' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 max-w-[150px] truncate">{r.customerName}</td>
                    <td className="py-1.5 px-2">{formatDate(r.date)}</td>
                    <td className="py-1.5 px-2">{r.reason}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{formatINR(r.amount)}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        r.status === 'Processed' || r.status === 'Credited' ? 'bg-green-100 text-green-700' :
                        r.status === 'Approved' || r.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        r.status === 'Dispatched' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
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
