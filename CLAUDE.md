# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Django, port 8002)
```bash
cd backend
python3 manage.py runserver 8002          # Dev server
python3 manage.py run_all_pipelines       # Incremental ETL sync
python3 manage.py run_all_pipelines --full # Full refresh (deletes + rebuilds all report tables)
python3 manage.py run_inventory_pipeline   # Sales, purchases, inventory only
python3 manage.py run_financial_pipeline   # Journal entries, GST, TDS only
python3 manage.py migrate --run-syncdb     # Apply migrations
python3 manage.py test api.tests           # Run all backend unit tests
python3 manage.py test api.tests.test_helpers.GrowthPctTests  # Single test class
bash start.sh                              # Migrate + full pipeline + start server on 8002
```

### Frontend (React + Vite)
```bash
cd frontend
npm install                                # Once
npm run dev                                # Vite dev server with HMR (proxies /api to localhost:8002)
npm run build                              # Production build (output: frontend/dist/)
npm run test                               # Vitest one-shot
npm run test:watch                         # Vitest watch mode
npx vitest run path/to/file.test.tsx       # Single test file
```

Build from repo root: `npx vite build` (runs from frontend context via workspace).

### Tooling scripts
```bash
OP_API_KEY=<token> python3 scripts/build_rtm.py   # Regenerate docs/RTM.{csv,md}
PERF_RUNS=10 python3 scripts/perf_baseline.py     # Measure every endpoint, write docs/PERF_BASELINE.md
```

### Containerised stack
```bash
cp .env.example .env                       # Then fill in DJANGO_SECRET_KEY + UPSTREAM_DB_PATH
docker compose up -d                       # backend (:8002) + frontend nginx (:8082) + one-shot pipeline
docker compose logs -f backend             # Tail backend logs
```

## Architecture

Two-layer app: Django REST backend (port 8002) + React/Vite frontend.

### Data Flow
Upstream SQLite (`../healthcare-inventory-management/backend/db.sqlite3`) → `source_models` (read-only proxies) → `pipeline` ETL → `reports` wide tables → `api` views (aggregations) → React + recharts. Filter options are fetched dynamically from `/api/executive/filter-options/`, never hardcoded.

### Backend (`backend/`)

- **`source_models/models.py`** — Read-only Django models (`managed=False`) proxying upstream tables. Source of truth, never written to from this app.
- **`reports/models.py`** — 7 denormalised wide reporting tables (`ReportSales`, `ReportSalesReturns`, `ReportPurchases`, `ReportInventory`, `ReportFinancial`, `ReportGST`, `ReportTDS`) plus `DashboardPref` (per-user prefs) and `AuditLog` (mutation audit trail). No FKs, no JOINs at query time.
- **`pipeline/`** — ETL writing into `reports`. Two classes: `InventoryPipeline` (sales, purchases, inventory snapshots) and `FinancialPipeline` (journal entries, GST, TDS). Incremental via `PipelineLog.last_synced_id`, batch size 500.
- **`api/`** — Function-based DRF views grouped by domain: `executive.py`, `sales.py`, `financial.py`, `inventory.py`, `procurement.py`, `compliance.py` (GST + TDS), `working_capital.py`, `location.py`, `product.py`, `dispatch.py`, `loyalty.py`, `audit.py`, `pipeline_api.py`, `health.py`, `prefs.py`, `reconcile.py`. All decorated `@api_view(...)` + `@permission_classes([DashboardPermission])`.
- **`api/permissions.py`** — `DashboardPermission` defaults to AllowAny, switches to IsAuthenticated when `DASHBOARD_REQUIRE_AUTH=1`. Single env-var flips the entire surface.
- **`api/middleware.py`** — Three middlewares wired in `settings.MIDDLEWARE`: `PerfTimingMiddleware` (logs `path · sql_count · sql_time · view_time` per request, warns when view_ms > 800), `CacheControlMiddleware` (5-min `Cache-Control` on `/api/executive/filter-options/`), `AuditMiddleware` (writes one `AuditLog` row per non-GET `/api/*` request).
- **`api/helpers.py`** — `parse_filters(request)` extracts the standard filter contract (`start_date`, `end_date`, `location_ids`, `category`, `channel`, `payment_method`). `apply_common_filters(qs, filters)` and `apply_financial_filters(qs, filters)` apply them. Detail endpoints must call `.values(...)` on the queryset **before** `PageNumberPagination.paginate_queryset()` — DRF returns a list, not a queryset.
- **`api/health.py`** — `GET /api/health/` (DB-reachable liveness, returns 503 on failure) and `GET /api/health/data/` (per-pipeline freshness with 15-min lag threshold).
- **`api/reconcile.py`** — Compliance reconciliation endpoints. Internal `_compute_*` helpers feed both the per-metric endpoints and `/api/reconcile/summary/`; never call an `@api_view` function from another `@api_view` (DRF Request vs HttpRequest mismatch).

### Frontend (`frontend/src/app/`)

- **`App.tsx`** — Wraps router in `FilterProvider` > `CrossFilterProvider`.
- **`routes.tsx`** — 13 dashboard pages + detail pages under `Layout`, plus `/pipeline` (Pipeline Management) and `/settings`.
- **`contexts/FilterContext.tsx`** — Global filter state (date range, locations, categories, channels, payment methods). `updateFilters()` auto-computes the date range from quick presets.
- **`contexts/CrossFilterContext.tsx`** — Chart-level cross-filtering. `toggleCrossFilter()` selects/deselects; `isFiltered(dimension, value)` returns true when the value passes the active filter (or no filter is set on that dimension).
- **`hooks/useApiData.ts`** — Generic data fetching hook. Auto-includes global filter params via `filtersToParams()`. Use `{ noFilters: true }` to skip. Refetches when filters change.
- **`hooks/useDashboardPrefs.ts`** — Reads `/api/prefs/`, returns `{ prefs, updatePrefs, loaded }`. `updatePrefs` is optimistic + best-effort.
- **`services/transforms.ts`** — Functions to reshape API responses for recharts (`toMonthlyTrend`, `toChannelMix`, `toCategoryPie`, `toTopProducts`, `toPaymentMix`).
- **`services/api.ts`** — Axios instance with baseURL `/api`, JWT interceptor pulling `access_token` from `localStorage`.
- **`components/FilterPanel.tsx`** — Fetches filter options dynamically from `/api/executive/filter-options/`.

### Interaction Pattern (Charts)

- **Left-click** on chart elements = cross-filter toggle (visual highlight via recharts `Cell` with `fill` change).
- **Right-click** on charts = context menu with drill-through to `/detail/*` pages.
- **Inventory Alerts / Pending Actions** = direct left-click drill-through (action items, not chart data).
- Recharts `Cell` requires explicit `fill` to change visually; `opacity` alone is unreliable.
- Use `ComposedChart` (not `BarChart`) when mixing `Bar` + `Line` in the same chart.

## Key Conventions

- **Currency:** `formatIndianCurrencyAbbreviated()` from `utils/formatters.ts` (Lakhs/Crores). Negative-sign preservation is part of the contract — see `formatters.test.ts`.
- **Indian fiscal year:** April 1 start. FY logic in `FilterContext.tsx` and `settings.py` (`ACCOUNTING_FY_START_MONTH = 4`).
- **API pagination:** DRF `PageNumberPagination`, page size 50. Response shape: `{ count, next, previous, results }`.
- **Permissions:** Every new view goes through `DashboardPermission`, never raw `AllowAny`. The default in `settings.REST_FRAMEWORK` already wires it.
- **Source-table resilience:** Endpoints that touch `source_models` must catch `OperationalError`/`ProgrammingError` and return empty data — the upstream DB can be unreachable without taking the dashboard down. See `api/dispatch.py::_entries` for the pattern.
- **Gross profit ≠ purchases:** Use `Sum('gross_margin')` from `ReportSales` (per-line `line_total − line_cost`). **Never** subtract total purchases as COGS — that's cash flow, not cost-of-goods-sold for revenue earned in the period. See `api/executive.py::kpis` for the documented rationale.
- **`growth_pct`** clamps at ±500% to suppress garbage percentages from tiny prior-period bases.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | dev fallback (warns) | JWT signing — must mirror upstream inventory app for SSO |
| `DJANGO_DEBUG` | `True` | Disables in production |
| `DJANGO_DB_PATH` | `../healthcare-inventory-management/backend/db.sqlite3` | Path to the shared SQLite |
| `DASHBOARD_REQUIRE_AUTH` | `False` | Flip to `1` to require JWT on every endpoint (closes risk R-09) |
| `DASHBOARD_PERF_LOG` | off in non-DEBUG | Enables perf middleware logs in production |
| `GUNICORN_WORKERS` | `3` | Used by the Docker entrypoint |

## Project management

OpenProject backlog at `https://projects.biloop.ai` project `healthcare-dashboard` (id 11). Epics DASH-E00 (PM/BA foundation) through DASH-E20 with ~95 user stories and ~180 child test cases. `docs/RTM.{csv,md}` is the live traceability matrix. Feature branches follow `feat/dash-eXX-fYY-<slug>`; commits reference the WP code in the subject. Integration branch is `develop` (cut from `main`); `main` is promoted from `develop` at release time.
