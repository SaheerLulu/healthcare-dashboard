import React, { ReactNode, useState } from 'react';
import { ArrowUp, ArrowDown, Info, X } from 'lucide-react';

interface KPIInfo {
  formula: string;
  source: string;
  notes?: string;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  sparkline?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Provenance — "how is this achieved" popover. */
  info?: KPIInfo;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  sparkline,
  icon,
  onClick,
  className = '',
  info,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);
  // a11y: when the card is clickable it becomes a button (DASH-E00-A06).
  // Keyboard activation via Enter/Space mirrors native button semantics so
  // screen-reader users get the same drill-through P-OWN gets with a click.
  const isInteractive = !!onClick;
  const trendText = trend
    ? `, ${trend.direction === 'up' ? 'up' : 'down'} ${trend.value}`
    : '';
  const ariaLabel = `${title}: ${value}${trendText}${subtitle ? `. ${subtitle}` : ''}${
    isInteractive ? '. Activate to drill into details.' : ''
  }`;

  return (
    <div
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={isInteractive ? 'button' : 'group'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      className={`rounded-xl p-5 card-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-600 ${
        onClick ? 'cursor-pointer card-hover' : ''
      } ${className}`}
      style={{
        backgroundColor: 'var(--surface-0)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1 min-w-0">
          <div
            className="text-xs font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--ink-2)' }}
          >
            {title}
          </div>
          {info && (
            <div className="relative flex-shrink-0">
              <button
                aria-label={`How is ${title} calculated?`}
                title="How is this calculated?"
                onClick={(e) => { e.stopPropagation(); setInfoOpen(o => !o); }}
                onKeyDown={(e) => e.stopPropagation()}
                className="p-0.5 rounded transition-colors"
                style={{ color: 'var(--ink-3)' }}
              >
                <Info className="w-3 h-3" />
              </button>
              {infoOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-72 rounded-lg shadow-xl z-[60] p-3.5 text-xs text-left cursor-default dropdown-animate"
                  style={{ backgroundColor: 'var(--surface-0)', border: '1px solid var(--line)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      How this is calculated
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoOpen(false); }}
                      aria-label="Close info"
                      style={{ color: 'var(--ink-3)' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="mb-1.5 normal-case font-normal tracking-normal" style={{ color: 'var(--ink)' }}>{info.formula}</p>
                  <p className="normal-case font-normal tracking-normal" style={{ color: 'var(--ink-2)' }}>
                    <span className="font-medium">Source:</span> {info.source}
                  </p>
                  {info.notes && (
                    <p className="mt-1.5 pt-1.5 normal-case font-normal tracking-normal" style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>
                      ⚠ {info.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="opacity-70" style={{ color: 'var(--brand)' }}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 mt-1">
        <div
          className="hero-num"
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>

        {/* Suppress the trend badge when the value is empty / 0 / "0%" /
            "0pp" — a "↑ 0%" badge is misleading when there's actually no
            prior-period data to compare against. */}
        {trend && (() => {
          const v = String(trend.value || '').trim();
          const numeric = parseFloat(v.replace(/[^0-9.\-]/g, ''));
          const isZero = !v || v === '0' || v === '0%' || v === '0pp' || v === '0.0%' || v === '0.0pp' || numeric === 0;
          if (isZero) return null;
          return (
            <span
              className="mono text-[11px] font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{
                background: trend.direction === 'up'
                  ? 'rgba(31, 138, 76, 0.12)'
                  : 'rgba(192, 57, 43, 0.10)',
                color: trend.direction === 'up' ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {trend.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {trend.value}
            </span>
          );
        })()}
      </div>

      {subtitle && (
        <div className="text-xs mt-1.5" style={{ color: 'var(--ink-3)' }}>
          {subtitle}
        </div>
      )}

      {sparkline && (
        <div className="h-12 mt-3">
          {sparkline}
        </div>
      )}
    </div>
  );
};
