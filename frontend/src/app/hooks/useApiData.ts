import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useFilters, GlobalFilters, PageFilters } from '../contexts/FilterContext';

/** Convert GlobalFilters to API query params. */
function filtersToParams(filters: GlobalFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.dateRange.start) params.start_date = filters.dateRange.start;
  if (filters.dateRange.end) params.end_date = filters.dateRange.end;
  if (filters.locations.length) params.location_ids = filters.locations.join(',');
  if (filters.salesChannel.length) params.channel = filters.salesChannel.join(',');
  if (filters.paymentMethod.length) params.payment_method = filters.paymentMethod.join(',');
  if (filters.productCategories.length) params.category = filters.productCategories.join(',');
  return params;
}

/** Page filters of the current route, flattened to CSV query params.
 *  Dimension ids are already backend param names (DRILLTHROUGH_DESIGN §1). */
function pageFiltersToParams(pageFilters: PageFilters, route: string): Record<string, string> {
  const params: Record<string, string> = {};
  const forRoute = pageFilters[route] || {};
  for (const [dim, values] of Object.entries(forRoute)) {
    if (values.length) params[dim] = values.join(',');
  }
  return params;
}

interface UseApiDataOptions {
  /** Skip automatic filter-based params */
  noFilters?: boolean;
  /** Extra query params */
  params?: Record<string, string | number>;
  /** Don't fetch on mount (manual trigger) */
  manual?: boolean;
}

/** Refetch debounce for filter changes (slider drags emit many ticks). */
const DEBOUNCE_MS = 250;

/**
 * In-flight GET dedupe for `noFilters` consumers, keyed by endpoint+params.
 * Several chrome components mount together and request the same static
 * endpoint (TopBar + FilterSidebar + GlobalDateBar each need
 * /executive/filter-options/) — they share ONE wire request instead of
 * firing three. Entries are dropped as soon as the request settles, so a
 * later refetch() always issues a fresh request.
 */
const inflightNoFilters = new Map<string, Promise<{ data: unknown }>>();

/**
 * Generic hook to fetch data from a backend API endpoint.
 * Automatically includes global filter params + the current route's page
 * filters, and refetches (debounced) when they change. Stale responses are
 * discarded via request sequencing AND aborted via AbortController, so a
 * slider drag can never paint out-of-order data. Falls back to provided
 * `fallback` data on error so charts always render.
 *
 * `noFilters` consumers read filters via refs and never depend on them, so
 * filter/page-filter changes don't refetch static endpoints; concurrent
 * mounts of the same endpoint share one in-flight request (see above).
 */
export function useApiData<T>(
  endpoint: string,
  fallback: T,
  options: UseApiDataOptions = {}
) {
  const { filters, pageFilters } = useFilters();
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(!options.manual);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  // fetchData reads filters through refs; whether it *depends* on them is
  // decided below so noFilters consumers keep a stable callback.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const pageFiltersRef = useRef(pageFilters);
  pageFiltersRef.current = pageFilters;

  const paramsKey = JSON.stringify(options.params ?? null);

  const fetchData = useCallback(async () => {
    const seq = ++seqRef.current;

    setLoading(true);
    setError(null);
    try {
      const route = typeof window !== 'undefined' ? window.location.pathname : '';
      const params = {
        ...(options.noFilters ? {} : {
          ...filtersToParams(filtersRef.current),
          ...pageFiltersToParams(pageFiltersRef.current, route),
        }),
        ...options.params,
      };

      let res: { data: unknown };
      if (options.noFilters) {
        // Shared request: no per-consumer abort signal — one consumer
        // unmounting must not cancel the others. Staleness is still
        // handled by the seq guard below.
        const key = `${endpoint}|${paramsKey}`;
        let pending = inflightNoFilters.get(key);
        if (!pending) {
          pending = api.get(endpoint, { params });
          inflightNoFilters.set(key, pending);
          const clear = () => inflightNoFilters.delete(key);
          pending.then(clear, clear);
        }
        res = await pending;
      } else {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        res = await api.get(endpoint, { params, signal: controller.signal });
      }
      if (mountedRef.current && seq === seqRef.current) {
        setData(res.data as T);
      }
    } catch (err: any) {
      // Aborted requests are superseded, not failures.
      const aborted = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError';
      if (mountedRef.current && seq === seqRef.current && !aborted) {
        const msg = err.response?.data?.detail || err.message || 'API error';
        setError(msg);
        // Keep fallback data so UI still renders
      }
    } finally {
      if (mountedRef.current && seq === seqRef.current) {
        setLoading(false);
      }
    }
  }, [
    endpoint,
    // Static endpoints must NOT refetch on filter/page-filter changes.
    options.noFilters ? null : filters,
    options.noFilters ? null : pageFilters,
    options.noFilters,
    paramsKey,
  ]);

  const firstRunRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (options.manual) {
      return () => { mountedRef.current = false; };
    }
    if (firstRunRef.current) {
      // First fetch fires immediately so pages don't blank-wait the debounce.
      firstRunRef.current = false;
      fetchData();
      return () => { mountedRef.current = false; };
    }
    const timer = setTimeout(fetchData, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
    };
  }, [fetchData, options.manual]);

  // Final unmount: cancel any in-flight request.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return { data, loading, error, refetch: fetchData };
}
