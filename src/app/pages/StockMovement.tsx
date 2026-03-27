import { ArrowLeftRight, TrendingDown, RotateCcw, PackageMinus } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { stockTurnover } from '../data/computedData';
import { stockMovements } from '../data/transactions/stockMovements';
import { products } from '../data/seed/products';
import { formatINR, formatINRCompact, formatNumber, formatDate } from '../lib/formatUtils';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export function StockMovement() {
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), []);

  // Current month movements
  const currentMonth = '2026-03';
  const thisMonthMovements = useMemo(
    () => stockMovements.filter(m => m.movementDate.startsWith(currentMonth)),
    []
  );

  const stockInward = thisMonthMovements
    .filter(m => m.movementType === 'IN')
    .reduce((sum, m) => sum + m.quantityChange, 0);

  const stockOutward = thisMonthMovements
    .filter(m => m.movementType === 'OUT')
    .reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

  const avgTurnover = useMemo(() => {
    const withTurnover = stockTurnover.filter(t => t.turnoverRatio > 0);
    return withTurnover.length > 0
      ? (withTurnover.reduce((s, t) => s + t.turnoverRatio, 0) / withTurnover.length).toFixed(1)
      : '0';
  }, []);

  const slowMoving = stockTurnover.filter(t => t.daysInInventory > 180 && t.avgInventory > 0).length;

  const kpis: KPICardConfig[] = [
    { title: 'Stock Inward (This Month)', value: formatNumber(stockInward), icon: ArrowLeftRight, color: 'text-blue-600', bgColor: 'bg-blue-100', subtitle: 'units received' },
    { title: 'Stock Outward (This Month)', value: formatNumber(stockOutward), icon: PackageMinus, color: 'text-green-600', bgColor: 'bg-green-100', subtitle: 'units dispatched' },
    { title: 'Avg Turnover Ratio', value: avgTurnover, icon: RotateCcw, color: 'text-purple-600', bgColor: 'bg-purple-100', subtitle: 'times/year' },
    { title: 'Slow-Moving SKUs', value: String(slowMoving), icon: TrendingDown, color: 'text-orange-600', bgColor: 'bg-orange-100', subtitle: '>180 days inventory' },
  ];

  // Monthly In vs Out
  const monthlyInOut = useMemo(() => {
    const monthMap: Record<string, { month: string; inQty: number; outQty: number }> = {};
    for (const m of stockMovements) {
      const monthKey = m.movementDate.substring(0, 7);
      if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, inQty: 0, outQty: 0 };
      if (m.movementType === 'IN') monthMap[monthKey].inQty += m.quantityChange;
      else if (m.movementType === 'OUT') monthMap[monthKey].outQty += Math.abs(m.quantityChange);
    }
    return Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        month: new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        'Stock In': m.inQty,
        'Stock Out': m.outQty,
      }));
  }, []);

  // Turnover by Category
  const turnoverByCategory = useMemo(() => {
    const catMap: Record<string, { total: number; count: number }> = {};
    for (const t of stockTurnover) {
      if (t.turnoverRatio > 0) {
        if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 };
        catMap[t.category].total += t.turnoverRatio;
        catMap[t.category].count++;
      }
    }
    return Object.entries(catMap)
      .map(([category, data]) => ({ category, avgTurnover: parseFloat((data.total / data.count).toFixed(2)) }))
      .sort((a, b) => b.avgTurnover - a.avgTurnover);
  }, []);

  // Days in Inventory - top 20 slow movers
  const slowMovers = useMemo(() => {
    return stockTurnover
      .filter(t => t.avgInventory > 0)
      .sort((a, b) => b.daysInInventory - a.daysInInventory)
      .slice(0, 20)
      .map(t => ({
        name: t.productName.length > 22 ? t.productName.substring(0, 22) + '...' : t.productName,
        days: Math.min(t.daysInInventory, 999),
      }));
  }, []);

  // Movement Type Breakdown
  const movementTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of stockMovements) {
      counts[m.referenceType] = (counts[m.referenceType] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  // Last 30 movements for the table
  const recentMovements = useMemo(() => {
    return [...stockMovements]
      .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
      .slice(0, 30)
      .map(m => {
        const product = productMap.get(m.productId);
        return { ...m, productName: product?.name || m.productId };
      });
  }, [productMap]);

  return (
    <PageLayout title="Stock Movement & Turnover" subtitle="Track inward/outward movements, turnover ratios, and slow-moving inventory" icon={ArrowLeftRight} iconColor="text-blue-600">
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Monthly In vs Out */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Stock In vs Out</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyInOut}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Stock In" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Stock Out" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Turnover by Category */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Turnover by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnoverByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avgTurnover" name="Avg Turnover Ratio" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Days in Inventory - Slow Movers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Slow Movers - Days in Inventory</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slowMovers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="days" name="Days in Inventory" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Movement Type Breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Movement Type Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={movementTypeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {movementTypeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement Audit Log */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Stock Movements</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Batch</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Type</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Reference</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Qty Change</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2">{formatDate(m.movementDate)}</td>
                    <td className="py-1.5 px-2 max-w-[180px] truncate">{m.productName}</td>
                    <td className="py-1.5 px-2">{m.batchNumber}</td>
                    <td className="py-1.5 px-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        m.movementType === 'IN' ? 'bg-green-100 text-green-700' :
                        m.movementType === 'OUT' ? 'bg-red-100 text-red-700' :
                        m.movementType === 'TRANSFER' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">{m.referenceType}</td>
                    <td className={`py-1.5 px-2 text-right font-medium ${m.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                    </td>
                    <td className="py-1.5 px-2 text-right">{m.balanceAfter}</td>
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
