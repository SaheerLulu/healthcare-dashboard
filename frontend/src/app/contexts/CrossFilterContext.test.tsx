import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CrossFilterProvider, useCrossFilter } from './CrossFilterContext';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <CrossFilterProvider>{children}</CrossFilterProvider>
);

describe('CrossFilterContext', () => {
  it('starts with no active filters', () => {
    const { result } = renderHook(() => useCrossFilter(), { wrapper });
    expect(result.current.activeFilters).toEqual([]);
  });

  it('toggleCrossFilter adds a filter on first call', () => {
    const { result } = renderHook(() => useCrossFilter(), { wrapper });
    act(() => {
      result.current.toggleCrossFilter({ id: 'month', label: 'month: Jan', value: 'Jan' });
    });
    expect(result.current.activeFilters).toHaveLength(1);
    expect(result.current.activeFilters[0]).toMatchObject({ id: 'month', value: 'Jan' });
  });

  it('toggleCrossFilter on the same id+value removes it (deselect)', () => {
    const { result } = renderHook(() => useCrossFilter(), { wrapper });
    act(() => {
      result.current.toggleCrossFilter({ id: 'month', label: 'month: Jan', value: 'Jan' });
    });
    act(() => {
      result.current.toggleCrossFilter({ id: 'month', label: 'month: Jan', value: 'Jan' });
    });
    expect(result.current.activeFilters).toEqual([]);
  });

  it('isFiltered returns true only when the dimension+value matches', () => {
    const { result } = renderHook(() => useCrossFilter(), { wrapper });
    act(() => {
      result.current.toggleCrossFilter({ id: 'month', label: 'month: Jan', value: 'Jan' });
    });
    // No filters on a different dimension → everything passes through
    expect(result.current.isFiltered('category', 'Antibiotic')).toBe(true);
    // Same dimension, matching value → passes
    expect(result.current.isFiltered('month', 'Jan')).toBe(true);
    // Same dimension, different value → fails
    expect(result.current.isFiltered('month', 'Feb')).toBe(false);
  });

  it('clearFilters wipes all', () => {
    const { result } = renderHook(() => useCrossFilter(), { wrapper });
    act(() => {
      result.current.toggleCrossFilter({ id: 'month', label: 'month: Jan', value: 'Jan' });
      result.current.toggleCrossFilter({ id: 'channel', label: 'channel: POS', value: 'POS' });
    });
    act(() => {
      result.current.clearAllCrossFilters();
    });
    expect(result.current.activeFilters).toEqual([]);
  });
});
