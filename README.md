# healthcare-dashboard

Analytics layer over the Seefmed inventory and accounting apps. Reads
their shared SQLite, ETLs into seven denormalised reporting tables, and
serves 13 dashboards (executive, sales, financial, inventory,
procurement, GST, TDS, working capital, location, product, dispatch,
loyalty, audit) with cross-filter and drill-through.

## Running the code

### Frontend (Vite, port 5173 by default)

```bash
cd frontend
npm install
npm run dev
```

### Backend (Django, port 8002)

```bash
cd backend
python3 -m pip install -r requirements.txt   # if not already installed
python3 manage.py migrate --run-syncdb
python3 manage.py run_all_pipelines --full   # one-time hydration
python3 manage.py runserver 8002
```

`bash backend/start.sh` runs migrate + a full pipeline hydration + the dev
server in one shot.

## Architecture (one-screen summary)

Upstream DB (`../healthcare-inventory-management/backend/db.sqlite3`)
→ `backend/source_models/` (Django proxy models, `managed=False`)
→ `backend/pipeline/` (ETL: `InventoryPipeline` + `FinancialPipeline`,
   incremental via `PipelineLog.last_synced_id`, batch size 500)
→ `backend/reports/` (7 wide reporting tables, no FKs, no JOINs at query
   time)
→ `backend/api/` (function-based DRF views, one module per domain)
→ `frontend/src/app/` (React + Vite + recharts + tailwind, with
   `FilterContext` + `CrossFilterContext` for global and chart-level
   filters).

For a deeper architectural dive see `CLAUDE.md`.

## Project management & PM/BA artifacts

The product backlog, user stories, test cases and PM/BA cards live in
OpenProject:

- **Project:** `healthcare-dashboard` (id `11`) at
  https://projects.biloop.ai
- **Epics:** DASH-E00 (PM/BA Foundation) plus DASH-E01..E20 (feature
  epics).
- **PM artifacts** (DASH-E00-A01 through A12): personas, glossary, NFRs
  (perf, security, reliability, usability, compliance), risks,
  dependencies, DoR/DoD, RTM, assumptions/constraints/out-of-scope.
- **User stories:** ~95 stories grouped under 36 features.
- **Test cases:** ~180 concrete TCs grouped under 32 [TEST] groupings,
  each TC carrying its own UI path, API endpoint, payload and expected
  response.

### Requirements Traceability Matrix

`docs/RTM.csv` and `docs/RTM.md` are generated from OpenProject by:

```bash
OP_API_KEY=<your-token> python3 scripts/build_rtm.py
```

The matrix lists every user story, the feature and epic it belongs to,
its current status, the linked test case ids, the code paths that
implement it, and a coverage-gap flag for any story without test cases.

Each row of the matrix is a single line of the daily PM/BA conversation
— if a story moves to `Closed`, the matrix is what proves it had tests
and code behind it.

## Branch / PR conventions

- Feature branches are named `feat/dash-eXX-fYY-<slug>` so they line up
  with the work-package code in OpenProject.
- Commit messages reference the work-package code (e.g.
  `feat(api): perf-timing middleware (DASH-E20-F01, F02)`).
- The PR description links to the OpenProject work package(s) the PR
  delivers; once merged, the work package's *Implementation log* section
  is updated with the merge commit hash.

## License / attribution

See `ATTRIBUTIONS.md` and `LICENSE` (if present). © Biloop Software
Design & Programming W.L.L.
