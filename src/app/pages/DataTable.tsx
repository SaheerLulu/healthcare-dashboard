import { useState, useMemo } from 'react';
import { Table as TableIcon, Download, Search } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { stockQuants } from '../data/transactions/stockQuants';
import { products } from '../data/seed/products';
import { locations } from '../data/seed/locations';
import { companies } from '../data/seed/companies';
import { formatINRFull, formatDate, formatNumber } from '../lib/formatUtils';

const productMap = new Map(products.map(p => [p.id, p]));
const locationMap = new Map(locations.map(l => [l.id, l]));
const companyMap = new Map(companies.map(c => [c.id, c]));

function getStockStatus(qty: number, reorderLevel: number, maxStock: number): string {
  if (qty === 0) return 'Out of Stock';
  if (qty < reorderLevel * 0.3) return 'Critical';
  if (qty < reorderLevel) return 'Low';
  if (qty > maxStock) return 'Overstocked';
  return 'Adequate';
}

const STATUS_STYLES: Record<string, string> = {
  'Adequate': 'bg-green-100 text-green-800',
  'Low': 'bg-yellow-100 text-yellow-800',
  'Critical': 'bg-red-100 text-red-800',
  'Out of Stock': 'bg-gray-100 text-gray-800',
  'Overstocked': 'bg-blue-100 text-blue-800',
};

export function DataTable() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('productName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const tableData = useMemo(() => {
    return stockQuants.map(sq => {
      const product = productMap.get(sq.productId);
      const location = locationMap.get(sq.locationId);
      const company = product ? companyMap.get(product.companyId) : null;
      return {
        id: sq.id,
        productName: product?.name || '',
        category: product?.category || '',
        company: company?.shortName || '',
        location: location?.name || '',
        batchNumber: sq.batchNumber,
        expiryDate: sq.expiryDate,
        quantity: sq.quantityOnHand,
        mrp: sq.mrp,
        purchasePrice: sq.purchasePrice,
        stockValue: sq.quantityOnHand * sq.purchasePrice,
        status: product ? getStockStatus(sq.quantityOnHand, product.reorderLevel, product.maxStock) : 'Unknown',
        gstRate: product?.gstRate || 0,
      };
    });
  }, []);

  const filteredData = useMemo(() => {
    let data = tableData;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.productName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.batchNumber.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return data;
  }, [tableData, search, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const exportCSV = () => {
    const headers = ['Product', 'Category', 'Company', 'Location', 'Batch', 'Expiry', 'Qty', 'MRP', 'Purchase Price', 'Stock Value', 'GST%', 'Status'];
    const rows = filteredData.map(r => [
      r.productName, r.category, r.company, r.location, r.batchNumber,
      r.expiryDate, r.quantity, r.mrp, r.purchasePrice, r.stockValue.toFixed(2),
      r.gstRate, r.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-gray-400">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <PageLayout title="Inventory Data Table" subtitle="Full stock inventory with export" icon={TableIcon} iconColor="text-indigo-600">
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search products, categories, batches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{formatNumber(filteredData.length)} records</span>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="size-4 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'productName', label: 'Product' },
                    { key: 'category', label: 'Category' },
                    { key: 'company', label: 'Company' },
                    { key: 'location', label: 'Location' },
                    { key: 'batchNumber', label: 'Batch' },
                    { key: 'expiryDate', label: 'Expiry' },
                    { key: 'quantity', label: 'Qty' },
                    { key: 'mrp', label: 'MRP' },
                    { key: 'purchasePrice', label: 'Purchase' },
                    { key: 'stockValue', label: 'Value' },
                    { key: 'gstRate', label: 'GST' },
                    { key: 'status', label: 'Status' },
                  ].map(col => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}<SortIcon field={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.slice(0, 200).map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium max-w-[200px] truncate">{row.productName}</td>
                    <td className="px-3 py-2 text-gray-600">{row.category}</td>
                    <td className="px-3 py-2 text-gray-600">{row.company}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{row.location}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.batchNumber}</td>
                    <td className="px-3 py-2">{formatDate(row.expiryDate)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(row.quantity)}</td>
                    <td className="px-3 py-2 text-right">{formatINRFull(row.mrp)}</td>
                    <td className="px-3 py-2 text-right">{formatINRFull(row.purchasePrice)}</td>
                    <td className="px-3 py-2 text-right">{formatINRFull(row.stockValue)}</td>
                    <td className="px-3 py-2 text-center">{row.gstRate}%</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className={`text-xs ${STATUS_STYLES[row.status] || ''}`}>
                        {row.status}
                      </Badge>
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
