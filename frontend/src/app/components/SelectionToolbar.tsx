import { X } from 'lucide-react';
import { useCrossFilter } from '../contexts/CrossFilterContext';

export const SelectionToolbar = () => {
  const { activeFilters, removeCrossFilter, clearAllCrossFilters } = useCrossFilter();

  if (activeFilters.length === 0) return null;

  return (
    <div className="bg-teal-50 border-b border-teal-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-teal-900">Filtered by:</span>
          {activeFilters.map(filter => (
            <div
              key={filter.id}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-3 py-1 rounded-md text-sm"
            >
              <span>{filter.label}</span>
              <button
                onClick={() => removeCrossFilter(filter.id)}
                className="hover:bg-teal-700 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        
        <button
          onClick={clearAllCrossFilters}
          className="text-sm font-medium text-teal-700 hover:text-teal-800 px-3 py-1 hover:bg-teal-100 rounded"
        >
          Clear All Selections
        </button>
      </div>
    </div>
  );
};
