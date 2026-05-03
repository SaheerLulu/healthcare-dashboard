import { useFilters } from '../contexts/FilterContext';

const QUICK_PRESETS = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days',
  'This Month',
  'Last Month',
  'This Quarter',
  'This FY',
  'Last 6 Months',
];

export const DateRangeBar = () => {
  const { filters, updateFilters } = useFilters();

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-6 py-3 border-b"
      style={{
        backgroundColor: 'var(--surface-0)',
        borderColor: 'var(--line)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--ink-3)' }}
        >
          Period
        </span>
        <div className="flex flex-wrap gap-1">
          {QUICK_PRESETS.map((preset) => {
            const active = filters.quickPreset === preset;
            return (
              <button
                key={preset}
                onClick={() => updateFilters({ quickPreset: preset })}
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
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--ink-3)' }}
        >
          Range
        </span>
        <input
          type="date"
          value={filters.dateRange.start}
          onChange={(e) =>
            updateFilters({ dateRange: { ...filters.dateRange, start: e.target.value } })
          }
          className="text-xs h-8 px-2 rounded-md border"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        />
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
          —
        </span>
        <input
          type="date"
          value={filters.dateRange.end}
          onChange={(e) =>
            updateFilters({ dateRange: { ...filters.dateRange, end: e.target.value } })
          }
          className="text-xs h-8 px-2 rounded-md border"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        />
        <select
          value={filters.financialYear}
          onChange={(e) => updateFilters({ financialYear: e.target.value })}
          className="text-xs h-8 px-2 rounded-md border"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        >
          <option>FY 2025-26</option>
          <option>FY 2024-25</option>
          <option>FY 2023-24</option>
        </select>
      </div>
    </div>
  );
};
