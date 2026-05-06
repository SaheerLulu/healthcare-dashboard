# Requirements Traceability Matrix — healthcare-dashboard

Generated from OpenProject `https://projects.biloop.ai` project `11` against the working tree at `/home/saheer/biloop/healthcare/healthcare-dashboard`. Re-run `python3 scripts/build_rtm.py` to refresh.

Total user stories: **97**
Stories with zero linked test cases (red): **0**

| Epic | Feature | Story | Status | TCs | Code refs | Gap |
|---|---|---|---|---:|---|---|
| DASH-E01 | DASH-E01-F01 | #789 DASH-E01-F01-US01 — Sign in with shared inventory JWT | Rejected | 5 | frontend/src/app/components/Layout.tsx; frontend/src/app/services/api.ts |  |
| DASH-E01 | DASH-E01-F01 | #790 DASH-E01-F01-US02 — Layout with top-bar and sidebar nav | Closed | 5 | frontend/src/app/components/Layout.tsx; frontend/src/app/services/api.ts |  |
| DASH-E01 | DASH-E01-F02 | #791 DASH-E01-F02-US01 — Settings page | In progress | 5 | frontend/src/app/pages/Settings.tsx |  |
| DASH-E02 | DASH-E02-F01 | #792 DASH-E02-F01-US01 — Filter Panel with date range | In progress | 5 | frontend/src/app/components/FilterPanel.tsx; frontend/src/app/components/FilterS |  |
| DASH-E02 | DASH-E02-F01 | #793 DASH-E02-F01-US02 — Multi-select location filter | In progress | 5 | frontend/src/app/components/FilterPanel.tsx; frontend/src/app/components/FilterS |  |
| DASH-E02 | DASH-E02-F01 | #794 DASH-E02-F01-US03 — Multi-select category, channel, payment-method filters | In progress | 5 | frontend/src/app/components/FilterPanel.tsx; frontend/src/app/components/FilterS |  |
| DASH-E02 | DASH-E02-F01 | #795 DASH-E02-F01-US04 — Filters auto-apply to all charts | In progress | 5 | frontend/src/app/components/FilterPanel.tsx; frontend/src/app/components/FilterS |  |
| DASH-E02 | DASH-E02-F01 | #796 DASH-E02-F01-US05 — Per-page opt-out via `noFilters: true` | In progress | 5 | frontend/src/app/components/FilterPanel.tsx; frontend/src/app/components/FilterS |  |
| DASH-E02 | DASH-E02-F02 | #797 DASH-E02-F02-US01 — Click chart segment to cross-filter | In progress | 5 | frontend/src/app/contexts/CrossFilterContext.tsx |  |
| DASH-E02 | DASH-E02-F02 | #798 DASH-E02-F02-US02 — Right-click context menu drill-through | In progress | 5 | frontend/src/app/contexts/CrossFilterContext.tsx |  |
| DASH-E03 | DASH-E03-F01 | #799 DASH-E03-F01-US01 — Read-only proxy models for source DB | In progress | 5 | backend/source_models/__init__.py; backend/source_models/models.py |  |
| DASH-E03 | DASH-E03-F02 | #800 DASH-E03-F02-US01 — 7 denormalised wide tables | In progress | 5 | backend/reports/models.py |  |
| DASH-E03 | DASH-E03-F03 | #801 DASH-E03-F03-US01 — `InventoryPipeline` builds sales/purchases/inventory tables  | In progress | 5 | backend/pipeline/financial_pipeline.py; backend/pipeline/inventory_pipeline.py;  |  |
| DASH-E03 | DASH-E03-F03 | #802 DASH-E03-F03-US02 — `FinancialPipeline` builds journal/GST/TDS tables | In progress | 5 | backend/pipeline/financial_pipeline.py; backend/pipeline/inventory_pipeline.py;  |  |
| DASH-E03 | DASH-E03-F03 | #803 DASH-E03-F03-US03 — Management commands | In progress | 5 | backend/pipeline/financial_pipeline.py; backend/pipeline/inventory_pipeline.py;  |  |
| DASH-E03 | DASH-E03-F03 | #804 DASH-E03-F03-US04 — Scheduled cron run every 5 min | In progress | 5 | backend/pipeline/financial_pipeline.py; backend/pipeline/inventory_pipeline.py;  |  |
| DASH-E04 | DASH-E04-F01 | #805 DASH-E04-F01-US01 — Revenue / Margin / Cash KPI tiles | In progress | 5 | backend/api/executive.py; frontend/src/app/pages/ExecutiveSummary.tsx |  |
| DASH-E04 | DASH-E04-F01 | #806 DASH-E04-F01-US02 — Indian currency abbreviation | In progress | 5 | backend/api/executive.py; frontend/src/app/pages/ExecutiveSummary.tsx |  |
| DASH-E04 | DASH-E04-F02 | #807 DASH-E04-F02-US01 — Revenue trend (last 12 months) | In progress | 5 | backend/api/executive.py; frontend/src/app/pages/ExecutiveSummary.tsx |  |
| DASH-E04 | DASH-E04-F02 | #808 DASH-E04-F02-US02 — Channel mix (B2C vs B2B vs Returns) | In progress | 5 | backend/api/executive.py; frontend/src/app/pages/ExecutiveSummary.tsx |  |
| DASH-E04 | DASH-E04-F02 | #809 DASH-E04-F02-US03 — Top 5 categories | In progress | 5 | backend/api/executive.py; frontend/src/app/pages/ExecutiveSummary.tsx |  |
| DASH-E04 | DASH-E04-F03 | #810 DASH-E04-F03-US01 — Pending Actions widget | In progress | 5 | backend/api/executive.py; frontend/src/app/pages/ExecutiveSummary.tsx |  |
| DASH-E05 | DASH-E05-F01 | #811 DASH-E05-F01-US01 — Sales KPI tiles | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E05 | DASH-E05-F02 | #812 DASH-E05-F02-US01 — Daily / weekly / monthly sales trend | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E05 | DASH-E05-F02 | #813 DASH-E05-F02-US02 — Top SKUs / categories / brands | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E05 | DASH-E05-F02 | #814 DASH-E05-F02-US03 — Sales by location | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E05 | DASH-E05-F02 | #815 DASH-E05-F02-US04 — Cashier / sales-rep performance | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E05 | DASH-E05-F02 | #816 DASH-E05-F02-US05 — Hour-of-day heatmap | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E05 | DASH-E05-F02 | #817 DASH-E05-F02-US06 — Tender mix (cash/UPI/card/credit) | In progress | 5 | backend/api/sales.py; frontend/src/app/pages/SalesCommandCenter.tsx |  |
| DASH-E06 | DASH-E06-F01 | #818 DASH-E06-F01-US01 — Period vs Period P&L | In progress | 5 | backend/api/financial.py; frontend/src/app/pages/FinancialDeepDive.tsx |  |
| DASH-E06 | DASH-E06-F02 | #819 DASH-E06-F02-US01 — Cash position chart | In progress | 5 | backend/api/financial.py; frontend/src/app/pages/FinancialDeepDive.tsx |  |
| DASH-E06 | DASH-E06-F02 | #820 DASH-E06-F02-US02 — Bank balances tile | In progress | 5 | backend/api/financial.py; frontend/src/app/pages/FinancialDeepDive.tsx |  |
| DASH-E06 | DASH-E06-F03 | #821 DASH-E06-F03-US01 — Gross margin by category / SKU | In progress | 5 | backend/api/financial.py; frontend/src/app/pages/FinancialDeepDive.tsx |  |
| DASH-E07 | DASH-E07-F01 | #822 DASH-E07-F01-US01 — Inventory KPIs | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E07 | DASH-E07-F01 | #823 DASH-E07-F01-US02 — Stock by location | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E07 | DASH-E07-F01 | #824 DASH-E07-F01-US03 — ABC / XYZ classification | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E07 | DASH-E07-F01 | #825 DASH-E07-F01-US04 — Days of cover by SKU | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E07 | DASH-E07-F02 | #826 DASH-E07-F02-US01 — Expiring within 30/60/90 days | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E07 | DASH-E07-F02 | #827 DASH-E07-F02-US02 — Non-moving stock (no movement in 90/180 d) | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E07 | DASH-E07-F03 | #828 DASH-E07-F03-US01 — Inventory alerts feed | In progress | 5 | backend/api/inventory.py; frontend/src/app/pages/InventoryOperations.tsx |  |
| DASH-E08 | DASH-E08-F01 | #829 DASH-E08-F01-US01 — Purchases KPIs | In progress | 5 | backend/api/procurement.py; frontend/src/app/pages/ProcurementIntelligence.tsx |  |
| DASH-E08 | DASH-E08-F02 | #830 DASH-E08-F02-US01 — Top suppliers chart | In progress | 5 | backend/api/procurement.py; frontend/src/app/pages/ProcurementIntelligence.tsx |  |
| DASH-E08 | DASH-E08-F02 | #831 DASH-E08-F02-US02 — Supplier price variance | In progress | 5 | backend/api/procurement.py; frontend/src/app/pages/ProcurementIntelligence.tsx |  |
| DASH-E08 | DASH-E08-F02 | #832 DASH-E08-F02-US03 — Supplier on-time performance | In progress | 5 | backend/api/procurement.py; frontend/src/app/pages/ProcurementIntelligence.tsx |  |
| DASH-E08 | DASH-E08-F03 | #833 DASH-E08-F03-US01 — Reorder recommendation list | In progress | 5 | backend/api/procurement.py; frontend/src/app/pages/ProcurementIntelligence.tsx |  |
| DASH-E09 | DASH-E09-F01 | #834 DASH-E09-F01-US01 — Output / Input / Net liability tiles | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/GSTCompliance.tsx |  |
| DASH-E09 | DASH-E09-F01 | #835 DASH-E09-F01-US02 — HSN-wise liability | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/GSTCompliance.tsx |  |
| DASH-E09 | DASH-E09-F01 | #836 DASH-E09-F01-US03 — GSTR readiness checklist | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/GSTCompliance.tsx |  |
| DASH-E09 | DASH-E09-F02 | #837 DASH-E09-F02-US01 — Days remaining to file | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/GSTCompliance.tsx |  |
| DASH-E10 | DASH-E10-F01 | #838 DASH-E10-F01-US01 — TDS deducted by section | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E10 | DASH-E10-F01 | #839 DASH-E10-F01-US02 — Pending challan deposits | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E10 | DASH-E10-F01 | #840 DASH-E10-F01-US03 — Quarterly return readiness | In progress | 5 | backend/api/compliance.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E11 | DASH-E11-F01 | #841 DASH-E11-F01-US01 — DSO / DPO / DIO / CCC | In progress | 5 | backend/api/working_capital.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E11 | DASH-E11-F01 | #842 DASH-E11-F01-US02 — AR & AP ageing | In progress | 5 | backend/api/working_capital.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E11 | DASH-E11-F01 | #843 DASH-E11-F01-US03 — Cash runway projection | In progress | 5 | backend/api/working_capital.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E12 | DASH-E12-F01 | #844 DASH-E12-F01-US01 — Store leaderboard | In progress | 5 | backend/api/location.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E12 | DASH-E12-F01 | #845 DASH-E12-F01-US02 — Store profitability radar | In progress | 5 | backend/api/location.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E12 | DASH-E12-F01 | #846 DASH-E12-F01-US03 — Inventory health per store | In progress | 5 | backend/api/location.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E13 | DASH-E13-F01 | #847 DASH-E13-F01-US01 — Top movers / decliners | In progress | 5 | backend/api/product.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E13 | DASH-E13-F01 | #848 DASH-E13-F01-US02 — Substitutability / generic share | In progress | 5 | backend/api/product.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E13 | DASH-E13-F01 | #849 DASH-E13-F01-US03 — Product margin scatter | In progress | 5 | backend/api/product.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E14 | DASH-E14-F01 | #850 DASH-E14-F01-US01 — Dispatch volume & SLA | In progress | 5 | backend/api/dispatch.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E14 | DASH-E14-F01 | #851 DASH-E14-F01-US02 — Pending pick / pack / dispatch funnel | In progress | 5 | backend/api/dispatch.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E14 | DASH-E14-F01 | #852 DASH-E14-F01-US03 — Late dispatch alerts | In progress | 5 | backend/api/dispatch.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E15 | DASH-E15-F01 | #853 DASH-E15-F01-US01 — Active customers / new / repeat | In progress | 5 | backend/api/loyalty.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E15 | DASH-E15-F01 | #854 DASH-E15-F01-US02 — RFM segmentation | In progress | 5 | backend/api/loyalty.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E15 | DASH-E15-F01 | #855 DASH-E15-F01-US03 — Top loyal customers | In progress | 5 | backend/api/loyalty.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E16 | DASH-E16-F01 | #856 DASH-E16-F01-US01 — Pipeline lag & error tile | In progress | 5 | backend/api/audit.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E16 | DASH-E16-F01 | #857 DASH-E16-F01-US02 — Reconciliation widgets | In progress | 5 | backend/api/audit.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E16 | DASH-E16-F01 | #858 DASH-E16-F01-US03 — Data anomalies feed | In progress | 5 | backend/api/audit.py; frontend/src/app/pages/OtherPages.tsx |  |
| DASH-E17 | DASH-E17-F01 | #872 DASH-E17-F01-US01 — `/detail/sales` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #873 DASH-E17-F01-US02 — `/detail/inventory` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #874 DASH-E17-F01-US03 — `/detail/purchase` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #875 DASH-E17-F01-US04 — `/detail/financial` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #876 DASH-E17-F01-US05 — `/detail/gst` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #877 DASH-E17-F01-US06 — `/detail/tds` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #878 DASH-E17-F01-US07 — `/detail/working-capital` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #879 DASH-E17-F01-US08 — `/detail/location` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #880 DASH-E17-F01-US09 — `/detail/product` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #881 DASH-E17-F01-US10 — `/detail/dispatch` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #882 DASH-E17-F01-US11 — `/detail/loyalty` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #883 DASH-E17-F01-US12 — `/detail/audit` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #884 DASH-E17-F01-US13 — `/detail/expense` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E17 | DASH-E17-F01 | #885 DASH-E17-F01-US14 — `/detail/sales-returns` | In progress | 5 | frontend/src/app/pages/detail/AdditionalDetailPages.tsx; frontend/src/app/pages/ |  |
| DASH-E18 | DASH-E18-F01 | #859 DASH-E18-F01-US01 — `/reports/sales` printable report | In progress | 5 | frontend/src/app/pages/PurchaseReport.tsx; frontend/src/app/pages/SalesReport.ts |  |
| DASH-E18 | DASH-E18-F01 | #860 DASH-E18-F01-US02 — `/reports/purchases` printable report | In progress | 5 | frontend/src/app/pages/PurchaseReport.tsx; frontend/src/app/pages/SalesReport.ts |  |
| DASH-E19 | DASH-E19-F01 | #861 DASH-E19-F01-US01 — View ETL state | In progress | 5 | backend/api/pipeline_api.py; frontend/src/app/pages/Settings.tsx |  |
| DASH-E19 | DASH-E19-F01 | #862 DASH-E19-F01-US02 — Trigger incremental sync | In progress | 5 | backend/api/pipeline_api.py; frontend/src/app/pages/Settings.tsx |  |
| DASH-E19 | DASH-E19-F01 | #863 DASH-E19-F01-US03 — Trigger full re-sync (with confirm) | In progress | 5 | backend/api/pipeline_api.py; frontend/src/app/pages/Settings.tsx |  |
| DASH-E19 | DASH-E19-F01 | #864 DASH-E19-F01-US04 — Pipeline error log viewer | In progress | 5 | backend/api/pipeline_api.py; frontend/src/app/pages/Settings.tsx |  |
| DASH-E20 | DASH-E20-F01 | #865 DASH-E20-F01-US01 — Each dashboard initial paint ≤ 3 s | In progress | 5 | backend/api/middleware.py |  |
| DASH-E20 | DASH-E20-F01 | #866 DASH-E20-F01-US02 — Cross-filter response ≤ 200 ms | In progress | 5 | backend/api/middleware.py |  |
| DASH-E20 | DASH-E20-F01 | #867 DASH-E20-F01-US03 — Server-side aggregation only | In progress | 5 | backend/api/middleware.py |  |
| DASH-E20 | DASH-E20-F02 | #868 DASH-E20-F02-US01 — HTTP cache for filter-options endpoints | In progress | 5 | backend/api/middleware.py |  |
| DASH-E20 | DASH-E20-F02 | #869 DASH-E20-F02-US02 — Per-user dashboard preferences cached | In progress | 5 | backend/api/middleware.py |  |
| DASH-E20 | DASH-E20-F03 | #870 DASH-E20-F03-US01 — Container deployment alongside inventory + accounting | In progress | 5 | backend/start.sh |  |
| DASH-E20 | DASH-E20-F03 | #871 DASH-E20-F03-US02 — Production PostgreSQL with materialised views (optional) | In progress | 5 | backend/start.sh |  |
