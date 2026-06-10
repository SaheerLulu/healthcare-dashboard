import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router';
import { Filter, ChevronDown, ChevronRight, ChevronLeft, X, Layers } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useFilters } from '../contexts/FilterContext';
import { useApiData } from '../hooks/useApiData';

/**
 * Page-specific filters (docs/DRILLTHROUGH_DESIGN.md §1).
 *
 * `dim` is the backend query param; `optionsKey` selects the data-driven
 * option list from /executive/filter-options/ (so the sidebar never offers
 * a value that matches zero rows). Entity dims use {id, name} options and
 * send the id.
 */
interface PageFilterDef {
  dim: string;
  label: string;
  optionsKey: string;
  entity?: boolean;
}

const PAGE_FILTERS: Record<string, PageFilterDef[]> = {
  '/sales': [
    { dim: 'customer_type', label: 'Customer Type', optionsKey: 'customer_types' },
    { dim: 'doctor_id', label: 'Doctor', optionsKey: 'doctors', entity: true },
    { dim: 'company', label: 'Manufacturer', optionsKey: 'companies' },
    { dim: 'reason', label: 'Return Reason', optionsKey: 'return_reasons' },
  ],
  '/financial': [
    { dim: 'account_type', label: 'Account Type', optionsKey: 'account_types' },
    { dim: 'account_subtype', label: 'Account Subtype', optionsKey: 'account_subtypes' },
    { dim: 'voucher_type', label: 'Voucher Type', optionsKey: 'voucher_types' },
    { dim: 'party_type', label: 'Party Type', optionsKey: 'party_types' },
  ],
  '/inventory': [
    { dim: 'expiry_status', label: 'Expiry Status', optionsKey: 'expiry_statuses' },
    { dim: 'movement_status', label: 'Movement', optionsKey: 'movement_statuses' },
    { dim: 'abc_class', label: 'ABC Class', optionsKey: 'abc_classes' },
    { dim: 'ved_class', label: 'VED Class', optionsKey: 'ved_classes' },
  ],
  '/procurement': [
    { dim: 'supplier_id', label: 'Supplier', optionsKey: 'suppliers', entity: true },
    { dim: 'state', label: 'PO Status', optionsKey: 'po_states' },
  ],
  '/gst': [
    { dim: 'gst_rate', label: 'GST Rate', optionsKey: 'gst_rates' },
    { dim: 'invoice_type', label: 'Invoice Type', optionsKey: 'invoice_types' },
    { dim: 'filing_status', label: 'Filing Status', optionsKey: 'filing_statuses' },
  ],
  '/tds': [
    { dim: 'section', label: 'Section', optionsKey: 'tds_sections' },
    { dim: 'status', label: 'Status', optionsKey: 'tds_statuses' },
  ],
  // NOTE: no '/working-capital' entry — its metrics are party-specific by
  // definition (receivables are always Customer, payables always Supplier),
  // so a party_type filter there would be decorative.
  '/product': [
    { dim: 'company', label: 'Manufacturer', optionsKey: 'companies' },
  ],
  '/loyalty': [
    { dim: 'customer_type', label: 'Tier', optionsKey: 'customer_types' },
  ],
  '/detail/sales': [
    { dim: 'customer_type', label: 'Customer Type', optionsKey: 'customer_types' },
    { dim: 'doctor_id', label: 'Doctor', optionsKey: 'doctors', entity: true },
  ],
  '/detail/purchase': [
    { dim: 'supplier_id', label: 'Supplier', optionsKey: 'suppliers', entity: true },
    { dim: 'state', label: 'PO Status', optionsKey: 'po_states' },
  ],
  '/detail/inventory': [
    { dim: 'expiry_status', label: 'Expiry Status', optionsKey: 'expiry_statuses' },
    { dim: 'movement_status', label: 'Movement', optionsKey: 'movement_statuses' },
  ],
  '/detail/financial': [
    { dim: 'account_type', label: 'Account Type', optionsKey: 'account_types' },
    { dim: 'voucher_type', label: 'Voucher Type', optionsKey: 'voucher_types' },
  ],
  '/detail/gst': [
    { dim: 'source_table', label: 'GST Register', optionsKey: 'gst_source_tables' },
    { dim: 'gst_rate', label: 'GST Rate', optionsKey: 'gst_rates' },
  ],
  '/detail/sales-returns': [
    { dim: 'reason', label: 'Return Reason', optionsKey: 'return_reasons' },
    { dim: 'return_type', label: 'Return Type', optionsKey: 'return_types' },
  ],
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
};

type Option = { value: string; label: string };

const PageFilterSection = ({ def, options, selected, onChange }: {
  def: PageFilterDef;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => {
  const [open, setOpen] = useState(selected.length > 0);

  if (!options.length) return null;

  const toggle = (value: string, checked: boolean) => {
    onChange(checked ? [...selected, value] : selected.filter(v => v !== value));
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full py-1.5 px-1 rounded-md transition-colors"
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
      >
        {open
          ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
          : <ChevronRight className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />}
        <span style={{ ...eyebrowStyle, fontSize: 10 }}>{def.label}</span>
        {selected.length > 0 && (
          <span
            className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(15, 157, 154, 0.12)', color: 'var(--brand-press)' }}
          >
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1 px-1 space-y-0.5 max-h-56 overflow-y-auto">
          {options.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 py-1.5 px-2 cursor-pointer rounded-md transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={(e) => toggle(opt.value, e.target.checked)}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: 'var(--brand)' }}
              />
              <span className="text-xs truncate" style={{ color: 'var(--ink)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const FilterSidebar = ({ isOpen, onToggle }: FilterSidebarProps) => {
  const location = useLocation();
  const [isGlobalOpen, setIsGlobalOpen] = useState(true);
  const [isPageOpen, setIsPageOpen] = useState(true);
  const { activeFilters, removeCrossFilter, clearAllCrossFilters } = useCrossFilter();
  const { pageFilters, setPageFilter, clearPageFilters } = useFilters();

  // noFilters: option lists must not shrink to the current selection.
  const { data: filterOptions } = useApiData<Record<string, any>>(
    '/executive/filter-options/',
    {},
    { noFilters: true }
  );

  const route = location.pathname;
  const defs = PAGE_FILTERS[route] || [];
  const routeFilters = pageFilters[route] || {};
  const activePageFilterCount = Object.values(routeFilters).reduce((n, v) => n + (v.length ? 1 : 0), 0);

  const optionsFor = (def: PageFilterDef): Option[] => {
    // GST registers are a fixed source enum (not exposed by filter-options).
    if (def.optionsKey === 'gst_source_tables') {
      return ['gstr1', 'gstr3b', 'gstr2b', 'itc', 'rcm'].map(v => ({ value: v, label: v.toUpperCase() }));
    }
    const raw = filterOptions[def.optionsKey];
    if (!Array.isArray(raw)) return [];
    if (def.entity) {
      return raw
        .filter((o: any) => o && o.id !== undefined && o.id !== null)
        .map((o: any) => ({ value: String(o.id), label: o.name || `#${o.id}` }));
    }
    return raw.map((v: any) => ({ value: String(v), label: String(v) }));
  };

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse filter sidebar' : 'Expand filter sidebar'}
        aria-expanded={isOpen}
        aria-controls="filter-sidebar-nav"
        className={`fixed top-[160px] z-30 p-1.5 transition-[left] duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
          isOpen ? 'left-[280px]' : 'left-0'
        }`}
        style={{
          backgroundColor: 'var(--surface-0)',
          border: '1px solid var(--line)',
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          boxShadow: '0 1px 2px var(--color-shadow-sm), 0 2px 8px var(--color-shadow-md)',
        }}
        title={isOpen ? 'Hide filters' : 'Show filters'}
      >
        {isOpen
          ? <ChevronLeft className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
          : <ChevronRight className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />}
      </button>

      <aside
        id="filter-sidebar-nav"
        aria-label="Global and page filters"
        aria-hidden={!isOpen}
        className={`fixed left-0 top-[64px] h-[calc(100vh-64px)] w-[280px] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--surface-0)',
          borderRight: '1px solid var(--line)',
        }}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Global Filters */}
          <div>
            <button
              onClick={() => setIsGlobalOpen(!isGlobalOpen)}
              className="flex items-center gap-2.5 px-5 py-4 w-full transition-colors"
              style={{ borderBottom: '1px solid var(--line)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
            >
              <Filter className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
              <span className="flex-1 text-left" style={eyebrowStyle}>Global Filters</span>
              {isGlobalOpen
                ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />}
            </button>

            {isGlobalOpen && <FilterPanel />}
          </div>

          {/* Page-Specific Filters — wired to FilterContext.pageFilters and
              sent to the API as real query params by useApiData. */}
          {defs.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={() => setIsPageOpen(!isPageOpen)}
                className="flex items-center gap-2.5 px-5 py-4 w-full transition-colors"
                style={{ borderBottom: '1px solid var(--line)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
              >
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
                <span className="flex-1 text-left" style={eyebrowStyle}>Page Filters</span>
                {activePageFilterCount > 0 && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(15, 157, 154, 0.12)', color: 'var(--brand-press)' }}
                  >
                    {activePageFilterCount}
                  </span>
                )}
                {isPageOpen
                  ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                  : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />}
              </button>

              {isPageOpen && (
                <div className="px-3 py-3">
                  {defs.map((def) => (
                    <PageFilterSection
                      key={def.dim}
                      def={def}
                      options={optionsFor(def)}
                      selected={routeFilters[def.dim] || []}
                      onChange={(values) => setPageFilter(route, def.dim, values)}
                    />
                  ))}
                  {activePageFilterCount > 0 && (
                    <button
                      onClick={() => clearPageFilters(route)}
                      className="w-full mt-1 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors"
                      style={{ color: 'var(--ink)', backgroundColor: 'var(--surface-0)', borderColor: 'var(--line)' }}
                    >
                      Clear Page Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Cross-Filters */}
          {activeFilters.length > 0 && (
            <div className="p-4" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <span style={eyebrowStyle}>Active Selections</span>
                <button
                  onClick={clearAllCrossFilters}
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--brand-press)' }}
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map((filter) => (
                  <span
                    key={filter.id}
                    className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1 py-0.5 rounded-full border"
                    style={{
                      background: 'rgba(15, 157, 154, 0.10)',
                      color: 'var(--brand-press)',
                      borderColor: 'rgba(15, 157, 154, 0.30)',
                    }}
                  >
                    <span className="truncate max-w-[160px]">{filter.label}</span>
                    <button
                      onClick={() => removeCrossFilter(filter.id)}
                      className="flex-shrink-0 p-0.5 rounded-full"
                      style={{ transition: 'background-color 150ms ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 157, 154, 0.20)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                      aria-label="Remove filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
