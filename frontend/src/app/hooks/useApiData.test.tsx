import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FilterProvider, useFilters } from '../contexts/FilterContext';
import { useApiData } from './useApiData';

// Mock api so the hook never hits the network.
// Contract: useApiData calls api.get(endpoint, { params, signal }) where
// `signal` is an AbortController signal used to cancel superseded requests.
vi.mock('../services/api', () => {
  const get = vi.fn();
  const patch = vi.fn(() => Promise.resolve({ data: { prefs: {} } }));
  return { default: { get, patch } };
});

import api from '../services/api';

const wrapper = ({ children }: { children: ReactNode }) => (
  <FilterProvider>{children}</FilterProvider>
);

const callsTo = (path: string) =>
  (api.get as any).mock.calls.filter((c: any[]) => c[0] === path);

const mockApiOk = () => {
  (api.get as any).mockReset();
  (api.get as any).mockImplementation((path: string) => {
    if (path === '/prefs/') return Promise.resolve({ data: { prefs: {} } });
    return Promise.resolve({ data: { ok: true } });
  });
  (api.patch as any).mockClear();
};

describe('useApiData', () => {
  beforeEach(mockApiOk);

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

  it('ignores canceled request errors — no error state, fallback kept', async () => {
    (api.get as any).mockImplementation((path: string) => {
      if (path === '/prefs/') return Promise.resolve({ data: { prefs: {} } });
      const err: any = new Error('canceled');
      err.name = 'CanceledError';
      err.code = 'ERR_CANCELED';
      return Promise.reject(err);
    });
    const fallback = [{ id: 1 }];
    const { result } = renderHook(
      () => useApiData('/sales/overview/', fallback as any),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    // A canceled request is a superseded one, not a failure.
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(fallback);
  });

  it('passes an AbortController signal to api.get', async () => {
    renderHook(() => useApiData('/sales/overview/', {} as any), { wrapper });
    await waitFor(() => expect(callsTo('/sales/overview/').length).toBeGreaterThan(0));
    const [, config] = callsTo('/sales/overview/')[0];
    expect(config.signal).toBeInstanceOf(AbortSignal);
    expect(config.signal.aborted).toBe(false);
  });

  it('passes filter params by default', async () => {
    renderHook(() => useApiData('/sales/overview/', {} as any), { wrapper });
    await waitFor(() => {
      const calls = callsTo('/sales/overview/');
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
      const calls = callsTo('/pipeline/history/');
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
      const calls = callsTo('/inventory/days-of-cover/');
      expect(calls.length).toBeGreaterThan(0);
      const params = calls[0][1].params;
      expect(params.limit).toBe(20);
      expect(params.start_date).toBeDefined();
    });
  });

  it('refetches when filters change (after the debounce window)', async () => {
    const { result } = renderHook(
      () => {
        const filters = useFilters();
        const data = useApiData('/sales/overview/', {} as any);
        return { ...data, ...filters };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCallCount = callsTo('/sales/overview/').length;

    act(() => {
      result.current.updateFilters({ quickPreset: 'Today' });
    });

    await waitFor(() => {
      expect(callsTo('/sales/overview/').length).toBeGreaterThan(initialCallCount);
    });
  });

  it('refetch() forces a new request immediately', async () => {
    const { result } = renderHook(
      () => useApiData('/audit/overview/', {} as any),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = callsTo('/audit/overview/').length;
    await act(async () => {
      await result.current.refetch();
    });
    const after = callsTo('/audit/overview/').length;
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
      const calls = callsTo('/sales/overview/');
      const last = calls[calls.length - 1];
      expect(last[1].params.location_ids).toBe('1,2,3');
    });
  });
});

describe('useApiData debounce & cancellation (fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiOk();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Flush pending promise microtasks inside act (no timers involved). */
  const flush = () => act(async () => { await Promise.resolve(); });

  const useCombined = () => {
    const filters = useFilters();
    const apiData = useApiData('/sales/overview/', {} as any);
    return { ...apiData, ...filters };
  };

  it('fires the first request immediately on mount — no debounce delay', async () => {
    renderHook(() => useApiData('/sales/overview/', {} as any), { wrapper });
    // No timers have been advanced, yet the request is already out.
    expect(callsTo('/sales/overview/').length).toBe(1);
    await flush();
  });

  it('debounces filter-driven refetches by 250ms', async () => {
    const { result } = renderHook(useCombined, { wrapper });
    await flush();
    expect(callsTo('/sales/overview/').length).toBe(1);

    act(() => {
      result.current.updateFilters({ quickPreset: 'Today' });
    });
    // No immediate refetch — it waits out the debounce window.
    expect(callsTo('/sales/overview/').length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(callsTo('/sales/overview/').length).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(callsTo('/sales/overview/').length).toBe(2);
  });

  it('collapses rapid successive filter changes into one trailing request', async () => {
    const { result } = renderHook(useCombined, { wrapper });
    await flush();
    expect(callsTo('/sales/overview/').length).toBe(1);

    act(() => { result.current.updateFilters({ quickPreset: 'Today' }); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.updateFilters({ quickPreset: 'Last 7 Days' }); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.updateFilters({ locations: ['1'] }); });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    // Mount fetch + exactly ONE trailing debounced fetch (not three).
    const calls = callsTo('/sales/overview/');
    expect(calls.length).toBe(2);
    // The trailing fetch carries the latest filter state.
    expect(calls[1][1].params.location_ids).toBe('1');
  });

  it('aborts the in-flight request when a newer fetch supersedes it', async () => {
    (api.get as any).mockImplementation((path: string) => {
      if (path === '/prefs/') return Promise.resolve({ data: { prefs: {} } });
      return new Promise(() => {}); // never settles — stays "in flight"
    });
    const { result } = renderHook(useCombined, { wrapper });
    await flush();
    const firstSignal = callsTo('/sales/overview/')[0][1].signal;
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      result.current.updateFilters({ quickPreset: 'Today' });
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    const calls = callsTo('/sales/overview/');
    expect(calls.length).toBe(2);
    expect(firstSignal.aborted).toBe(true); // superseded request canceled
    expect(calls[1][1].signal.aborted).toBe(false); // fresh request alive
  });
});
