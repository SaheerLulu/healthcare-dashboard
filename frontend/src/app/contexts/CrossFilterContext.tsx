import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CrossFilter {
  id: string;
  label: string;
  value: string | string[];
}

interface CrossFilterContextType {
  activeFilters: CrossFilter[];
  addCrossFilter: (filter: CrossFilter) => void;
  removeCrossFilter: (id: string) => void;
  clearAllCrossFilters: () => void;
  isFiltered: (dimension: string, value: string) => boolean;
}

const CrossFilterContext = createContext<CrossFilterContextType | undefined>(undefined);

export const CrossFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeFilters, setActiveFilters] = useState<CrossFilter[]>([]);

  const addCrossFilter = (filter: CrossFilter) => {
    setActiveFilters(prev => {
      // Check if filter with same id exists
      const existing = prev.find(f => f.id === filter.id);
      if (existing) {
        // Replace existing filter
        return prev.map(f => f.id === filter.id ? filter : f);
      }
      return [...prev, filter];
    });
  };

  const removeCrossFilter = (id: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  const clearAllCrossFilters = () => {
    setActiveFilters([]);
  };

  const isFiltered = (dimension: string, value: string) => {
    const filter = activeFilters.find(f => f.id === dimension);
    if (!filter) return true; // No filter = show everything
    
    if (Array.isArray(filter.value)) {
      return filter.value.includes(value);
    }
    return filter.value === value;
  };

  return (
    <CrossFilterContext.Provider 
      value={{ activeFilters, addCrossFilter, removeCrossFilter, clearAllCrossFilters, isFiltered }}
    >
      {children}
    </CrossFilterContext.Provider>
  );
};

export const useCrossFilter = () => {
  const context = useContext(CrossFilterContext);
  if (!context) {
    throw new Error('useCrossFilter must be used within CrossFilterProvider');
  }
  return context;
};
