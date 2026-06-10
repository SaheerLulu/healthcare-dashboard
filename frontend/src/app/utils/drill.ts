/**
 * Drill-through plumbing (docs/DRILLTHROUGH_DESIGN.md §2).
 *
 * A drill filter's `id` IS the backend query-param name. Navigation encodes
 * filters into the URL (`?df_<id>=<value>&from=<page>`) so a drill-through
 * link survives refresh and can be shared; router state carries the same
 * payload for instant access.
 */

export interface DrillFilter {
  /** Dimension id == API query param name (e.g. 'month', 'supplier_id'). */
  id: string;
  /** Human-readable chip label (e.g. 'Month: Mar 2026'). */
  label: string;
  value: string;
}

export interface DrillContext {
  from: string;
  filters: DrillFilter[];
}

const DF_PREFIX = 'df_';

export function buildDrillSearch(filters: DrillFilter[], from: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  for (const f of filters) {
    if (f.id && f.value !== undefined && f.value !== null && f.value !== '') {
      params.set(DF_PREFIX + f.id, String(f.value));
      // Preserve the label so chips render meaningfully after a refresh.
      params.set(`${DF_PREFIX}label_${f.id}`, f.label || `${f.id}: ${f.value}`);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function parseDrillSearch(search: string): DrillContext | null {
  const params = new URLSearchParams(search);
  const filters: DrillFilter[] = [];
  for (const [key, value] of params.entries()) {
    if (key.startsWith(DF_PREFIX) && !key.startsWith(`${DF_PREFIX}label_`)) {
      const id = key.slice(DF_PREFIX.length);
      filters.push({
        id,
        value,
        label: params.get(`${DF_PREFIX}label_${id}`) || `${id}: ${value}`,
      });
    }
  }
  const from = params.get('from') || '';
  if (!filters.length && !from) return null;
  return { from: from || 'Dashboard', filters };
}

/** Convert drill filters to API query params (id → value). */
export function drillFiltersToParams(filters: DrillFilter[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const f of filters) {
    if (f.id && f.value !== undefined && f.value !== '') params[f.id] = String(f.value);
  }
  return params;
}

/** YYYY-MM from a payload that may carry sale_month / period / month keys. */
export function monthOf(datum: any): string | undefined {
  const raw = datum?.sale_month || datum?.entry_month || datum?.purchase_month
    || datum?.return_month || datum?.period || datum?.month;
  if (typeof raw === 'string' && /^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
  return undefined;
}
