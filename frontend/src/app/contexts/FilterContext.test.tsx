import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FilterProvider, useFilters } from './FilterContext';

// Mock the api module — useDashboardPrefs is imported by FilterProvider
// and would otherwise hit the network in a jsdom environment.
vi.mock('../services/api', () => {
  const get = vi.fn(() => Promise.resolve({ data: { prefs: {} } }));
  const patch = vi.fn(() => Promise.resolve({ data: { prefs: {} } }));
  return { default: { get, patch } };
});

import api from '../services/api';

const wrapper = ({ children }: { children: ReactNode }) => (
  <FilterProvider>{children}</FilterProvider>
);

describe('FilterContext defaults', () => {
  beforeEach(() => {
    (api.get as any).mockClear();
    (api.get as any).mockImplementation(() => Promise.resolve({ data: { prefs: {} } }));
    (api.patch as any).mockClear();
  });

  it('starts with the Last 6 Months preset', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.quickPreset).toBe('Last 6 Months');
    expect(result.current.filters.dateRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.filters.dateRange.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('financialYear is in the FY YYYY-YY format', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.financialYear).toMatch(/^FY \d{4}-\d{2}$/);
  });

  it('default location/channel/category arrays are empty', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.locations).toEqual([]);
    expect(result.current.filters.salesChannel).toEqual([]);
    expect(result.current.filters.productCategories).toEqual([]);
    expect(result.current.filters.paymentMethod).toEqual([]);
  });
});

describe('FilterContext.updateFilters', () => {
  it('changing quickPreset auto-recomputes dateRange', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({ quickPreset: 'Today' });
    });
    expect(result.current.filters.quickPreset).toBe('Today');
    // Today preset → start === end
    expect(result.current.filters.dateRange.start).toBe(result.current.filters.dateRange.end);
  });

  it('Last 30 Days preset spans 30 days inclusive', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({ quickPreset: 'Last 30 Days' });
    });
    const start = new Date(result.current.filters.dateRange.start);
    const end = new Date(result.current.filters.dateRange.end);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(29);
  });

  it('manual dateRange forces quickPreset = Custom', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
      });
    });
    expect(result.current.filters.quickPreset).toBe('Custom');
    expect(result.current.filters.dateRange.start).toBe('2026-01-01');
  });

  it('Yesterday preset returns one day in the past', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({ quickPreset: 'Yesterday' });
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const expected = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(result.current.filters.dateRange.start).toBe(expected);
    expect(result.current.filters.dateRange.end).toBe(expected);
  });

  it('This FY produces a window that starts on April 1', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({ quickPreset: 'This FY' });
    });
    expect(result.current.filters.dateRange.start.endsWith('-04-01')).toBe(true);
  });

  it('partial update merges with existing filters', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({ locations: ['1', '2'] });
    });
    expect(result.current.filters.locations).toEqual(['1', '2']);
    expect(result.current.filters.quickPreset).toBe('Last 6 Months'); // unchanged
  });
});

describe('FilterContext.resetFilters', () => {
  it('reverts to defaults', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.updateFilters({
        quickPreset: 'Today',
        locations: ['7'],
        salesChannel: ['POS'],
      });
    });
    expect(result.current.filters.locations).toEqual(['7']);

    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filters.quickPreset).toBe('Last 6 Months');
    expect(result.current.filters.locations).toEqual([]);
    expect(result.current.filters.salesChannel).toEqual([]);
  });
});

describe('FilterContext prefs integration', () => {
  beforeEach(() => {
    (api.get as any).mockClear();
    (api.patch as any).mockClear();
  });

  it('hydrates default_quick_preset from /api/prefs/ on first load', async () => {
    (api.get as any).mockResolvedValue({
      data: { prefs: { default_quick_preset: 'Last 30 Days' } },
    });
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.filters.quickPreset).toBe('Last 30 Days');
    });
  });

  it('persists non-Custom preset choices via PATCH /api/prefs/', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    // Wait for the first prefs load to complete so hydratedRef is true
    await waitFor(() => expect((api.get as any)).toHaveBeenCalled());

    act(() => {
      result.current.updateFilters({ quickPreset: 'This Month' });
    });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/prefs/', { default_quick_preset: 'This Month' });
    });
  });

  it('does NOT persist Custom (raw date range)', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    await waitFor(() => expect((api.get as any)).toHaveBeenCalled());

    (api.patch as any).mockClear();
    act(() => {
      result.current.updateFilters({
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
      });
    });

    expect(api.patch).not.toHaveBeenCalled();
  });
});
