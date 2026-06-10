import React, { ReactNode, useState, MouseEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Maximize2, Download, Table2, Info, ArrowUpRight, X } from 'lucide-react';
import { DataTableModal } from './DataTableModal';
import { ContextMenu } from './ContextMenu';
import { useDrillSource } from '../contexts/DrillSourceContext';
import { DrillFilter, buildDrillSearch } from '../utils/drill';
import { CsvColumn, downloadCsv, inferColumns } from '../utils/csv';

export interface ChartInfo {
  /** How the number/series is computed, in plain words. */
  formula: string;
  /** Which facts feed it (e.g. 'report_sales — POS + B2B order lines'). */
  source: string;
  /** Honesty notes: estimates, models, snapshot-only behavior. */
  notes?: string;
}

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** The exact rows the chart is currently rendering (data-behind table). */
  data?: any[];
  /** Table/CSV columns; inferred from data keys when omitted. */
  columns?: CsvColumn[];
  /** Row-level detail route; enables right-click menu + drill actions. */
  drillTarget?: string;
  /** Drill context filters — static, or a fn evaluated at click time (so
   *  pages can include the hovered datum / active cross-filters). */
  drillFilters?: DrillFilter[] | (() => DrillFilter[]);
  /** Provenance — "how is this achieved". */
  info?: ChartInfo;
  /** Legacy/explicit drill handler; preferred over drillTarget when set. */
  onDrillThrough?: () => void;
}

const ActionButton = ({ title, onClick, children }: { title: string; onClick?: () => void; children: ReactNode }) => (
  <button
    title={title}
    aria-label={title}
    onClick={onClick}
    className="p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
    style={{ color: 'var(--ink-3)' }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)';
      e.currentTarget.style.color = 'var(--ink-2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '';
      e.currentTarget.style.color = 'var(--ink-3)';
    }}
  >
    {children}
  </button>
);

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className = '',
  data,
  columns,
  drillTarget,
  drillFilters,
  info,
  onDrillThrough,
}) => {
  const navigate = useNavigate();
  const from = useDrillSource();
  const [tableOpen, setTableOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const resolveFilters = (): DrillFilter[] =>
    typeof drillFilters === 'function' ? drillFilters() : (drillFilters || []);

  const cols: CsvColumn[] = columns || inferColumns(data || []);
  const hasTable = !!data && cols.length > 0;
  const canDrill = !!drillTarget || !!onDrillThrough;

  const doDrill = () => {
    if (onDrillThrough) {
      onDrillThrough();
      return;
    }
    if (drillTarget) {
      const filters = resolveFilters();
      navigate(drillTarget + buildDrillSearch(filters, from), {
        state: { drillThrough: { from, filters } },
      });
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    if (!drillTarget) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!fullscreen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [fullscreen]);

  // a11y (DASH-E00-A06): the chart card is a labelled region so
  // screen-reader users hear the title before the chart contents
  // (recharts SVGs do not announce themselves otherwise).
  return (
    <section
      role="region"
      aria-label={title}
      className={`rounded-xl p-5 card-shadow ${className}`}
      style={{
        backgroundColor: 'var(--surface-0)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-sm font-semibold tracking-tight truncate" style={{ color: 'var(--ink)' }}>
            {title}
          </h3>
          {info && (
            <div className="relative flex-shrink-0">
              <ActionButton title="How is this calculated?" onClick={() => setInfoOpen(o => !o)}>
                <Info className="w-3.5 h-3.5" />
              </ActionButton>
              {infoOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-80 rounded-lg shadow-xl z-[60] p-4 text-xs dropdown-animate"
                  style={{ backgroundColor: 'var(--surface-0)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      How this is calculated
                    </span>
                    <button onClick={() => setInfoOpen(false)} aria-label="Close info" style={{ color: 'var(--ink-3)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="mb-2" style={{ color: 'var(--ink)' }}>{info.formula}</p>
                  <p className="mb-0" style={{ color: 'var(--ink-2)' }}>
                    <span className="font-medium">Source:</span> {info.source}
                  </p>
                  {info.notes && (
                    <p className="mt-2 pt-2" style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>
                      ⚠ {info.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5" role="toolbar" aria-label={`${title} actions`}>
          {hasTable && (
            <ActionButton title="Show Data Table" onClick={() => setTableOpen(true)}>
              <Table2 className="w-4 h-4" />
            </ActionButton>
          )}
          {hasTable && (
            <ActionButton
              title="Download CSV"
              onClick={() => downloadCsv(title.toLowerCase().replace(/\s+/g, '-'), cols, data || [])}
            >
              <Download className="w-4 h-4" />
            </ActionButton>
          )}
          <ActionButton title="Full Screen" onClick={() => setFullscreen(true)}>
            <Maximize2 className="w-4 h-4" />
          </ActionButton>
          {canDrill && (
            <ActionButton title="Drill through to records" onClick={doDrill}>
              <ArrowUpRight className="w-4 h-4" />
            </ActionButton>
          )}
        </div>
      </div>

      <div
        className={`chart-content ${drillTarget ? 'cursor-context-menu' : ''}`}
        onContextMenu={handleContextMenu}
      >
        {children}
      </div>

      {hasTable && (
        <DataTableModal
          title={title}
          open={tableOpen}
          onClose={() => setTableOpen(false)}
          data={data || []}
          columns={cols}
          onDrillThrough={canDrill ? doDrill : undefined}
          caption={info ? `${info.formula} — ${info.source}` : undefined}
        />
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-8" role="dialog" aria-modal="true" aria-label={`${title} full screen`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setFullscreen(false)} />
          <div
            className="relative w-full max-w-6xl rounded-xl shadow-2xl p-6"
            style={{ backgroundColor: 'var(--surface-0)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{title}</h3>
              <button
                onClick={() => setFullscreen(false)}
                aria-label="Exit full screen"
                className="p-1.5 rounded-md hover:bg-gray-100"
                style={{ color: 'var(--ink-3)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[65vh] overflow-auto">
              {children}
            </div>
          </div>
        </div>
      )}

      {contextMenu && drillTarget && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          drillThroughTarget={drillTarget}
          drillThroughContext={{ from, filters: resolveFilters() }}
          data={data}
          onShowDataTable={hasTable ? () => setTableOpen(true) : undefined}
        />
      )}
    </section>
  );
};
