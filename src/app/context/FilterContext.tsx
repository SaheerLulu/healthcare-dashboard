import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface FilterContextType {
  // Date range (FY 2025-26 default)
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;

  // Location filter (location IDs)
  selectedLocations: string[];
  setSelectedLocations: (locations: string[]) => void;

  // Category filter
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;

  // Company filter (company IDs)
  selectedCompanies: string[];
  setSelectedCompanies: (companies: string[]) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Chart cross-filter
  chartFilter: { field: string | null; value: string | null };
  setChartFilter: (filter: { field: string | null; value: string | null }) => void;

  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const DEFAULT_DATE_RANGE = { from: '2025-04-01', to: '2026-03-31' };

export function FilterProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chartFilter, setChartFilter] = useState<{ field: string | null; value: string | null }>({
    field: null,
    value: null,
  });

  const clearAllFilters = () => {
    setDateRange(DEFAULT_DATE_RANGE);
    setSelectedLocations([]);
    setSelectedCategories([]);
    setSelectedCompanies([]);
    setSearchQuery('');
    setChartFilter({ field: null, value: null });
  };

  const hasActiveFilters = useMemo(() =>
    selectedLocations.length > 0 ||
    selectedCategories.length > 0 ||
    selectedCompanies.length > 0 ||
    searchQuery.length > 0 ||
    chartFilter.field !== null ||
    dateRange.from !== DEFAULT_DATE_RANGE.from ||
    dateRange.to !== DEFAULT_DATE_RANGE.to,
    [selectedLocations, selectedCategories, selectedCompanies, searchQuery, chartFilter, dateRange]
  );

  return (
    <FilterContext.Provider
      value={{
        dateRange,
        setDateRange,
        selectedLocations,
        setSelectedLocations,
        selectedCategories,
        setSelectedCategories,
        selectedCompanies,
        setSelectedCompanies,
        searchQuery,
        setSearchQuery,
        chartFilter,
        setChartFilter,
        clearAllFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
