import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface GlobalFilters {
  dateRange: { start: string; end: string };
  quickPreset: string;
  financialYear: string;
  locations: string[];
  salesChannel: string[];
  paymentMethod: string[];
  productCategories: string[];
  supplierNames: string[];
  customerTypes: string[];
}

interface FilterContextType {
  filters: GlobalFilters;
  updateFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
}

// Dynamic date range: last 6 months to today
const today = new Date();
const sixMonthsAgo = new Date(today);
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const currentFY = today.getMonth() >= 3
  ? `FY ${today.getFullYear()}-${String(today.getFullYear() + 1).slice(2)}`
  : `FY ${today.getFullYear() - 1}-${String(today.getFullYear()).slice(2)}`;

const defaultFilters: GlobalFilters = {
  dateRange: { start: toISO(sixMonthsAgo), end: toISO(today) },
  quickPreset: 'Last 6 Months',
  financialYear: currentFY,
  locations: [],
  salesChannel: [],
  paymentMethod: [],
  productCategories: [],
  supplierNames: [],
  customerTypes: [],
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters);

  const updateFilters = (newFilters: Partial<GlobalFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <FilterContext.Provider value={{ filters, updateFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};
