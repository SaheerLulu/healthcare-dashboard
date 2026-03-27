import { Package, IndianRupee, AlertTriangle, XCircle } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { stockHealth, expiryAlerts } from '../data/computedData';
import { products } from '../data/seed/products';
import { locations } from '../data/seed/locations';
import { stockQuants } from '../data/transactions/stockQuants';
import { formatINR, formatINRCompact, formatNumber, formatDate } from '../lib/formatUtils';
import { useMemo } from 'react';

export function InventoryHealth() {
  const inStockCount = stockHealth.filter(s => s.totalOnHand > 0).length;
  const inventoryValue = stockHealth.reduce((s, p) => s + p.stockValue, 0);
  const expiringIn30 = expiryAlerts.filter(e => e.status === 'Critical' || e.status === 'Expired').length;
  const outOfStock = stockHealth.filter(s => s.stockStatus === 'Out of Stock').length;

  const kpis: KPICardConfig[] = [
    { title: 'SKUs in Stock', value: formatNumber(inStockCount), icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100', subtitle: `of ${products.length} total` },
    { title: 'Inventory Value', value: formatINR(inventoryValue), icon: IndianRupee, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Expiring ≤30 Days', value: String(expiringIn30), icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { title: 'Out of Stock', value: String(outOfStock), icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

  // Stock Status Pie
  const stockStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of stockHealth) counts[s.stockStatus] = (counts[s.stockStatus] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    'Adequate': '#10b981', 'Low': '#f59e0b', 'Critical': '#ef4444',
    'Out of Stock': '#6b7280', 'Overstocked': '#3b82f6',
  };

  // Expiry buckets
  const expiryBuckets = useMemo(() => {
    const buckets = { 'Expired': 0, '≤30d': 0, '≤90d': 0, '≤180d': 0 };
    for (const a of expiryAlerts) {
      if (a.status === 'Expired') buckets['Expired']++;
      else if (a.status === 'Critical') buckets['≤30d']++;
      else if (a.status === 'Warning') buckets['≤90d']++;
      else buckets['≤180d']++;
    }
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, []);

  // Inventory value by category
  const categoryValue = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const s of stockHealth) catMap[s.category] = (catMap[s.category] || 0) + s.stockValue;
    return Object.entries(catMap)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, []);

  // Stock vs Reorder Level (top 20 critical)
  const stockVsReorder = useMemo(() => {
    return stockHealth
      .filter(s => s.stockStatus === 'Critical' || s.stockStatus === 'Low')
      .sort((a, b) => (a.totalOnHand / a.reorderLevel) - (b.totalOnHand / b.reorderLevel))
      .slice(0, 15)
      .map(s => ({
        name: s.productName.length > 20 ? s.productName.substring(0, 20) + '...' : s.productName,
        stock: s.totalOnHand,
        reorderLevel: s.reorderLevel,
      }));
  }, []);

  // Location-wise distribution
  const locationStock = useMemo(() => {
    const locMap: Record<string, number> = {};
    for (const sq of stockQuants) {
      const loc = locations.find(l => l.id === sq.locationId);
      const name = loc?.name || sq.locationId;
      locMap[name] = (locMap[name] || 0) + sq.quantityOnHand * sq.purchasePrice;
    }
    return Object.entries(locMap).map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value }));
  }, []);

  // Near expiry list (top 15)
  const nearExpiryList = useMemo(() => expiryAlerts.slice(0, 15), []);

  return (
    <PageLayout title="Inventory Health" subtitle="Stock levels, expiry tracking, and reorder alerts" icon={Package} iconColor="text-emerald-600">
      <KPICardGrid cards={kpis} />
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Stock Status Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {stockStatusData.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#9ca3af'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Calendar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expiry Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expiryBuckets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Products">
                    {expiryBuckets.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#fb923c', '#84cc16'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value by Category */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Value by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryValue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Stock vs Reorder */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock vs Reorder Level</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stockVsReorder} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={110} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="stock" name="Current Stock" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Line type="monotone" dataKey="reorderLevel" name="Reorder Level" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock by Location</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={locationStock} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name }) => name}>
                    {locationStock.map((_, i) => <Cell key={i} fill={['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1'][i % 8]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Near Expiry List */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Near-Expiry Products</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] overflow-auto space-y-2">
              {nearExpiryList.map((item) => (
                <div key={`${item.batchNumber}-${item.productId}`} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.productName}</div>
                    <div className="text-gray-500">{item.batchNumber} | Qty: {item.quantity}</div>
                  </div>
                  <div className="w-20">
                    <Progress
                      value={Math.max(0, Math.min(100, (item.daysToExpiry / 180) * 100))}
                      className="h-2"
                    />
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${item.daysToExpiry <= 0 ? 'text-red-600' : item.daysToExpiry <= 30 ? 'text-orange-600' : 'text-yellow-600'}`}>
                    {item.daysToExpiry <= 0 ? 'Expired' : `${item.daysToExpiry}d`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
