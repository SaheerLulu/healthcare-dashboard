/**
 * useDashboardPrefs — DASH-E20-F02-US02.
 *
 * Reads the per-user dashboard prefs from /api/prefs/ on mount and
 * exposes a setter that PATCHes back to the same endpoint, merging
 * locally so the caller's view updates synchronously.
 *
 * The hook is intentionally simple — single object, no useReducer —
 * because the prefs blob has fewer than ten keys and writes are rare.
 */
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

export interface DashboardPrefs {
  default_quick_preset?: string;
  sidebar_open?: boolean;
  theme?: 'light' | 'dark' | 'system';
  default_location_id?: number | null;
  chart_density?: 'compact' | 'cosy' | 'comfortable';
  [key: string]: unknown;
}

export const useDashboardPrefs = () => {
  const [prefs, setPrefs] = useState<DashboardPrefs>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/prefs/')
      .then((res) => {
        if (cancelled) return;
        setPrefs(res.data?.prefs || {});
      })
      .catch(() => {
        // Endpoint missing or unauth — fall through to in-memory defaults.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<DashboardPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
    try {
      const res = await api.patch('/prefs/', patch);
      // Trust the server's normalised view (it may have dropped null keys).
      if (res.data?.prefs) setPrefs(res.data.prefs);
    } catch {
      // Best-effort; keep the optimistic update on the client.
    }
  }, []);

  return { prefs, updatePrefs, loaded };
};
