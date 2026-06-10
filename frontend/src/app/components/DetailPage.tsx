import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, X, Download } from 'lucide-react';
import { useDetailQuery } from '../hooks/useDetailQuery';
import { useFilters } from '../contexts/FilterContext';
import { CsvColumn } from '../utils/csv';

export interface DetailColumn extends CsvColumn {
  /** Right-align + total row when set. */
  numeric?: boolean;
  /** Server ordering column; omit to disable sorting on this column. */
  sortKey?: string;
  /** Sum this column into the footer total row. */
  total?: boolean;
  /** Custom cell renderer (badges etc.); falls back to format/raw. */
  render?: (value: any, row: any) => ReactNode;
}

interface DetailPageProps {
  title: string;
  endpoint: string;
  columns: DetailColumn[];
  defaultOrdering: string;
  /** Optional description under the title. */
  subtitle?: string;
}

/**
 * Shared drill-through target page: functional context chips (removable,
 * URL-backed), real server pagination + sorting, working CSV export, and an
 * honest global-filter summary.
 */
export const DetailPage: React.FC<DetailPageProps> = ({
  title,
  endpoint,
  columns,
  defaultOrdering,
  subtitle,
}) => {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const q = useDetailQuery(endpoint, defaultOrdering);

  const fmt = (col: DetailColumn, row: any): ReactNode => {
    const v = row?.[col.key];
    if (col.render) return col.render(v, row);
    if (col.format) return col.format(v, row);
    if (typeof v === 'number') return v.toLocaleString('en-IN');
    return v === null || v === undefined || v === '' ? '—' : String(v);
  };

  const sortIndicator = (col: DetailColumn) => {
    if (!col.sortKey) return null;
    if (q.ordering === col.sortKey) return ' ↑';
    if (q.ordering === `-${col.sortKey}`) return ' ↓';
    return null;
  };

  const totals: Record<string, number> = {};
  for (const col of columns) {
    if (col.total) {
      totals[col.key] = q.rows.reduce((sum, r) => sum + (Number(r?.[col.key]) || 0), 0);
    }
  }
  const hasTotals = Object.keys(totals).length > 0;

  const globalSummary = [
    `${filters.dateRange.start} → ${filters.dateRange.end}`,
    filters.locations.length ? `${filters.locations.length} location(s)` : 'All locations',
    ...(filters.productCategories.length ? [`Categories: ${filters.productCategories.join(', ')}`] : []),
    ...(filters.salesChannel.length ? [`Channel: ${filters.salesChannel.join(', ')}`] : []),
  ].join(' | ');

  return (
    <div>
      {/* Drill-Through Context Bar */}
      {q.drill && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {q.drill.from}
          </button>

          {q.drill.filters.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-teal-900 uppercase tracking-wide mb-2">
                Drill-Through Context (applied to the rows below):
              </div>
              <div className="flex flex-wrap gap-2">
                {q.drill.filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="inline-flex items-center gap-2 bg-teal-600 text-white px-3 py-1 rounded-md text-sm"
                  >
                    <span>{filter.label}</span>
                    <button
                      onClick={() => q.removeDrillFilter(filter.id)}
                      aria-label={`Remove filter ${filter.label}`}
                      className="hover:bg-teal-700 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-teal-700 mb-3">
            <span className="font-medium">Global Filters:</span> {globalSummary}
          </div>

          {q.drill.filters.length > 0 && (
            <button
              onClick={q.clearDrillFilters}
              className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50"
            >
              Remove All Drill-Through Filters
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {q.loading ? 'Loading…' : `${q.count.toLocaleString('en-IN')} records`}
            {subtitle ? ` | ${subtitle}` : ''}
            {!q.drill && ` | ${globalSummary}`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => q.exportCsv(title.toLowerCase().replace(/\s+/g, '-'), columns)}
            title={q.exportCapped ? 'Exports the first 500 rows of the current query' : 'Export the current query as CSV'}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export CSV{q.exportCapped ? ' (first 500)' : ''}
          </button>
        </div>
      </div>

      {q.error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {q.error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={col.sortKey ? () => q.setOrdering(col.sortKey!) : undefined}
                    className={`py-3 px-4 font-semibold text-gray-700 whitespace-nowrap ${
                      col.numeric ? 'text-right' : 'text-left'
                    } ${col.sortKey ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  >
                    {col.label}{sortIndicator(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!q.loading && q.rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-sm text-gray-400">
                    No records match the current filters
                  </td>
                </tr>
              )}
              {q.rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-gray-900 whitespace-nowrap ${col.numeric ? 'text-right' : ''}`}
                    >
                      {fmt(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {hasTotals && q.rows.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 font-bold text-gray-900 ${col.numeric ? 'text-right' : ''}`}
                    >
                      {i === 0
                        ? 'PAGE TOTAL'
                        : col.total
                          ? (col.format ? col.format(totals[col.key]) : totals[col.key].toLocaleString('en-IN'))
                          : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {q.count > 0
            ? `Showing ${(q.page - 1) * 50 + 1} to ${Math.min(q.page * 50, q.count)} of ${q.count.toLocaleString('en-IN')} entries`
            : 'No entries'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => q.setPage(q.page - 1)}
            disabled={q.page <= 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 border border-teal-600 rounded">
            {q.page} / {q.pageCount}
          </span>
          <button
            onClick={() => q.setPage(q.page + 1)}
            disabled={q.page >= q.pageCount}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
