import { useMemo } from 'react';
import { Receipt, IndianRupee, TrendingDown, Calculator } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { KPICardGrid, type KPICardConfig } from '../components/KPICardGrid';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { gstSummaryByMonth, productProfitability } from '../data/computedData';
import { products } from '../data/index';
import { formatINR, formatINRCompact } from '../lib/formatUtils';

export function GSTAnalysis() {
  // KPI calculations
  const totalOutputGST = gstSummaryByMonth.reduce((s, m) => s + m.outputGST, 0);
  const totalInputGST = gstSummaryByMonth.reduce((s, m) => s + m.inputGST, 0);
  const netGSTPayable = gstSummaryByMonth.reduce((s, m) => s + m.netGSTPayable, 0);

  const currentMonth = gstSummaryByMonth[gstSummaryByMonth.length - 1];
  const currentMonthLiability = currentMonth ? currentMonth.netGSTPayable : 0;

  const kpis: KPICardConfig[] = [
    {
      title: 'Total Output GST',
      value: formatINR(totalOutputGST),
      icon: IndianRupee,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: 'GST collected on sales',
    },
    {
      title: 'Total Input GST',
      value: formatINR(totalInputGST),
      icon: TrendingDown,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: 'GST paid on purchases',
    },
    {
      title: 'Net GST Payable',
      value: formatINR(netGSTPayable),
      icon: Calculator,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: 'Output - Input (FY)',
    },
    {
      title: 'Current Month Liability',
      value: formatINR(currentMonthLiability),
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      subtitle: currentMonth?.monthLabel || '',
    },
  ];

  // Chart 1: Monthly GST Summary (grouped bar: Output/Input/Net)
  const monthlyGSTData = gstSummaryByMonth.map(m => ({
    monthLabel: m.monthLabel,
    output: m.outputGST,
    input: m.inputGST,
    net: m.netGSTPayable,
  }));

  // Chart 2: Revenue by GST Slab (PieChart)
  const gstSlabData = useMemo(() => {
    const totalGST5 = gstSummaryByMonth.reduce((s, m) => s + m.gst5, 0);
    const totalGST12 = gstSummaryByMonth.reduce((s, m) => s + m.gst12, 0);
    const totalGST18 = gstSummaryByMonth.reduce((s, m) => s + m.gst18, 0);
    return [
      { name: 'GST 5%', value: totalGST5 },
      { name: 'GST 12%', value: totalGST12 },
      { name: 'GST 18%', value: totalGST18 },
    ];
  }, []);

  const SLAB_COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

  // Chart 3: GST by Category (horizontal bar)
  const gstByCategory = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p]));
    const catGST: Record<string, number> = {};
    for (const p of productProfitability) {
      const product = productMap.get(p.productId);
      if (!product) continue;
      const gstOnRevenue = p.totalRevenue * product.gstRate / (100 + product.gstRate);
      catGST[p.category] = (catGST[p.category] || 0) + gstOnRevenue;
    }
    return Object.entries(catGST)
      .map(([category, gst]) => ({ category, gst: Math.round(gst) }))
      .sort((a, b) => b.gst - a.gst)
      .slice(0, 10);
  }, []);

  // Chart 4: CGST/SGST/IGST breakdown (stacked bar monthly)
  const gstBreakdownData = gstSummaryByMonth.map(m => ({
    monthLabel: m.monthLabel,
    cgst: m.cgst,
    sgst: m.sgst,
    igst: m.igst,
  }));

  // Table: GST register (monthly summary)
  const gstRegister = gstSummaryByMonth.map(m => ({
    month: m.monthLabel,
    outputGST: m.outputGST,
    inputGST: m.inputGST,
    net: m.netGSTPayable,
    cgst: m.cgst,
    sgst: m.sgst,
    igst: m.igst,
    gst5: m.gst5,
    gst12: m.gst12,
    gst18: m.gst18,
  }));

  return (
    <PageLayout
      title="GST & Tax Analysis"
      subtitle="GST computation, slab analysis, and compliance overview"
      icon={Receipt}
      iconColor="text-indigo-600"
    >
      <KPICardGrid cards={kpis} />

      <div className="grid grid-cols-2 gap-4">
        {/* 1. Monthly GST Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly GST Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyGSTData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                  <Bar dataKey="output" name="Output GST" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="input" name="Input GST" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Net Payable" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Revenue by GST Slab */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GST Collection by Slab</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gstSlabData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatINRCompact(value)}`}
                  >
                    {gstSlabData.map((_, i) => (
                      <Cell key={i} fill={SLAB_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. GST by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GST by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gstByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Bar dataKey="gst" name="GST Amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. CGST/SGST/IGST Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CGST / SGST / IGST Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gstBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                  <Bar dataKey="cgst" name="CGST" stackId="gst" fill="#3b82f6" />
                  <Bar dataKey="sgst" name="SGST" stackId="gst" fill="#10b981" />
                  <Bar dataKey="igst" name="IGST" stackId="gst" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GST Register Table */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">GST Register (Monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Output GST</TableHead>
                <TableHead className="text-right">Input GST</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">5% Slab</TableHead>
                <TableHead className="text-right">12% Slab</TableHead>
                <TableHead className="text-right">18% Slab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gstRegister.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right">{formatINR(row.outputGST)}</TableCell>
                  <TableCell className="text-right">{formatINR(row.inputGST)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={row.net >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatINR(row.net)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatINR(row.cgst)}</TableCell>
                  <TableCell className="text-right">{formatINR(row.sgst)}</TableCell>
                  <TableCell className="text-right">{formatINR(row.igst)}</TableCell>
                  <TableCell className="text-right text-gray-600">{formatINR(row.gst5)}</TableCell>
                  <TableCell className="text-right text-gray-600">{formatINR(row.gst12)}</TableCell>
                  <TableCell className="text-right text-gray-600">{formatINR(row.gst18)}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-gray-50 font-bold">
                <TableCell>Total (FY)</TableCell>
                <TableCell className="text-right">{formatINR(totalOutputGST)}</TableCell>
                <TableCell className="text-right">{formatINR(totalInputGST)}</TableCell>
                <TableCell className="text-right text-red-600">{formatINR(netGSTPayable)}</TableCell>
                <TableCell className="text-right">{formatINR(gstSummaryByMonth.reduce((s, m) => s + m.cgst, 0))}</TableCell>
                <TableCell className="text-right">{formatINR(gstSummaryByMonth.reduce((s, m) => s + m.sgst, 0))}</TableCell>
                <TableCell className="text-right">{formatINR(gstSummaryByMonth.reduce((s, m) => s + m.igst, 0))}</TableCell>
                <TableCell className="text-right">{formatINR(gstSummaryByMonth.reduce((s, m) => s + m.gst5, 0))}</TableCell>
                <TableCell className="text-right">{formatINR(gstSummaryByMonth.reduce((s, m) => s + m.gst12, 0))}</TableCell>
                <TableCell className="text-right">{formatINR(gstSummaryByMonth.reduce((s, m) => s + m.gst18, 0))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
