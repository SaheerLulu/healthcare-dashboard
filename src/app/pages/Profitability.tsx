import { useMemo } from 'react';
import { TrendingUp, Target, AlertTriangle, PackageX } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { productProfitability, revenueByMonth, stockHealth } from '../data/computedData';
import { formatINR, formatINRCompact, formatPercent } from '../lib/formatUtils';

export function Profitability() {
  // Overall margin
  const totalRevenue = productProfitability.reduce((s, p) => s + p.totalRevenue, 0);
  const totalCost = productProfitability.reduce((s, p) => s + p.totalCost, 0);
  const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0;

  // Best and worst margin categories
  const categoryMargins = useMemo(() => {
    const catMap: Record<string, { revenue: number; cost: number }> = {};
    for (const p of productProfitability) {
      if (!catMap[p.category]) catMap[p.category] = { revenue: 0, cost: 0 };
      catMap[p.category].revenue += p.totalRevenue;
      catMap[p.category].cost += p.totalCost;
    }
    return Object.entries(catMap)
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        cost: data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0,
      }))
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.margin - a.margin);
  }, []);

  const bestCategory = categoryMargins[0];
  const worstCategory = categoryMargins[categoryMargins.length - 1];

  // Dead stock value (products with zero sales but positive stock)
  const deadStockValue = useMemo(() => {
    const soldProductIds = new Set(
      productProfitability.filter(p => p.unitsSold > 0).map(p => p.productId)
    );
    return stockHealth
      .filter(s => s.totalOnHand > 0 && !soldProductIds.has(s.productId))
      .reduce((s, p) => s + p.stockValue, 0);
  }, []);

  const kpis: KPICardConfig[] = [
    {
      title: 'Overall Gross Margin',
      value: formatPercent(overallMargin),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: `Revenue ${formatINRCompact(totalRevenue)}`,
    },
    {
      title: 'Best Margin Category',
      value: bestCategory ? formatPercent(bestCategory.margin) : '-',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: bestCategory?.category || '',
    },
    {
      title: 'Worst Margin Category',
      value: worstCategory ? formatPercent(worstCategory.margin) : '-',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      subtitle: worstCategory?.category || '',
    },
    {
      title: 'Dead Stock Value',
      value: formatINR(deadStockValue),
      icon: PackageX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      subtitle: 'No sales in FY',
    },
  ];

  // Chart 1: Margin by Category (horizontal bar, color-coded)
  const marginByCategoryChart = useMemo(() => {
    return categoryMargins.map(c => ({
      category: c.category,
      margin: Math.round(c.margin * 10) / 10,
      fill: c.margin >= 30 ? '#10b981' : c.margin >= 15 ? '#f59e0b' : '#ef4444',
    }));
  }, [categoryMargins]);

  // Chart 2: ABC Analysis (PieChart)
  const abcData = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0 };
    const revenues = { A: 0, B: 0, C: 0 };
    for (const p of productProfitability) {
      counts[p.abcClass]++;
      revenues[p.abcClass] += p.totalRevenue;
    }
    return [
      { name: `A (${counts.A} SKUs)`, value: revenues.A, count: counts.A },
      { name: `B (${counts.B} SKUs)`, value: revenues.B, count: counts.B },
      { name: `C (${counts.C} SKUs)`, value: revenues.C, count: counts.C },
    ];
  }, []);

  const ABC_COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

  // Chart 3: Top 15 Most Profitable Products
  const topProfitProducts = useMemo(() => {
    return [...productProfitability]
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 15)
      .map(p => ({
        name: p.productName.length > 22 ? p.productName.substring(0, 19) + '...' : p.productName,
        profit: p.grossProfit,
        margin: p.marginPercent,
      }));
  }, []);

  // Chart 4: Monthly Margin Trend
  const monthlyMarginTrend = useMemo(() => {
    return revenueByMonth.map(m => ({
      monthLabel: m.monthLabel,
      margin: m.totalRevenue > 0 ? Math.round(m.grossProfit / m.totalRevenue * 1000) / 10 : 0,
      grossProfit: m.grossProfit,
    }));
  }, []);

  // Table: Product profitability (top 30)
  const profitTable = useMemo(() => {
    return [...productProfitability]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 30);
  }, []);

  return (
    <PageLayout
      title="Profitability Analysis"
      subtitle="Margin analysis, ABC classification, and product-level profitability"
      icon={TrendingUp}
      iconColor="text-emerald-600"
    >
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4">
        {/* 1. Margin by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Margin by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginByCategoryChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="margin" name="Gross Margin %" radius={[0, 4, 4, 0]}>
                    {marginByCategoryChart.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. ABC Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ABC Classification (Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={abcData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatINRCompact(value)}`}
                  >
                    {abcData.map((_, i) => (
                      <Cell key={i} fill={ABC_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Top 15 Most Profitable Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 15 Most Profitable Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProfitProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'profit' ? formatINR(value) : `${value}%`
                    }
                  />
                  <Bar dataKey="profit" name="Gross Profit" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. Monthly Margin Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyMarginTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'Margin %' ? `${value}%` : formatINR(value)
                    }
                  />
                  <Legend />
                  <Line type="monotone" dataKey="margin" name="Margin %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Table */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Product Profitability (Top 30 by Revenue)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead>ABC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitTable.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="max-w-[200px] truncate font-medium">{row.productName}</TableCell>
                  <TableCell className="text-xs text-gray-600">{row.category}</TableCell>
                  <TableCell className="text-right">{formatINR(row.totalRevenue)}</TableCell>
                  <TableCell className="text-right text-gray-600">{formatINR(row.totalCost)}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={row.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatINR(row.grossProfit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={
                      row.marginPercent >= 30 ? 'text-green-600 font-semibold' :
                      row.marginPercent >= 15 ? 'text-orange-600 font-medium' :
                      'text-red-600 font-medium'
                    }>
                      {formatPercent(row.marginPercent)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.abcClass === 'A' ? 'default' : 'outline'}
                      className={
                        row.abcClass === 'A' ? 'bg-blue-600' :
                        row.abcClass === 'B' ? 'text-orange-700 border-orange-300' :
                        'text-gray-500 border-gray-300'
                      }
                    >
                      {row.abcClass}
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
