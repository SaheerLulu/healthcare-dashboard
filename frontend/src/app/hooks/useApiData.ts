import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useFilters, GlobalFilters } from '../contexts/FilterContext';

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

interface UseApiDataOptions {
  /** Skip automatic filter-based params */
  noFilters?: boolean;
  /** Extra query params */
  params?: Record<string, string | number>;
  /** Don't fetch on mount (manual trigger) */
  manual?: boolean;
}

/**
 * Generic hook to fetch data from a backend API endpoint.
 * Automatically includes global filter params and refetches when filters change.
 * Falls back to provided `fallback` data on error so charts always render.
 */
export function useApiData<T>(
  endpoint: string,
  fallback: T,
  options: UseApiDataOptions = {}
) {
  const { filters } = useFilters();
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(!options.manual);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(options.noFilters ? {} : filtersToParams(filters)),
        ...options.params,
      };
      const res = await api.get(endpoint, { params });
      if (mountedRef.current) {
        setData(res.data);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        const msg = err.response?.data?.detail || err.message || 'API error';
        setError(msg);
        // Keep fallback data so UI still renders
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, filters, options.noFilters, JSON.stringify(options.params)]);

  useEffect(() => {
    mountedRef.current = true;
    if (!options.manual) {
      fetchData();
    }
    return () => { mountedRef.current = false; };
  }, [fetchData, options.manual]);

  return { data, loading, error, refetch: fetchData };
}
