import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router';
import { Filter, ChevronDown, ChevronRight, ChevronLeft, X, Layers, Check } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useCrossFilter } from '../contexts/CrossFilterContext';

const pageSpecificFilters: Record<string, Array<{ label: string; options: string[] }>> = {
  '/sales': [
    { label: 'Sales Channel', options: ['All', 'POS (Retail)', 'B2B (Wholesale)', 'Online'] },
    { label: 'Sales Type', options: ['All', 'Cash', 'Credit', 'Card', 'UPI'] },
    { label: 'Customer Type', options: ['All', 'Walk-in', 'Regular', 'Corporate', 'Hospital'] },
  ],
  '/financial': [
    { label: 'Account Type', options: ['All', 'Revenue', 'Expenses', 'Assets', 'Liabilities'] },
    { label: 'Payment Status', options: ['All', 'Paid', 'Pending', 'Overdue'] },
    { label: 'Financial Period', options: ['Monthly', 'Quarterly', 'Yearly'] },
  ],
  '/inventory': [
    { label: 'Stock Status', options: ['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Overstocked'] },
    { label: 'Expiry Status', options: ['All', 'Fresh', 'Expiring Soon', 'Expired'] },
    { label: 'Movement', options: ['All', 'Fast Moving', 'Slow Moving', 'Non-Moving'] },
  ],
  '/procurement': [
    { label: 'PO Status', options: ['All', 'Draft', 'Pending', 'Approved', 'Received', 'Cancelled'] },
    { label: 'Supplier Rating', options: ['All', '5 Star', '4+ Star', '3+ Star'] },
    { label: 'Payment Terms', options: ['All', 'Immediate', '30 Days', '60 Days', '90 Days'] },
  ],
  '/gst': [
    { label: 'GST Type', options: ['All', 'CGST', 'SGST', 'IGST'] },
    { label: 'Return Status', options: ['All', 'Filed', 'Pending', 'Late'] },
  ],
  '/tds': [
    { label: 'Section', options: ['All', '194C', '194Q', '194O', '194A'] },
    { label: 'Status', options: ['All', 'Deducted', 'Deposited', 'Pending'] },
  ],
  '/working-capital': [
    { label: 'Party Type', options: ['All', 'Receivable', 'Payable'] },
    { label: 'Aging', options: ['All', '0-30 Days', '30-60 Days', '60-90 Days', '90+ Days'] },
  ],
  '/location': [
    { label: 'Performance', options: ['All', 'Above Average', 'Below Average'] },
  ],
  '/product': [
    { label: 'Lifecycle', options: ['All', 'Introduction', 'Growth', 'Maturity', 'Decline'] },
    { label: 'Movement', options: ['All', 'Fast', 'Medium', 'Slow', 'Dead'] },
  ],
  '/dispatch': [
    { label: 'Status', options: ['All', 'Pending', 'Dispatched', 'In Transit', 'Delivered'] },
  ],
  '/loyalty': [
    { label: 'Tier', options: ['All', 'Platinum', 'Gold', 'Silver', 'Bronze'] },
  ],
  '/audit': [
    { label: 'Action', options: ['All', 'Create', 'Update', 'Delete'] },
  ],
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
};

const CustomDropdown = ({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const triggerStyle: CSSProperties = open
    ? {
        backgroundColor: 'var(--surface-0)',
        borderColor: 'var(--brand)',
        color: 'var(--ink)',
      }
    : isActive
    ? {
        backgroundColor: 'rgba(15, 157, 154, 0.08)',
        borderColor: 'rgba(15, 157, 154, 0.30)',
        color: 'var(--brand-press)',
      }
    : {
        backgroundColor: 'var(--surface-1)',
        borderColor: 'var(--line)',
        color: 'var(--ink)',
      };

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1.5" style={{ ...eyebrowStyle, fontSize: 10 }}>{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all"
        style={triggerStyle}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: open ? 'var(--brand)' : 'var(--ink-3)' }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden dropdown-animate"
          style={{
            backgroundColor: 'var(--surface-0)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map(option => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  onClick={() => { onChange(option); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                  style={
                    selected
                      ? { backgroundColor: 'rgba(15, 157, 154, 0.08)', color: 'var(--brand-press)', fontWeight: 500 }
                      : { color: 'var(--ink)' }
                  }
                  onMouseEnter={(e) => {
                    if (!selected) e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                    style={
                      selected
                        ? { backgroundColor: 'var(--brand)', borderColor: 'var(--brand)' }
                        : { borderColor: 'var(--line)' }
                    }
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
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
  const [pageFilterValues, setPageFilterValues] = useState<Record<string, string>>({});

  const currentPageFilters = pageSpecificFilters[location.pathname] || [];

  const handlePageFilterChange = (label: string, value: string) =>
    setPageFilterValues(prev => ({ ...prev, [label]: value }));

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        className={`fixed top-[160px] z-30 p-1.5 transition-[left] duration-300 ease-in-out ${
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

          {/* Page-Specific Filters */}
          {currentPageFilters.length > 0 && (
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
                {isPageOpen
                  ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                  : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />}
              </button>

              {isPageOpen && (
                <div className="px-4 py-4 space-y-4">
                  {currentPageFilters.map((filter) => (
                    <CustomDropdown
                      key={filter.label}
                      label={filter.label}
                      options={filter.options}
                      value={pageFilterValues[filter.label] || filter.options[0]}
                      onChange={(val) => handlePageFilterChange(filter.label, val)}
                    />
                  ))}
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
