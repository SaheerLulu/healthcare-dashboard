import React, { ReactNode, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Maximize2, Download, MoreVertical, Table2, Focus } from 'lucide-react';
import { ChartInfoPopover } from './ChartInfoPopover';
import { ChartFocusModal } from './ChartFocusModal';
import { downloadCSV, downloadPNG, fileStem, ChartColumn } from '../utils/chartExport';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;

  // Drill-through / show-table target. If both are set, the Show Data Table
  // button navigates to drillTarget with drillContext in router state.
  drillTarget?: string;
  drillContext?: {
    from?: string;
    fromPath?: string;
    filters?: any[];
  };

  // Info popover content. If omitted, the info icon is hidden.
  infoTitle?: string;
  infoText?: string;

  // Data backing the chart, used by Download → CSV.
  data?: any[];
  columns?: ChartColumn[];
}

const ActionButton = ({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className = '',
  drillTarget,
  drillContext,
  infoTitle,
  infoText,
  data,
  columns,
}) => {
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const navigateToDetail = () => {
    if (!drillTarget) return;
    navigate(drillTarget, {
      state: { drillThrough: drillContext },
    });
  };

  const stem = fileStem(title);

  const handleDownloadPNG = async () => {
    setDownloadMenuOpen(false);
    await downloadPNG(chartRef.current, stem);
  };

  const handleDownloadCSV = () => {
    setDownloadMenuOpen(false);
    if (!data || !data.length) return;
    const cols = columns || inferColumns(data);
    downloadCSV(data, cols, stem);
  };

  return (
    <div
      className={`rounded-xl p-5 card-shadow relative ${className}`}
      style={{
        backgroundColor: 'var(--surface-0)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
          {title}
        </h3>

        <div className="flex items-center gap-0.5">
          {infoText && <ChartInfoPopover title={infoTitle || title} text={infoText} />}
          <ActionButton title="Focus" onClick={() => setFocusOpen(true)}>
            <Focus className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            title={drillTarget ? 'Show Data Table' : 'No detail page configured'}
            onClick={navigateToDetail}
            disabled={!drillTarget}
          >
            <Table2 className="w-4 h-4" />
          </ActionButton>
          <ActionButton title="Full Screen" onClick={() => setFullOpen(true)}>
            <Maximize2 className="w-4 h-4" />
          </ActionButton>
          <div className="relative">
            <ActionButton title="Download" onClick={() => setDownloadMenuOpen((v) => !v)}>
              <Download className="w-4 h-4" />
            </ActionButton>
            {downloadMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDownloadMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                  <button
                    onClick={handleDownloadPNG}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    disabled={!data || !data.length}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Download CSV
                  </button>
                </div>
              </>
            )}
          </div>
          <ActionButton title="More Options">
            <MoreVertical className="w-4 h-4" />
          </ActionButton>
        </div>
      </div>

      <div className="chart-content" ref={chartRef}>
        {children}
      </div>

      <ChartFocusModal open={focusOpen} title={title} onClose={() => setFocusOpen(false)}>
        <div className="w-full h-full">{children}</div>
      </ChartFocusModal>
      <ChartFocusModal
        open={fullOpen}
        title={title}
        fullScreen
        onClose={() => setFullOpen(false)}
      >
        <div className="w-full h-full">{children}</div>
      </ChartFocusModal>
    </div>
  );
};

const inferColumns = (rows: any[]): ChartColumn[] => {
  if (!rows.length) return [];
  const sample = rows[0];
  return Object.keys(sample)
    .filter((k) => k !== 'fill' && k !== 'payload' && !k.startsWith('_'))
    .map((k) => ({
      key: k,
      label: k,
      format: typeof sample[k] === 'number' ? ('number' as const) : ('text' as const),
    }));
};
