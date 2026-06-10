# Drill-Through Everywhere — Design Contract (2026-06)

Goal: every visual on every page lets the user (1) right-click → context menu, (2) see the
data table behind the visual, (3) drill through to filtered row-level records, and
(4) read how a number is computed ("provenance"). Filters become real and page-aware; the
date filter becomes a global range slider defaulting to a rolling month.

This document is the single source of truth for the param vocabulary and component
contracts. All page-wiring work MUST follow it.

## 1. Dimension/param vocabulary (frontend drill id == API query param)

| dimension id (drill filter `id`) | applies to | backing column |
|---|---|---|
| `month` | sales, returns, purchases, financial, gst, tds | `sale_month` / `return_month` / `purchase_month` / `entry_month` / `period` / `transaction_month` (value `YYYY-MM`; charts using `Mon YY` labels must pass the raw period) |
| `category` | sales, returns, purchases, inventory, product | `product_category` |
| `channel` | sales | `channel` (values `POS`, `B2B`) |
| `payment_method` | sales | `payment_method` |
| `product_id` / `product_name` | sales, purchases, inventory, product | `product_id` / `product_name` |
| `molecule` | product, sales | `product_molecule` |
| `company` | product, sales, inventory | `product_company` |
| `supplier_id` / `supplier_name` | purchases, gst(rcm) | `supplier_id` / `supplier_name` |
| `customer_id` / `customer_name` | sales, returns, loyalty | `customer_id` / `customer_name` |
| `customer_type` | sales, returns, loyalty (tiers ARE customer_type) | `customer_type` |
| `doctor_id` / `doctor_name` | sales | `doctor_id` / `doctor_name` |
| `speciality` | sales | `doctor_specialization` |
| `invoice_no` | sales, purchases (`bill_no`), gst | `invoice_no` / `bill_no` |
| `batch_no` | inventory, returns, purchases | `batch_no` |
| `state` | purchases (PO state) | `state` |
| `is_return` | purchases | `is_return` (`true`/`false`) |
| `voucher_type` | financial | `voucher_type` |
| `account_type` | financial | `account_type` (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE) |
| `account_subtype` | financial | `account_subtype` |
| `account_name` | financial | `account_name` |
| `party_type` | financial | `party_type` (Customer/Supplier) |
| `gst_rate` | gst | `gst_rate` |
| `invoice_type` | gst | `invoice_type` |
| `filing_status` | gst | `filing_status` |
| `source_table` | gst | `source_table` (gstr1/gstr3b/gstr2b/itc/rcm) |
| `section` | tds | `section` |
| `status` | tds, dispatch, returns | `status` |
| `reason` | returns | `reason` |
| `return_type` | returns | `return_type` |
| `expiry_status` | inventory | `expiry_status` (ok/warning_90/critical_30/expired) |
| `expiry_bucket` | inventory | derived from `days_to_expiry`: `expired` / `d0_30` / `d31_60` / `d61_90` / `d90_plus` |
| `movement_status` | inventory | `movement_status` (fast/medium/slow/dead) |
| `abc_class` | inventory | `abc_class` (A/B/C) |
| `ved_class` | inventory | `product_ved_class` (V/E/D) |
| `reorder_needed` | inventory | `reorder_needed` (`true`) |
| `courier_partner` | dispatch | `courier_partner` |
| `location_ids` | all | `location_id` (CSV, existing) |

Plus table controls accepted by all `*/detail/` endpoints: `page`, `page_size` (cap 500 —
the CSV export path requests exactly this cap; change both together),
`ordering` (whitelisted column, `-` prefix = desc).

Multi-value: CSV (`category=A,B`), same as existing convention. Backend
`helpers.parse_filters` is the single parser; per-module appliers map dimension → column.

## 2. Drill-through navigation

`navigate(target + '?' + qs, { state: { drillThrough: { from, filters } } })` where `qs`
encodes each drill filter as `df_<id>=<value>` plus `from=<page name>`. Detail pages parse
BOTH the URL (refresh/share-safe) and state. URL wins. Each `df_*` param is sent to the
detail endpoint as `<id>=<value>` after the `df_` prefix is stripped.

## 3. Frontend shared components (frontend/src/app/)

- `utils/drill.ts` — `DrillFilter {id,label,value}`, `buildDrillSearch(filters, from)`,
  `parseDrillSearch(search)`.
- `hooks/useDrillThrough.ts` — page-level hook: `{ onChartContextMenu, contextMenu,
  drillTo(target, filters?) }`; renders one `<ContextMenu>`; replaces the copy-pasted
  per-page `contextMenu` state.
- `components/ChartCard.tsx` (v2) — new optional props:
  `data?: any[]` (current chart data), `columns?: {key,label,format?}[]`,
  `drillTarget?: string`, `drillFilters?: DrillFilter[] | (datum)=>DrillFilter[]`,
  `info?: { formula: string; source: string; notes?: string }` (provenance),
  `onDatumClick?` for cross-filter. ChartCard now OWNS: right-click context menu
  (when `drillTarget`), Show-Data-Table modal (when `data`), CSV download, fullscreen
  modal, ⓘ provenance popover. Header buttons are real.
- `components/DataTableModal.tsx` — modal: table of `data`×`columns`, CSV export,
  "View underlying records →" when `drillTarget`.
- `components/KPICard.tsx` — adds `info?` provenance popover (same shape).
- `components/DateRangeSlider.tsx` + `components/GlobalDateBar.tsx` — dual-thumb day
  slider over `[data_min, max(today, data_max)]`; draggable window; preset chips
  (7D / 1M / 3M / 6M / FY / All); mounted in `Layout` above the Outlet on every page.
  Default selection = last 30 days ending at `min(today, data_max)` ("rolling month",
  anchored to freshest data so a stale pipeline never renders an empty dashboard).
  Bounds come from `/executive/filter-options/` → `date_bounds {min,max}`.
  The old "Time & Period" section (preset pills, FY select, date inputs) is REMOVED from
  FilterPanel.
- `contexts/FilterContext.tsx` — default `quickPreset: 'Rolling Month'`; prefs key
  `default_quick_preset_v2` (legacy `default_quick_preset` values are ignored so the new
  default sticks); adds `pageFilters: Record<route, Record<dim, string[]>>` +
  `setPageFilter(route, dim, values)` + `clearPageFilters(route)`.
- `hooks/useApiData.ts` — adds: 250 ms debounce on filter-driven refetch,
  AbortController cancellation, monotonic request-id stale guard; merges the current
  route's `pageFilters` into params.
- `components/FilterSidebar.tsx` — page-filter registry per route with DATA-DRIVEN
  options (from extended `/executive/filter-options/`), writing through
  `setPageFilter`; checkbox multi-selects; live counts. Dead hardcoded lists removed.
- Detail framework: `hooks/useDetailQuery.ts` (drill params + global filters + server
  pagination/ordering + chip removal + CSV export of current query) and
  `components/DetailPage.tsx` (functional breadcrumb bar w/ removable chips, real
  Previous/Next/page numbers, server sort by column click, working Export CSV).

## 4. Provenance ("how is this achieved")

Every KPICard / ChartCard receives `info={{formula, source, notes}}` written inline in the
page file. Honesty rule: metrics that the backend estimates or models MUST say so in
`notes` (e.g. COGS uses `unit_price×0.7` when purchase rate missing; supplier on-time % is
modeled; procurement savings = 2% model; dispatch rows synthesized when register empty;
loyalty redemption synthesized; sale_hour synthesized for B2B).

## 5. Backend changes (backend/api/)

- `helpers.parse_filters` learns every param in §1 (CSV-aware, validated, silently drops
  bad input — never 500s). New `apply_dim_filters(qs, filters, mapping)` generic applier;
  each module declares its dimension→column mapping.
- ALL `*/detail/` endpoints honor their domain dimensions + `ordering` + `page_size`.
  Unbounded `/product/detail/` and `/loyalty/detail/` become paginated.
- Aggregate endpoints honor their domain page-filters too (charts respond to page
  filters): procurement gets `category/supplier_id/state`, financial gets
  `account_type/voucher_type/party_type`, gst gets `gst_rate/invoice_type/filing_status`,
  tds gets `section/status`, inventory aggregates get
  `expiry_status/movement_status/abc_class/ved_class`, sales gets
  `customer_id/customer_type/doctor_id/product_id`.
- `/executive/filter-options/` extended: `date_bounds {min,max}` (min/max over
  report_sales/report_purchases/report_financial) + per-domain option lists:
  `suppliers [{id,name}]`, `customer_types`, `doctors [{id,name}]`, `specialities`,
  `gst_rates`, `tds_sections`, `po_states`, `voucher_types`, `account_types`,
  `return_reasons`, `couriers`, `expiry_statuses`, `movement_statuses`, `abc_classes`.
  All data-driven distincts (no hardcoded vocab), 5-min HTTP cache retained.
- New `/sales/bills/` and `/procurement/bills/` invoice-level endpoints (group lines by
  invoice) so the Sales/Purchase Bills report pages drop their mock-data imports; line
  drill via existing detail endpoints + `invoice_no` param.

## 6. Pipeline hardening (backend/pipeline/)

- settings default DB path fixed to the real sibling
  (`healthcare-pharmacy/backend/db.sqlite3`); `DJANGO_DB_PATH` still wins.
- Financial pipeline excludes accounting `is_optional` / `is_memorandum` journal entries
  when those columns exist (column-presence check — older snapshots lack them).
- Each incremental run first RETRIES unresolved `PipelineError` source ids (and resolves
  queued ids whose source row vanished or no longer qualifies upstream); run status is
  `partial` when any record failed (no more always-success; `error` is reserved for
  whole-run crashes).
- `run_all_pipelines --resync-days N` re-pulls a trailing window (delete+reload by source
  id) to absorb upstream edits; `scheduled_pipeline` management command with an flock
  single-instance lock for host cron.
- Dispatch endpoints honor the date range when real dispatch rows exist.

## 7. Known intentional gaps

- Cross-filter (left-click) stays client-side visual-only; drill-through is the
  data-accurate path.
- Snapshot-based inventory endpoints remain date-insensitive; their cards must say so via
  `info.notes` ("snapshot as of <date>").
