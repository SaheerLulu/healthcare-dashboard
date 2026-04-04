import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Filter, ChevronDown, ChevronRight, ChevronLeft, X, Layers, Check } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { useCrossFilter } from '../contexts/CrossFilterContext';

// Page-specific filters configuration
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

const CustomDropdown = ({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all ${
          open
            ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white'
            : value !== options[0]
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map(option => (
              <button
                key={option}
                onClick={() => { onChange(option); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  value === option
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  value === option ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                }`}>
                  {value === option && <Check className="w-3 h-3 text-white" />}
                </div>
                <span>{option}</span>
              </button>
            ))}
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

  const handlePageFilterChange = (label: string, value: string) => {
    setPageFilterValues(prev => ({ ...prev, [label]: value }));
  };

  return (
    <>
    {/* Toggle tab — always visible, sticks to sidebar edge */}
    <button
      onClick={onToggle}
      className={`fixed top-[140px] z-30 bg-white border border-gray-200 rounded-r-lg shadow-sm p-1.5 transition-[left] duration-300 ease-in-out hover:bg-gray-50 ${
        isOpen ? 'left-[280px]' : 'left-0'
      }`}
      title={isOpen ? 'Hide filters' : 'Show filters'}
    >
      {isOpen
        ? <ChevronLeft className="w-4 h-4 text-gray-600" />
        : <ChevronRight className="w-4 h-4 text-gray-600" />
      }
    </button>

    <aside className={`fixed left-0 top-[128px] h-[calc(100vh-128px)] w-[280px] bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-sm transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex-1 overflow-y-auto">
        {/* Global Filters Section */}
        <div>
          <button
            onClick={() => setIsGlobalOpen(!isGlobalOpen)}
            className="flex items-center gap-2 px-6 py-4 w-full hover:bg-gray-50 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-white"
          >
            <Filter className="w-5 h-5 text-teal-600" />
            <span className="flex-1 text-left text-sm font-semibold text-gray-900">
              Global Filters
            </span>
            {isGlobalOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {isGlobalOpen && <FilterPanel />}
        </div>

        {/* Page-Specific Filters Section */}
        {currentPageFilters.length > 0 && (
          <div className="border-t border-gray-200">
            <button
              onClick={() => setIsPageOpen(!isPageOpen)}
              className="flex items-center gap-2 px-6 py-4 w-full hover:bg-gray-50 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white"
            >
              <Layers className="w-5 h-5 text-indigo-600" />
              <span className="flex-1 text-left text-sm font-semibold text-gray-900">
                Page Filters
              </span>
              {isPageOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
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
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Active Selections
              </h3>
              <button
                onClick={clearAllCrossFilters}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {activeFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg"
                >
                  <span className="text-xs text-teal-900 truncate">{filter.label}</span>
                  <button
                    onClick={() => removeCrossFilter(filter.id)}
                    className="flex-shrink-0 p-0.5 hover:bg-teal-200 rounded"
                  >
                    <X className="w-3 h-3 text-teal-700" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </aside>
    </>
  );
};
