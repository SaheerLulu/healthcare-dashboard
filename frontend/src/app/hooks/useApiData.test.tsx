import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FilterProvider, useFilters } from '../contexts/FilterContext';
import { useApiData } from './useApiData';

// Mock api so the hook never hits the network.
vi.mock('../services/api', () => {
  const get = vi.fn();
  const patch = vi.fn(() => Promise.resolve({ data: { prefs: {} } }));
  return { default: { get, patch } };
});

import api from '../services/api';

const wrapper = ({ children }: { children: ReactNode }) => (
  <FilterProvider>{children}</FilterProvider>
);

describe('useApiData', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.get as any).mockImplementation((path: string) => {
      if (path === '/prefs/') return Promise.resolve({ data: { prefs: {} } });
      return Promise.resolve({ data: { ok: true } });
    });
    (api.patch as any).mockClear();
  });

  it('fetches on mount and exposes data + loading + error', async () => {
    const { result } = renderHook(
      () => useApiData('/sales/overview/', { ok: false } as any),
      { wrapper },
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
  });

  it('keeps fallback data when the API errors', async () => {
    (api.get as any).mockImplementation((path: string) => {
      if (path === '/prefs/') return Promise.resolve({ data: { prefs: {} } });
      return Promise.reject({ response: { data: { detail: 'boom' } } });
    });
    const fallback = [1, 2, 3];
    const { result } = renderHook(
      () => useApiData('/sales/overview/', fallback as any),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(fallback);
    expect(result.current.error).toBe('boom');
  });

  it('passes filter params by default', async () => {
    renderHook(() => useApiData('/sales/overview/', {} as any), { wrapper });
    await waitFor(() => {
      const calls = (api.get as any).mock.calls.filter((c: any[]) => c[0] === '/sales/overview/');
      expect(calls.length).toBeGreaterThan(0);
      const params = calls[0][1].params;
      expect(params).toHaveProperty('start_date');
      expect(params).toHaveProperty('end_date');
    });
  });

  it('skips filter params when noFilters: true', async () => {
    renderHook(
      () => useApiData('/pipeline/history/', [] as any, { noFilters: true }),
      { wrapper },
    );
    await waitFor(() => {
      const calls = (api.get as any).mock.calls.filter((c: any[]) => c[0] === '/pipeline/history/');
      expect(calls.length).toBeGreaterThan(0);
      const params = calls[0][1].params;
      expect(params.start_date).toBeUndefined();
      expect(params.end_date).toBeUndefined();
    });
  });

  it('merges custom params with filter params', async () => {
    renderHook(
      () => useApiData('/inventory/days-of-cover/', {} as any, { params: { limit: 20 } }),
      { wrapper },
    );
    await waitFor(() => {
      const calls = (api.get as any).mock.calls.filter((c: any[]) => c[0] === '/inventory/days-of-cover/');
      expect(calls.length).toBeGreaterThan(0);
      const params = calls[0][1].params;
      expect(params.limit).toBe(20);
      expect(params.start_date).toBeDefined();
    });
  });

  it('refetches when filters change', async () => {
    const { result } = renderHook(
      () => {
        const filters = useFilters();
        const data = useApiData('/sales/overview/', {} as any);
        return { ...data, ...filters };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCallCount = (api.get as any).mock.calls.filter(
      (c: any[]) => c[0] === '/sales/overview/'
    ).length;

    act(() => {
      result.current.updateFilters({ quickPreset: 'Today' });
    });

    await waitFor(() => {
      const finalCallCount = (api.get as any).mock.calls.filter(
        (c: any[]) => c[0] === '/sales/overview/'
      ).length;
      expect(finalCallCount).toBeGreaterThan(initialCallCount);
    });
  });

  it('refetch() forces a new request', async () => {
    const { result } = renderHook(
      () => useApiData('/audit/overview/', {} as any),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = (api.get as any).mock.calls.filter((c: any[]) => c[0] === '/audit/overview/').length;
    await act(async () => {
      await result.current.refetch();
    });
    const after = (api.get as any).mock.calls.filter((c: any[]) => c[0] === '/audit/overview/').length;
    expect(after).toBeGreaterThan(before);
  });

  it('passes location_ids comma-joined when present', async () => {
    const { result } = renderHook(
      () => {
        const filters = useFilters();
        const data = useApiData('/sales/overview/', {} as any);
        return { ...data, ...filters };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.updateFilters({ locations: ['1', '2', '3'] });
    });

    await waitFor(() => {
      const calls = (api.get as any).mock.calls.filter((c: any[]) => c[0] === '/sales/overview/');
      const last = calls[calls.length - 1];
      expect(last[1].params.location_ids).toBe('1,2,3');
    });
  });
});
