# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Django)
```bash
cd backend
python3 manage.py runserver 8002          # Dev server
python3 manage.py run_all_pipelines       # Incremental ETL sync
python3 manage.py run_all_pipelines --full # Full refresh (deletes + rebuilds all report tables)
python3 manage.py run_inventory_pipeline   # Sales, purchases, inventory only
python3 manage.py run_financial_pipeline   # Journal entries, GST, TDS only
python3 manage.py migrate --run-syncdb     # Apply migrations
bash start.sh                              # Migrate + full pipeline + start server on 8002
```

### Frontend (React + Vite)
```bash
cd frontend
npm run dev        # Vite dev server with HMR (proxies /api to localhost:8002)
npm run build      # Production build (output: frontend/dist/)
```

Build from repo root: `npx vite build` (runs from frontend context via workspace).

## Architecture

**Two-layer app**: Django REST backend (port 8002) + React/Vite frontend.

### Backend

- **`source_models/`** — Read-only Django models (`managed=False`) proxying upstream tables from a shared SQLite database at `../healthcare-inventory-management/backend/db.sqlite3`. These are the source of truth.
- **`reports/models.py`** — 7 denormalized wide reporting tables (`ReportSales`, `ReportSalesReturns`, `ReportPurchases`, `ReportInventory`, `ReportFinancial`, `ReportGST`, `ReportTDS`). No foreign keys, no JOINs at query time.
- **`pipeline/`** — ETL that reads from `source_models` and writes to `reports`. Two pipeline classes: `InventoryPipeline` (sales, purchases, inventory snapshots) and `FinancialPipeline` (journal entries, GST, TDS). Incremental via `PipelineLog.last_synced_id`. Batch size 500.
- **`api/`** — Function-based DRF views grouped by domain: `executive.py`, `sales.py`, `financial.py`, `inventory.py`, `procurement.py`, `compliance.py`, `working_capital.py`, `location.py`, `product.py`, `dispatch.py`, `loyalty.py`, `audit.py`, `pipeline_api.py`. All use `@api_view` + `@permission_classes([AllowAny])`.
- **`api/helpers.py`** — `parse_filters(request)` extracts common query params (`start_date`, `end_date`, `location_ids`, `category`, `channel`, `payment_method`). `apply_common_filters(qs, filters)` and `apply_financial_filters(qs, filters)` apply them to querysets. All detail endpoints should call `.values()` on the queryset **before** passing to `PageNumberPagination.paginate_queryset()`.

### Frontend

- **`src/app/App.tsx`** — Wraps router in `FilterProvider` > `CrossFilterProvider`.
- **`src/app/routes.tsx`** — 13 dashboard pages + detail data pages under `Layout`.
- **`src/app/contexts/FilterContext.tsx`** — Global filter state (date range, locations, categories, channels, payment methods). `updateFilters()` auto-computes date range from quick presets.
- **`src/app/contexts/CrossFilterContext.tsx`** — Chart-level cross-filtering. `toggleCrossFilter()` selects/deselects; `isFiltered(dimension, value)` checks if a value passes.
- **`src/app/hooks/useApiData.ts`** — Generic data fetching hook. Auto-includes global filter params via `filtersToParams()`. Use `{ noFilters: true }` to skip. Refetches when filters change.
- **`src/app/services/transforms.ts`** — Functions to reshape API responses for recharts (`toMonthlyTrend`, `toChannelMix`, `toCategoryPie`, `toTopProducts`, etc.).
- **`src/app/services/api.ts`** — Axios instance with baseURL `/api`, JWT interceptor from localStorage.
- **`src/app/components/FilterPanel.tsx`** — Fetches filter options dynamically from `/api/executive/filter-options/` (locations, categories, channels, payment methods from actual DB data).

### Interaction Pattern (Charts)

- **Left-click** on chart elements = cross-filter toggle (select/deselect, visual highlight via recharts `Cell` with `fill` color change)
- **Right-click** on charts = context menu with drill-through navigation to detail data pages
- **Inventory Alerts / Pending Actions** = direct left-click drill-through (action items, not chart data)
- Recharts `Cell` requires explicit `fill` prop to change visually; `opacity` alone does not work reliably.
- Use `ComposedChart` (not `BarChart`) when mixing `Bar` + `Line` in the same chart.

### Data Flow

Upstream DB → `source_models` (read-only) → Pipeline ETL → `reports` tables → API views (aggregations) → Frontend (recharts visualizations)

Filter options are fetched dynamically from the DB via `/api/executive/filter-options/`, not hardcoded.

## Key Conventions

- Currency formatting: `formatIndianCurrencyAbbreviated()` from `utils/formatters.ts` (Lakhs/Crores).
- Indian financial year: April 1 start. FY logic in `FilterContext.tsx` and `settings.py` (`ACCOUNTING_FY_START_MONTH = 4`).
- API pagination: DRF `PageNumberPagination` with page size 50. Response shape: `{ count, next, previous, results }`.
- Detail endpoints must call `.values(...)` on the queryset before `paginate_queryset()` — not after (DRF returns a list, not a queryset).
