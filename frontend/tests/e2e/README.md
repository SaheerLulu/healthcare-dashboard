# Playwright E2E suite

End-to-end tests for the dashboard UI and the new API contracts. Run
against a real Django backend + Vite dev server (Playwright's
`webServer` config auto-starts both).

## Layout

| File | Tests | What it covers |
|---|---:|---|
| `dashboard-pages.spec.ts` | 33 | Render-smoke for every dashboard page (17) and detail page (14) — heading present, no 5xx, no console error. Plus 2 layout shell checks (footer last-sync, skip-to-main link). |
| `filters.spec.ts` | 3 | Sidebar collapse/expand with `aria-hidden`, quick-preset triggers KPI refetch, filters carry across pages. |
| `cross-filter.spec.ts` | 2 | Right-click chart → drill-through context menu, KPI tile click navigates to `/detail/*`. |
| `pipeline.spec.ts` | 4 | `/pipeline` renders status cards + history; Sync Now reachable; Full Refresh REPLACE confirm dialog gates the destructive action; `/settings` links to `/pipeline`. |
| `audit.spec.ts` | 3 | Reconciliation tile renders the three metrics and an overall verdict pill; data-quality bars present. |
| `preferences.spec.ts` | 2 | Sidebar collapse persists across reload; quick preset persists across reload (round-trips through `/api/prefs/`). |
| `accessibility.spec.ts` | 4 | Skip-to-main is the first tab stop; every chart card has `role=region` with a name; KPI buttons carry aria-labels; tab focus lands on a focusable element. |
| `api-contracts.spec.ts` | 11 | Direct hits to `/api/health/`, `/api/health/data/`, days-of-cover, runway, radar, substitutability, RFM, anomalies, reconcile/summary, prefs (GET + PATCH round-trip). |

**Total:** 62 tests across 8 files.

## Running

### One-time setup (system dependencies)

Playwright bundles the Chromium binary itself, but needs a few host
libraries (libnss3, libnspr4, libasound2). They are installed with:

```bash
cd frontend
sudo npx playwright install-deps    # apt-get under the hood
npx playwright install chromium     # already pulled by `npm install`, idempotent
```

If you can't sudo, the **API-contract tests** (11 of the 62) still
work — they hit the backend directly via Playwright's request fixture
without launching a browser:

```bash
cd frontend
npx playwright test api-contracts.spec.ts --reporter=list
```

### All tests

```bash
cd frontend
npm run test:e2e
```

The config auto-starts the Django backend on `:8002` and the Vite dev
server on `:5173`. If either is already running it reuses it
(`reuseExistingServer: true` outside CI).

### Watching one test fail

```bash
npm run test:e2e:headed   # full browser, visible
npm run test:e2e:ui       # Playwright UI mode
```

### Reports

After a run:
- `frontend/playwright-report/` — HTML report (open `index.html`)
- `frontend/test-results/` — videos / screenshots / traces (only on
  failure or first-retry, see `playwright.config.ts`)

Both directories are gitignored.

## CI notes

`workers: 1` and `fullyParallel: false` are set because the test
backend is the same SQLite file the dev DB uses — concurrent writes
to `prefs/` would race. Once the prod stack moves to PostgreSQL via
`docker-compose.prod.yml`, set `workers: 4` and reset `fullyParallel`
in CI to cut wall-clock by ~3×.
