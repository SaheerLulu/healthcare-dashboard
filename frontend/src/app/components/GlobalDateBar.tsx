import React, { useEffect, useRef } from 'react';
import { CalendarRange } from 'lucide-react';
import { DateRangeSlider } from './DateRangeSlider';
import { useFilters } from '../contexts/FilterContext';
import { useApiData } from '../hooks/useApiData';

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

/** Preset chips. Days are window width; 'FY' and 'All' are special. */
const PRESETS: Array<{ key: string; label: string; days?: number }> = [
  { key: '7D', label: '7D', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 91 },
  { key: '6M', label: '6M', days: 182 },
  { key: 'FY', label: 'FY' },
  { key: 'ALL', label: 'All' },
];

/**
 * The single global date control (replaces the sidebar's Time & Period
 * section). A timeline slicer bounded by the actual data span, defaulting
 * to a rolling month anchored to the freshest data date.
 */
export const GlobalDateBar: React.FC = () => {
  const { filters, updateFilters, anchorDateRange } = useFilters();
  const { data: options } = useApiData<{ date_bounds?: { min: string | null; max: string | null } }>(
    '/executive/filter-options/',
    {},
    { noFilters: true }
  );

  const todayIso = toISO(new Date());
  const dataMin = options.date_bounds?.min || addDays(todayIso, -365);
  const dataMax = options.date_bounds?.max || todayIso;
  // Slider upper bound includes today so users can always select "now".
  const boundMax = dataMax > todayIso ? dataMax : todayIso;

  // One-time anchor: keep the rolling-month default meaningful when the
  // pipeline data ends in the past (otherwise the default window is empty).
  const anchoredRef = useRef(false);
  useEffect(() => {
    if (anchoredRef.current || !options.date_bounds?.max) return;
    anchoredRef.current = true;
    anchorDateRange(options.date_bounds.max);
  }, [options.date_bounds?.max, anchorDateRange]);

  const anchorEnd = dataMax < todayIso ? dataMax : todayIso;

  const applyPreset = (key: string) => {
    if (key === 'ALL') {
      updateFilters({ dateRange: { start: dataMin, end: boundMax }, quickPreset: 'All Data' });
      return;
    }
    if (key === 'FY') {
      const t = new Date(`${anchorEnd}T00:00:00`);
      const fyStart = t.getMonth() >= 3
        ? new Date(t.getFullYear(), 3, 1)
        : new Date(t.getFullYear() - 1, 3, 1);
      updateFilters({ dateRange: { start: toISO(fyStart), end: anchorEnd }, quickPreset: 'This FY' });
      return;
    }
    const preset = PRESETS.find(p => p.key === key);
    if (!preset?.days) return;
    updateFilters({
      dateRange: { start: addDays(anchorEnd, -(preset.days - 1)), end: anchorEnd },
      quickPreset: key === '1M' ? 'Rolling Month' : `Last ${preset.days} Days`,
    });
  };

  const isPresetActive = (key: string): boolean => {
    const { start, end } = filters.dateRange;
    if (key === 'ALL') return start === dataMin && end === boundMax;
    if (key === 'FY') return filters.quickPreset === 'This FY';
    const preset = PRESETS.find(p => p.key === key);
    if (!preset?.days) return false;
    return end === anchorEnd && start === addDays(anchorEnd, -(preset.days - 1));
  };

  const staleData = dataMax < todayIso;

  return (
    <div
      className="flex items-center gap-4 px-6 py-2.5 sticky top-16 z-40"
      style={{
        backgroundColor: 'var(--surface-0)',
        borderBottom: '1px solid var(--line)',
      }}
      data-testid="global-date-bar"
    >
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <CalendarRange className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
          Period
        </span>
      </div>

      <div className="flex-1 min-w-0 max-w-3xl">
        <DateRangeSlider
          min={dataMin}
          max={boundMax}
          start={filters.dateRange.start}
          end={filters.dateRange.end}
          onChange={(start, end) => updateFilters({ dateRange: { start, end } })}
        />
      </div>

      {/* Exact date pickers — same range as the slider, for precise input */}
      <div className="flex items-center gap-1.5 flex-shrink-0" data-testid="date-inputs">
        <input
          type="date"
          aria-label="Start date"
          value={filters.dateRange.start}
          min={dataMin}
          max={filters.dateRange.end}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const start = v < dataMin ? dataMin : v;
            updateFilters({
              dateRange: { start, end: start > filters.dateRange.end ? start : filters.dateRange.end },
            });
          }}
          className="h-7 px-2 rounded-md text-[11px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink-2)', backgroundColor: 'var(--surface-0)' }}
        />
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>→</span>
        <input
          type="date"
          aria-label="End date"
          value={filters.dateRange.end}
          min={filters.dateRange.start}
          max={boundMax}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const end = v > boundMax ? boundMax : v;
            updateFilters({
              dateRange: { start: end < filters.dateRange.start ? end : filters.dateRange.start, end },
            });
          }}
          className="h-7 px-2 rounded-md text-[11px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink-2)', backgroundColor: 'var(--surface-0)' }}
        />
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {PRESETS.map(p => {
          const active = isPresetActive(p.key);
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="rounded-full text-[11px] font-medium px-2.5 py-1 border transition-colors"
              style={
                active
                  ? {
                      background: 'rgba(15, 157, 154, 0.10)',
                      color: 'var(--brand-press)',
                      borderColor: 'rgba(15, 157, 154, 0.35)',
                    }
                  : {
                      background: 'var(--surface-0)',
                      color: 'var(--ink-2)',
                      borderColor: 'var(--line)',
                    }
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {staleData && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(230, 160, 30, 0.12)', color: '#9a6b00' }}
          title={`Latest data: ${dataMax}. Run the pipeline to refresh.`}
        >
          data to {dataMax}
        </span>
      )}
    </div>
  );
};
