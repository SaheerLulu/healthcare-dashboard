import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useFilters } from '../context/FilterContext';
import { formatINRFull, formatDate, formatNumber } from '../lib/formatUtils';

export function DrillThrough() {
  const navigate = useNavigate();
  const { drillThroughData, chartFilter, setDrillThroughData, setChartFilter } = useFilters();

  const handleBack = () => {
    setDrillThroughData(null);
    setChartFilter({ field: null, value: null });
    navigate(-1);
  };

  const exportCSV = () => {
    if (!drillThroughData) return;
    const headers = drillThroughData.columns.map(c => c.label);
    const rows = drillThroughData.rows.map(row =>
      drillThroughData.columns.map(c => {
        const val = row[c.key];
        return `"${val ?? ''}"`;
      })
    );
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drill-through-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Heuristic: if it looks like currency (> 100 and has decimals or is large)
      if (value > 100 && Number.isFinite(value)) return formatINRFull(value);
      return formatNumber(value);
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    return String(value);
  };

  if (!drillThroughData) {
    return (
      <PageLayout title="Drill-Through" subtitle="Detailed data view" icon={Filter} iconColor="text-violet-600">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Filter className="size-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Drill-Through Data</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Right-click on any chart element across the dashboard pages to drill through to the underlying data.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Drill-Through" subtitle="Detailed data view" icon={Filter} iconColor="text-violet-600">
      {/* Header bar */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-1.5" />
                Back
              </Button>
              <div>
                <h2 className="font-semibold">{drillThroughData.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {chartFilter.field && chartFilter.value && (
                    <Badge variant="secondary" className="text-xs">
                      {chartFilter.field}: {chartFilter.value}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatNumber(drillThroughData.rows.length)} records
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="size-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {drillThroughData.columns.map(col => (
                    <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {drillThroughData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {drillThroughData.columns.map(col => (
                      <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                        {formatCellValue(row[col.key])}
                      </td>
                    ))}
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
