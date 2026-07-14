import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import api from '../services/api';
import { useFilters } from '../contexts/FilterContext';
import { DrillContext, DrillFilter, buildDrillSearch, parseDrillSearch, drillFiltersToParams } from '../utils/drill';
import { CsvColumn, downloadCsv } from '../utils/csv';

const PAGE_SIZE = 50;
/** Server page_size cap (DRILLTHROUGH_DESIGN) — fetchAll loops in chunks of this. */
const CHUNK = 500;
/** Hard safety stop for fetch-everything loops. */
const FETCH_ALL_MAX = 100_000;

interface DetailQueryState {
  rows: any[];
  count: number;
  page: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  ordering: string;
  drill: DrillContext | null;
  setPage: (page: number) => void;
  setOrdering: (ordering: string) => void;
  removeDrillFilter: (id: string) => void;
  clearDrillFilters: () => void;
  exportCsv: (filename: string, columns: CsvColumn[]) => Promise<void>;
  /** Fetch every row of the current query (all pages). */
  fetchAll: () => Promise<any[]>;
  /** Changes whenever filters/ordering change — cache key for fetchAll results. */
  queryKey: string;
}

/**
 * Data engine for detail (drill-through target) pages:
 * - merges global filters + drill filters (URL `df_*` params win over
 *   router state, so refreshed/shared links keep their context)
 * - real server-side pagination + whitelisted ordering
 * - functional chip removal (rewrites the URL, refetches)
 * - CSV export of the CURRENT query — all pages, fetched in 500-row chunks
 */
export function useDetailQuery(endpoint: string, defaultOrdering: string): DetailQueryState {
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, pageFilters } = useFilters();

  const drillFromUrl = parseDrillSearch(location.search);
  const drillFromState = (location.state as any)?.drillThrough as DrillContext | undefined;
  const drill: DrillContext | null = drillFromUrl
    || (drillFromState?.filters?.length || drillFromState?.from ? drillFromState! : null);

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [ordering, setOrderingState] = useState(defaultOrdering);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const drillParams = useMemo(
    () => drillFiltersToParams(drill?.filters || []),
    [JSON.stringify(drill?.filters || [])]
  );

  const baseParams = useMemo(() => {
    const route = location.pathname;
    const params: Record<string, string> = {};
    if (filters.dateRange.start) params.start_date = filters.dateRange.start;
    if (filters.dateRange.end) params.end_date = filters.dateRange.end;
    if (filters.locations.length) params.location_ids = filters.locations.join(',');
    if (filters.salesChannel.length) params.channel = filters.salesChannel.join(',');
    if (filters.paymentMethod.length) params.payment_method = filters.paymentMethod.join(',');
    if (filters.productCategories.length) params.category = filters.productCategories.join(',');
    for (const [dim, values] of Object.entries(pageFilters[route] || {})) {
      if (values.length) params[dim] = values.join(',');
    }
    // Drill params last: an explicit drill always wins over page filters.
    Object.assign(params, drillParams);
    return params;
  }, [filters, pageFilters, location.pathname, drillParams]);

  useEffect(() => {
    const seq = ++seqRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api.get(endpoint, {
      params: { ...baseParams, page, page_size: PAGE_SIZE, ordering },
      signal: controller.signal,
    })
      .then(res => {
        if (seq !== seqRef.current) return;
        const data = res.data;
        if (Array.isArray(data)) {
          setRows(data);
          setCount(data.length);
        } else {
          setRows(data?.results || []);
          setCount(Number(data?.count) || (data?.results || []).length);
        }
      })
      .catch(err => {
        const aborted = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
        if (seq !== seqRef.current || aborted) return;
        setError(err.response?.data?.detail || err.message || 'API error');
        setRows([]);
        setCount(0);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, JSON.stringify(baseParams), page, ordering]);

  // Filter or ordering changes restart at page 1.
  useEffect(() => { setPage(1); }, [JSON.stringify(baseParams), ordering]);

  const rewriteDrill = (newFilters: DrillFilter[]) => {
    const from = drill?.from || 'Dashboard';
    navigate(
      location.pathname + (newFilters.length ? buildDrillSearch(newFilters, from) : ''),
      { replace: true, state: newFilters.length ? { drillThrough: { from, filters: newFilters } } : undefined }
    );
  };

  const removeDrillFilter = (id: string) => {
    rewriteDrill((drill?.filters || []).filter(f => f.id !== id));
  };

  const clearDrillFilters = () => rewriteDrill([]);

  const setOrdering = (column: string) => {
    setOrderingState(prev => (prev === column ? `-${column}` : column));
  };

  const fetchAll = async (): Promise<any[]> => {
    const all: any[] = [];
    for (let p = 1; all.length < FETCH_ALL_MAX; p++) {
      const res = await api.get(endpoint, {
        params: { ...baseParams, page: p, page_size: CHUNK, ordering },
      });
      const data = res.data;
      if (Array.isArray(data)) {
        all.push(...data);
        break; // non-paginated endpoint — one shot has everything
      }
      const results = data?.results || [];
      all.push(...results);
      const total = Number(data?.count) || all.length;
      if (!data?.next || all.length >= total || results.length === 0) break;
    }
    return all;
  };

  const exportCsv = async (filename: string, columns: CsvColumn[]) => {
    downloadCsv(filename, columns, await fetchAll());
  };

  const queryKey = `${endpoint}|${JSON.stringify(baseParams)}|${ordering}`;

  return {
    rows, count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    loading, error, ordering, drill,
    setPage, setOrdering, removeDrillFilter, clearDrillFilters,
    exportCsv, fetchAll, queryKey,
  };
}
