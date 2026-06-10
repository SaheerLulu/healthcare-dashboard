import React, { useEffect } from 'react';
import { X, Download, ArrowRight } from 'lucide-react';
import { CsvColumn, downloadCsv } from '../utils/csv';

interface DataTableModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  data: any[];
  columns: CsvColumn[];
  /** When set, renders "View underlying records →". */
  onDrillThrough?: () => void;
  /** Optional provenance line shown under the title. */
  caption?: string;
}

/**
 * "Show the data behind this visual": the exact aggregated rows the chart is
 * rendering, exportable as CSV, with a hop to the row-level detail page.
 */
export const DataTableModal: React.FC<DataTableModalProps> = ({
  title,
  open,
  onClose,
  data,
  columns,
  onDrillThrough,
  caption,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const fmt = (col: CsvColumn, row: any) => {
    const v = row?.[col.key];
    if (col.format) return col.format(v, row);
    if (typeof v === 'number') return v.toLocaleString('en-IN');
    return v === null || v === undefined ? '—' : String(v);
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Data behind ${title}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface-0)', border: '1px solid var(--line)' }}
      >
        <div
          className="flex items-start justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Data behind: {title}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {caption || `${data.length} rows currently feeding this visual`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={() => downloadCsv(title.toLowerCase().replace(/\s+/g, '-'), columns, data)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50"
              style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {onDrillThrough && (
              <button
                onClick={() => { onClose(); onDrillThrough(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                View underlying records
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-md transition-colors hover:bg-gray-100"
              style={{ color: 'var(--ink-3)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--surface-1)' }}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="text-left py-2.5 px-4 text-xs font-semibold whitespace-nowrap"
                    style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                    No data in the current filter window
                  </td>
                </tr>
              )}
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="py-2 px-4 whitespace-nowrap"
                      style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}
                    >
                      {fmt(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
