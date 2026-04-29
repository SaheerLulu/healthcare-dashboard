import React, { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

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
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 card-shadow ${onClick ? 'cursor-pointer card-hover' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--surface-0)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--ink-2)' }}
        >
          {title}
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
