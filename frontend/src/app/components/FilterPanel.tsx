import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';

export const FilterPanel = () => {
  const { filters, updateFilters, resetFilters } = useFilters();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    time: true,
    location: false,
    product: false,
    transaction: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const quickPresets = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'This Quarter', 'This FY'];
  const channels = ['POS (Retail)', 'B2B (Wholesale)'];
  const paymentMethods = ['Cash', 'UPI', 'Card', 'Credit', 'Cheque'];
  const locations = ['Main Store - Delhi', 'Branch - Mumbai', 'Branch - Bangalore', 'Warehouse - Noida', 'Branch - Chennai'];
  const categories = ['Medicines', 'Surgical', 'OTC', 'Cosmetics', 'Baby Care', 'Ayurvedic', 'Equipment'];

  return (
    <div className="px-3 pb-4">
      {/* Time & Period Section */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('time')}
          className="flex items-center gap-2 w-full py-2 px-2 hover:bg-gray-50 rounded"
        >
          {expandedSections.time ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Time & Period
          </span>
        </button>

        {expandedSections.time && (
          <div className="mt-2 space-y-3 px-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Quick Presets</label>
              <div className="flex flex-wrap gap-1">
                {quickPresets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => updateFilters({ quickPreset: preset })}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filters.quickPreset === preset
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Financial Year</label>
              <select
                value={filters.financialYear}
                onChange={(e) => updateFilters({ financialYear: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option>FY 2025-26</option>
                <option>FY 2024-25</option>
                <option>FY 2023-24</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => updateFilters({
                    dateRange: { ...filters.dateRange, start: e.target.value }
                  })}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => updateFilters({
                    dateRange: { ...filters.dateRange, end: e.target.value }
                  })}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Section */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('location')}
          className="flex items-center gap-2 w-full py-2 px-2 hover:bg-gray-50 rounded"
        >
          {expandedSections.location ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Location
          </span>
          {filters.locations.length > 0 && (
            <span className="ml-auto text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
              {filters.locations.length}
            </span>
          )}
        </button>

        {expandedSections.location && (
          <div className="mt-2 px-2 space-y-1">
            {locations.map(loc => (
              <label key={loc} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                <input
                  type="checkbox"
                  checked={filters.locations.includes(loc)}
                  onChange={(e) => {
                    const newLocs = e.target.checked
                      ? [...filters.locations, loc]
                      : filters.locations.filter(l => l !== loc);
                    updateFilters({ locations: newLocs });
                  }}
                  className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-xs text-gray-700">{loc}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Product Category Section */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('product')}
          className="flex items-center gap-2 w-full py-2 px-2 hover:bg-gray-50 rounded"
        >
          {expandedSections.product ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Product Category
          </span>
          {filters.productCategories.length > 0 && (
            <span className="ml-auto text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
              {filters.productCategories.length}
            </span>
          )}
        </button>

        {expandedSections.product && (
          <div className="mt-2 px-2 space-y-1">
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                <input
                  type="checkbox"
                  checked={filters.productCategories.includes(cat)}
                  onChange={(e) => {
                    const newCats = e.target.checked
                      ? [...filters.productCategories, cat]
                      : filters.productCategories.filter(c => c !== cat);
                    updateFilters({ productCategories: newCats });
                  }}
                  className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-xs text-gray-700">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Dimensions Section */}
      <div className="mb-3">
        <button
          onClick={() => toggleSection('transaction')}
          className="flex items-center gap-2 w-full py-2 px-2 hover:bg-gray-50 rounded"
        >
          {expandedSections.transaction ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Transaction
          </span>
        </button>

        {expandedSections.transaction && (
          <div className="mt-2 space-y-3 px-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sales Channel</label>
              <div className="space-y-1">
                {channels.map(channel => (
                  <label key={channel} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={filters.salesChannel.includes(channel)}
                      onChange={(e) => {
                        const newChannels = e.target.checked
                          ? [...filters.salesChannel, channel]
                          : filters.salesChannel.filter(c => c !== channel);
                        updateFilters({ salesChannel: newChannels });
                      }}
                      className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-xs text-gray-700">{channel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Payment Method</label>
              <div className="space-y-1">
                {paymentMethods.map(method => (
                  <label key={method} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={filters.paymentMethod.includes(method)}
                      onChange={(e) => {
                        const newMethods = e.target.checked
                          ? [...filters.paymentMethod, method]
                          : filters.paymentMethod.filter(m => m !== method);
                        updateFilters({ paymentMethod: newMethods });
                      }}
                      className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-xs text-gray-700">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2 px-2">
        <button
          onClick={resetFilters}
          className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Reset All
        </button>
        <button className="flex-1 px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors">
          Apply Filters
        </button>
      </div>
    </div>
  );
};
