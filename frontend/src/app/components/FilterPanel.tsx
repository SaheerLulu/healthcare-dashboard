import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';

interface FilterOptions {
  locations: Array<{ id: string; name: string }>;
}

const sectionHeaderStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
} as const;

export const FilterPanel = () => {
  const { filters, updateFilters, resetFilters } = useFilters();
  const { clearAllCrossFilters } = useCrossFilter();
  const { data: options } = useApiData<FilterOptions>(
    '/executive/filter-options/',
    { locations: [] },
    { noFilters: true },
  );
  const [locationOpen, setLocationOpen] = useState(true);

  const checkbox = (
    checked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    key: string,
  ) => (
    <label
      key={key}
      className="flex items-center gap-2.5 py-1.5 px-2 cursor-pointer rounded-md transition-colors"
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded"
        style={{ accentColor: 'var(--brand)' }}
      />
      <span className="text-xs" style={{ color: 'var(--ink)' }}>
        {label}
      </span>
    </label>
  );

  return (
    <div className="px-4 pb-4">
      <p
        className="px-1 py-3 text-[11px]"
        style={{ color: 'var(--ink-3)' }}
      >
        Date range and quick periods are at the top of every page. The sidebar holds the only other shared filter — location. Page-specific filters live on each page.
      </p>

      {options.locations.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setLocationOpen((v) => !v)}
            className="flex items-center gap-2 w-full py-2 px-1 rounded-md transition-colors"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
          >
            {locationOpen ? (
              <ChevronDown className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
            ) : (
              <ChevronRight className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
            )}
            <span style={sectionHeaderStyle}>Location</span>
            {filters.locations.length > 0 && (
              <span
                className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(15, 157, 154, 0.12)',
                  color: 'var(--brand-press)',
                }}
              >
                {filters.locations.length}
              </span>
            )}
          </button>

          {locationOpen && (
            <div className="mt-2 px-1 space-y-0.5">
              {options.locations.map((loc) =>
                checkbox(
                  filters.locations.includes(loc.id),
                  (checked) => {
                    const newLocs = checked
                      ? [...filters.locations, loc.id]
                      : filters.locations.filter((l) => l !== loc.id);
                    updateFilters({ locations: newLocs });
                  },
                  loc.name,
                  loc.id,
                ),
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 pt-4 px-1" style={{ borderTop: '1px solid var(--line)' }}>
        <button
          onClick={() => {
            resetFilters();
            clearAllCrossFilters();
          }}
          className="w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors"
          style={{
            color: 'var(--ink)',
            backgroundColor: 'var(--surface-0)',
            borderColor: 'var(--line)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)';
            e.currentTarget.style.borderColor = 'var(--ink-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-0)';
            e.currentTarget.style.borderColor = 'var(--line)';
          }}
        >
          Reset Location & Date
        </button>
      </div>
    </div>
  );
};
