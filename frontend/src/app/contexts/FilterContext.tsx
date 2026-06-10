import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useDashboardPrefs } from '../hooks/useDashboardPrefs';

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

/** Per-route page filters: route path → dimension id → selected values.
 *  Dimension ids match backend query params (docs/DRILLTHROUGH_DESIGN.md §1). */
export type PageFilters = Record<string, Record<string, string[]>>;

interface FilterContextType {
  filters: GlobalFilters;
  updateFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
  pageFilters: PageFilters;
  setPageFilter: (route: string, dim: string, values: string[]) => void;
  clearPageFilters: (route: string) => void;
  /** True until the user (or data anchoring) changes the date range. */
  datePristine: boolean;
  /** One-time shift of the pristine rolling-month window so it ends at the
   *  freshest data date instead of an empty future window when the pipeline
   *  is stale. No-op once the user has touched dates. */
  anchorDateRange: (dataMax: string) => void;
}

// Format as local-time YYYY-MM-DD. toISOString() returns UTC, which in IST
// (UTC+5:30) shifts the date back by one day for local-midnight Date objects
// — that's why "Today" was rendering yesterday's date.
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const today = new Date();
const currentFY = today.getMonth() >= 3
  ? `FY ${today.getFullYear()}-${String(today.getFullYear() + 1).slice(2)}`
  : `FY ${today.getFullYear() - 1}-${String(today.getFullYear()).slice(2)}`;

export function computeDateRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = toISO;

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
    case 'Last 30 Days':
    case 'Rolling Month': {
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
    case 'Last 6 Months': {
      const s = new Date(t); s.setMonth(s.getMonth() - 6);
      return { start: iso(s), end: iso(t) };
    }
    default: {
      // Generic 'Last N Days' (the GlobalDateBar persists 3M/6M chips as
      // 'Last 91 Days' / 'Last 182 Days' — they must round-trip on reload).
      const m = /^Last (\d+) Days$/.exec(preset);
      if (m) {
        const s = new Date(t); s.setDate(s.getDate() - (parseInt(m[1], 10) - 1));
        return { start: iso(s), end: iso(t) };
      }
      // Unknown preset → rolling month (the dashboard default).
      return computeDateRange('Rolling Month');
    }
  }
}

/** Width-based window for a preset ending at `endIso` instead of today —
 *  used to anchor presets to the freshest data date when the pipeline is
 *  stale. Returns null for presets that aren't a simple trailing window. */
function presetWindowEndingAt(preset: string, endIso: string): { start: string; end: string } | null {
  const end = new Date(`${endIso}T00:00:00`);
  const days = preset === 'Rolling Month' ? 30
    : preset === 'Last 30 Days' ? 30
    : preset === 'Last 7 Days' ? 7
    : (/^Last (\d+) Days$/.exec(preset) ? parseInt(/^Last (\d+) Days$/.exec(preset)![1], 10) : null);
  if (days) {
    const start = new Date(end); start.setDate(start.getDate() - (days - 1));
    return { start: toISO(start), end: endIso };
  }
  if (preset === 'This FY') {
    const fyStart = end.getMonth() >= 3
      ? new Date(end.getFullYear(), 3, 1)
      : new Date(end.getFullYear() - 1, 3, 1);
    return { start: toISO(fyStart), end: endIso };
  }
  return null;
}

const defaultFilters: GlobalFilters = {
  dateRange: computeDateRange('Rolling Month'),
  quickPreset: 'Rolling Month',
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
  const [pageFilters, setPageFilters] = useState<PageFilters>({});
  const { prefs, updatePrefs, loaded: prefsLoaded } = useDashboardPrefs();
  const [datePristine, setDatePristine] = useState(true);
  // Freshest data date reported by anchorDateRange — lets a prefs hydration
  // that lands AFTER the anchor still produce a data-aligned window.
  const dataMaxRef = useRef<string | null>(null);

  /** Resolve a preset to a window anchored at min(today, data max). */
  const anchoredRange = (preset: string): { start: string; end: string } => {
    const todayIso = toISO(new Date());
    const dataMax = dataMaxRef.current;
    if (dataMax && dataMax < todayIso) {
      const w = presetWindowEndingAt(preset, dataMax);
      if (w) return w;
    }
    return computeDateRange(preset);
  };

  // Hydrate the quickPreset from server-side prefs exactly once. The v2 key
  // deliberately ignores legacy `default_quick_preset` values so existing
  // users land on the new rolling-month default instead of a stale 6-month
  // preference saved against the old UI.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!prefsLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = (prefs as any).default_quick_preset_v2;
    if (typeof saved === 'string' && saved && saved !== filters.quickPreset) {
      setFilters(prev => ({
        ...prev,
        quickPreset: saved,
        dateRange: anchoredRange(saved),
      }));
    }
    // filters.quickPreset is intentionally not in deps — we only run on
    // the first prefs load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  const updateFilters = (newFilters: Partial<GlobalFilters>) => {
    if (newFilters.dateRange || newFilters.quickPreset) setDatePristine(false);
    setFilters(prev => {
      const merged = { ...prev, ...newFilters };
      if (newFilters.quickPreset && !newFilters.dateRange) {
        merged.dateRange = anchoredRange(newFilters.quickPreset);
      }
      if (newFilters.dateRange && !newFilters.quickPreset) {
        merged.quickPreset = 'Custom';
      }
      return merged;
    });
    // Persist preset choice — only reproducible presets ('Custom' has no
    // recipe; 'All Data' depends on data bounds unknown at next load).
    if (
      newFilters.quickPreset &&
      newFilters.quickPreset !== 'Custom' &&
      newFilters.quickPreset !== 'All Data' &&
      hydratedRef.current
    ) {
      updatePrefs({ default_quick_preset_v2: newFilters.quickPreset } as any).catch(() => {});
    }
  };

  const anchorDateRange = (dataMax: string) => {
    if (!dataMax) return;
    dataMaxRef.current = dataMax;
    const todayIso = toISO(new Date());
    if (dataMax >= todayIso) return; // data is current — nothing to anchor
    setFilters(prev => {
      // Never touch an explicit custom range or an All-Data selection.
      if (prev.quickPreset === 'Custom' || prev.quickPreset === 'All Data') return prev;
      const w = presetWindowEndingAt(prev.quickPreset, dataMax);
      return w ? { ...prev, dateRange: w } : prev;
    });
    // Anchoring keeps pristine semantics: it realigns the SAME preset to the
    // freshest data; it is not a user choice.
  };

  const setPageFilter = (route: string, dim: string, values: string[]) => {
    setPageFilters(prev => {
      const forRoute = { ...(prev[route] || {}) };
      if (values.length) forRoute[dim] = values;
      else delete forRoute[dim];
      return { ...prev, [route]: forRoute };
    });
  };

  const clearPageFilters = (route: string) => {
    setPageFilters(prev => ({ ...prev, [route]: {} }));
  };

  const resetFilters = () => {
    // Re-anchor the rolling-month default to the freshest data date —
    // a plain `defaultFilters` restore after the one-shot anchor consumed
    // its trigger would strand a stale deployment on an empty window.
    setFilters({ ...defaultFilters, dateRange: anchoredRange('Rolling Month') });
    setPageFilters({});
    setDatePristine(true);
  };

  return (
    <FilterContext.Provider value={{
      filters, updateFilters, resetFilters,
      pageFilters, setPageFilter, clearPageFilters,
      datePristine, anchorDateRange,
    }}>
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
