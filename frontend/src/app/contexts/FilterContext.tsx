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

function computeDateRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'Today':
      return { start: iso(t), end: iso(t) };
    case 'Yesterday': {
      const y = new Date(t); y.setDate(y.getDate() - 1);
      return { start: iso(y), end: iso(y) };
    }
    case 'Last 7 Days': {
      const s = new Date(t); s.setDate(s.getDate() - 6);
      return { start: iso(s), end: iso(t) };
    }
    case 'Last 30 Days': {
      const s = new Date(t); s.setDate(s.getDate() - 29);
      return { start: iso(s), end: iso(t) };
    }
    case 'This Month':
      return { start: iso(new Date(t.getFullYear(), t.getMonth(), 1)), end: iso(t) };
    case 'Last Month': {
      const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const last = new Date(t.getFullYear(), t.getMonth(), 0);
      return { start: iso(first), end: iso(last) };
    }
    case 'This Quarter': {
      // Indian FY quarters: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar
      const m = t.getMonth(); // 0-indexed
      const qStart = m >= 3 && m <= 5 ? 3 : m >= 6 && m <= 8 ? 6 : m >= 9 && m <= 11 ? 9 : 0;
      const yr = qStart === 0 ? t.getFullYear() : t.getFullYear();
      return { start: iso(new Date(yr, qStart, 1)), end: iso(t) };
    }
    case 'This FY': {
      const fyStart = t.getMonth() >= 3
        ? new Date(t.getFullYear(), 3, 1)
        : new Date(t.getFullYear() - 1, 3, 1);
      return { start: iso(fyStart), end: iso(t) };
    }
    default: {
      // 'Last 6 Months' or unknown
      const s = new Date(t); s.setMonth(s.getMonth() - 6);
      return { start: iso(s), end: iso(t) };
    }
  }
}

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
    setFilters(prev => {
      const merged = { ...prev, ...newFilters };
      if (newFilters.quickPreset && !newFilters.dateRange) {
        merged.dateRange = computeDateRange(newFilters.quickPreset);
      }
      if (newFilters.dateRange && !newFilters.quickPreset) {
        merged.quickPreset = 'Custom';
      }
      return merged;
    });
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
