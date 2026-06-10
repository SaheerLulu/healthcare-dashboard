import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, X, Download, Columns3, Check } from 'lucide-react';
import { useDetailQuery } from '../hooks/useDetailQuery';
import { useFilters } from '../contexts/FilterContext';
import { CsvColumn, downloadCsv } from '../utils/csv';

/** Rendering this many DOM rows stays responsive; beyond it we ask the
 *  user to refine the filter rather than freeze the tab. */
const FILTER_RENDER_CAP = 5000;

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

  // Column visibility, persisted per detail page. Stored as the list of
  // hidden keys so newly added columns default to visible.
  const storageKey = `detail-hidden-cols:${endpoint}`;
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  });
  const toggleColumn = (key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (columns.length - next.size > 1) next.add(key); // keep ≥1 visible
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch { /* storage full/blocked — selection just won't persist */ }
      return next;
    });
  };
  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenKeys.has(c.key)),
    [columns, hiddenKeys],
  );

  // Per-column text filters. While any filter is active the table works on
  // the FULL result set (fetched once per query, all pages) and shows every
  // match without pagination.
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const activeFilters = Object.entries(colFilters).filter(([, v]) => v.trim() !== '');
  const filtering = activeFilters.length > 0;

  const [allRows, setAllRows] = useState<any[] | null>(null);
  const allRowsKeyRef = useRef('');
  const [allLoading, setAllLoading] = useState(false);
  useEffect(() => {
    if (!filtering) return;
    if (allRowsKeyRef.current === q.queryKey && allRows) return;
    let cancelled = false;
    setAllLoading(true);
    q.fetchAll()
      .then(rows => {
        if (cancelled) return;
        allRowsKeyRef.current = q.queryKey;
        setAllRows(rows);
      })
      .catch(() => { /* surfaced via the page-level error from the main query */ })
      .finally(() => { if (!cancelled) setAllLoading(false); });
    return () => { cancelled = true; };
  }, [filtering, q.queryKey]);

  const matchRow = (row: any) =>
    activeFilters.every(([key, needle]) => {
      const col = columns.find(c => c.key === key);
      const raw = row?.[key];
      const formatted = col?.format ? String(col.format(raw, row) ?? '') : '';
      return `${raw ?? ''} ${formatted}`.toLowerCase().includes(needle.trim().toLowerCase());
    });

  const filteredRows = filtering ? (allRows || []).filter(matchRow) : null;
  const displayRows = filteredRows ? filteredRows.slice(0, FILTER_RENDER_CAP) : q.rows;
  const busy = q.loading || (filtering && allLoading);

  // Columns dropdown open/close (outside click + Escape).
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!colMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [colMenuOpen]);

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
  for (const col of visibleColumns) {
    if (col.total) {
      totals[col.key] = (filteredRows ?? q.rows).reduce((sum, r) => sum + (Number(r?.[col.key]) || 0), 0);
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
            {busy
              ? 'Loading…'
              : filtering
                ? `${(filteredRows || []).length.toLocaleString('en-IN')} of ${(allRows || []).length.toLocaleString('en-IN')} records match the column filters`
                : `${q.count.toLocaleString('en-IN')} records`}
            {subtitle ? ` | ${subtitle}` : ''}
            {!q.drill && ` | ${globalSummary}`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setColMenuOpen(o => !o)}
              title="Choose which columns are shown"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              <Columns3 className="w-4 h-4 inline mr-2" />
              Columns
              {hiddenKeys.size > 0 && (
                <span className="ml-1.5 text-xs text-teal-700 font-semibold">
                  {visibleColumns.length}/{columns.length}
                </span>
              )}
            </button>
            {colMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-56 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                role="menu"
                aria-label="Toggle table columns"
              >
                {columns.map(col => {
                  const visible = !hiddenKeys.has(col.key);
                  const lastVisible = visible && visibleColumns.length === 1;
                  return (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      disabled={lastVisible}
                      title={lastVisible ? 'At least one column must stay visible' : undefined}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      role="menuitemcheckbox"
                      aria-checked={visible}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          visible ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        {visible && <Check className="w-3 h-3" />}
                      </span>
                      <span className="truncate">{col.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              const name = title.toLowerCase().replace(/\s+/g, '-');
              if (filtering) {
                const rows = allRows ?? (await q.fetchAll());
                downloadCsv(name, visibleColumns, rows.filter(matchRow));
              } else {
                await q.exportCsv(name, visibleColumns);
              }
            }}
            title="Export every row of the current query (column filters applied)"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {q.error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {q.error}
        </div>
      )}

      {/* Data Table — min-w-max keeps wide tables at natural width so the
          wrapper scrolls horizontally instead of squeezing columns. */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {visibleColumns.map(col => (
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
              {/* Per-column filter row */}
              <tr className="bg-white border-b border-gray-200">
                {visibleColumns.map(col => (
                  <th key={col.key} className="px-2 py-1.5 font-normal">
                    <input
                      type="text"
                      value={colFilters[col.key] || ''}
                      onChange={e => setColFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                      placeholder="Filter…"
                      aria-label={`Filter ${col.label}`}
                      className="w-full min-w-[90px] px-2 py-1 text-xs font-normal text-gray-700 border border-gray-200 rounded outline-none focus:border-teal-500"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!busy && displayRows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-10 text-center text-sm text-gray-400">
                    No records match the current filters
                  </td>
                </tr>
              )}
              {displayRows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {visibleColumns.map(col => (
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
            {hasTotals && displayRows.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  {visibleColumns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 font-bold text-gray-900 ${col.numeric ? 'text-right' : ''}`}
                    >
                      {i === 0
                        ? (filtering ? 'FILTERED TOTAL' : 'PAGE TOTAL')
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

      {/* Pagination — hidden while column filters are active: the filtered
          view shows every match in one scroll. */}
      {filtering ? (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            {allLoading
              ? 'Loading all records for filtering…'
              : (filteredRows || []).length > FILTER_RENDER_CAP
                ? `Showing first ${FILTER_RENDER_CAP.toLocaleString('en-IN')} of ${(filteredRows || []).length.toLocaleString('en-IN')} matches — refine the filter to narrow down (CSV export includes all matches)`
                : `${(filteredRows || []).length.toLocaleString('en-IN')} matching record(s), unpaginated`}
          </div>
          <button
            onClick={() => setColFilters({})}
            className="px-3 py-1.5 text-sm font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50"
          >
            Clear column filters
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
};
