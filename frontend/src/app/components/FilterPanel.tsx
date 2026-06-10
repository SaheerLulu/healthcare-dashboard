import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';

interface FilterOptions {
  locations: Array<{ id: string; name: string }>;
  categories: string[];
  channels: string[];
  payment_methods: string[];
}

const sectionHeaderStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
} as const;

const labelStyle = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
} as const;

export const FilterPanel = () => {
  const { filters, updateFilters, resetFilters } = useFilters();
  const { clearAllCrossFilters } = useCrossFilter();
  const { data: options } = useApiData<FilterOptions>(
    '/executive/filter-options/',
    { locations: [], categories: [], channels: [], payment_methods: [] },
    { noFilters: true }
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    location: true,
    product: false,
    transaction: false,
  });

  const toggleSection = (section: string) =>
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const checkbox = (
    checked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    key: string,
  ) => (
    <label
      key={key}
      className="flex items-center gap-2.5 py-1.5 px-2 cursor-pointer rounded-md transition-colors"
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded"
        style={{ accentColor: 'var(--brand)' }}
      />
      <span className="text-xs" style={{ color: 'var(--ink)' }}>{label}</span>
    </label>
  );

  return (
    <div className="px-4 pb-4">
      {/* Date filtering moved to the GlobalDateBar timeline slicer (Layout);
          the sidebar now carries only categorical dimensions. */}

      {/* Location */}
      {options.locations.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggleSection('location')}
            className="flex items-center gap-2 w-full py-2 px-1 rounded-md transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
          >
            {expandedSections.location
              ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
              : <ChevronRight className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />}
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

          {expandedSections.location && (
            <div className="mt-2 px-1 space-y-0.5">
              {options.locations.map(loc => checkbox(
                filters.locations.includes(loc.id),
                (checked) => {
                  const newLocs = checked
                    ? [...filters.locations, loc.id]
                    : filters.locations.filter(l => l !== loc.id);
                  updateFilters({ locations: newLocs });
                },
                loc.name,
                loc.id,
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Category */}
      {options.categories.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggleSection('product')}
            className="flex items-center gap-2 w-full py-2 px-1 rounded-md transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
          >
            {expandedSections.product
              ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
              : <ChevronRight className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />}
            <span style={sectionHeaderStyle}>Product Category</span>
            {filters.productCategories.length > 0 && (
              <span
                className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(15, 157, 154, 0.12)',
                  color: 'var(--brand-press)',
                }}
              >
                {filters.productCategories.length}
              </span>
            )}
          </button>

          {expandedSections.product && (
            <div className="mt-2 px-1 space-y-0.5">
              {options.categories.map(cat => checkbox(
                filters.productCategories.includes(cat),
                (checked) => {
                  const newCats = checked
                    ? [...filters.productCategories, cat]
                    : filters.productCategories.filter(c => c !== cat);
                  updateFilters({ productCategories: newCats });
                },
                cat,
                cat,
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction Dimensions */}
      {(options.channels.length > 0 || options.payment_methods.length > 0) && (
        <div className="mb-4">
          <button
            onClick={() => toggleSection('transaction')}
            className="flex items-center gap-2 w-full py-2 px-1 rounded-md transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
          >
            {expandedSections.transaction
              ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
              : <ChevronRight className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />}
            <span style={sectionHeaderStyle}>Transaction</span>
          </button>

          {expandedSections.transaction && (
            <div className="mt-2 space-y-3 px-1">
              {options.channels.length > 0 && (
                <div>
                  <label className="block mb-2" style={labelStyle}>Sales Channel</label>
                  <div className="space-y-0.5">
                    {options.channels.map(channel => checkbox(
                      filters.salesChannel.includes(channel),
                      (checked) => {
                        const newCh = checked
                          ? [...filters.salesChannel, channel]
                          : filters.salesChannel.filter(c => c !== channel);
                        updateFilters({ salesChannel: newCh });
                      },
                      channel,
                      channel,
                    ))}
                  </div>
                </div>
              )}

              {options.payment_methods.length > 0 && (
                <div>
                  <label className="block mb-2" style={labelStyle}>Payment Method</label>
                  <div className="space-y-0.5">
                    {options.payment_methods.map(method => checkbox(
                      filters.paymentMethod.includes(method),
                      (checked) => {
                        const newM = checked
                          ? [...filters.paymentMethod, method]
                          : filters.paymentMethod.filter(m => m !== method);
                        updateFilters({ paymentMethod: newM });
                      },
                      method,
                      method,
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reset */}
      <div className="mt-5 pt-4 px-1" style={{ borderTop: '1px solid var(--line)' }}>
        <button
          onClick={() => { resetFilters(); clearAllCrossFilters(); }}
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
          Reset All
        </button>
      </div>
    </div>
  );
};
