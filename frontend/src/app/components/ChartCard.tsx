import React, { ReactNode } from 'react';
import { Maximize2, Download, MoreVertical, Table2, Focus } from 'lucide-react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  onDrillThrough?: () => void;
  className?: string;
}

const ActionButton = ({ title, children }: { title: string; children: ReactNode }) => (
  <button
    title={title}
    className="p-1.5 rounded-md transition-colors"
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
}) => {
  return (
    <div
      className={`rounded-xl p-5 card-shadow ${className}`}
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
          <ActionButton title="Focus Mode"><Focus className="w-4 h-4" /></ActionButton>
          <ActionButton title="Show Data Table"><Table2 className="w-4 h-4" /></ActionButton>
          <ActionButton title="Full Screen"><Maximize2 className="w-4 h-4" /></ActionButton>
          <ActionButton title="Download"><Download className="w-4 h-4" /></ActionButton>
          <ActionButton title="More Options"><MoreVertical className="w-4 h-4" /></ActionButton>
        </div>
      </div>

      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};
