import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";

/**
 * Code-splitting (DASH-E20-F01-US01).
 *
 * Each dashboard page lives in its own chunk so the initial paint
 * doesn't ship every page's recharts import. The pre-split bundle
 * crossed 500 kB; React.lazy + the route-level Suspense in Layout
 * keep the first paint under that budget.
 *
 * The grouped pages (OtherPages.tsx, OtherDetailPages.tsx,
 * AdditionalDetailPages.tsx) export several named components and
 * therefore split as a single chunk each — fine, because the user
 * almost always loads the whole group together (they share a
 * recharts import surface).
 */

// Helper to bridge React.lazy (which expects a default export) to our
// named-export pages without rewriting every file to default export.
const lazyNamed = <Mod extends Record<string, any>, K extends keyof Mod>(
  factory: () => Promise<Mod>,
  name: K,
) => lazy(() => factory().then((m) => ({ default: m[name] })));

const ExecutiveSummary = lazyNamed(() => import("./pages/ExecutiveSummary"), "ExecutiveSummary");
const FinancialDeepDive = lazyNamed(() => import("./pages/FinancialDeepDive"), "FinancialDeepDive");
const SalesCommandCenter = lazyNamed(() => import("./pages/SalesCommandCenter"), "SalesCommandCenter");
const InventoryOperations = lazyNamed(() => import("./pages/InventoryOperations"), "InventoryOperations");
const ProcurementIntelligence = lazyNamed(() => import("./pages/ProcurementIntelligence"), "ProcurementIntelligence");
const GSTCompliance = lazyNamed(() => import("./pages/GSTCompliance"), "GSTCompliance");
const Settings = lazyNamed(() => import("./pages/Settings"), "Settings");
const SalesReport = lazyNamed(() => import("./pages/SalesReport"), "SalesReport");
const PurchaseReport = lazyNamed(() => import("./pages/PurchaseReport"), "PurchaseReport");
const PipelineManagement = lazyNamed(() => import("./pages/PipelineManagement"), "PipelineManagement");

// OtherPages.tsx exports 7 named components — one chunk total (the
// recharts/lucide cost is amortised across them all anyway).
const TDSTracker = lazyNamed(() => import("./pages/OtherPages"), "TDSTracker");
const WorkingCapital = lazyNamed(() => import("./pages/OtherPages"), "WorkingCapital");
const LocationBenchmarking = lazyNamed(() => import("./pages/OtherPages"), "LocationBenchmarking");
const ProductIntelligence = lazyNamed(() => import("./pages/OtherPages"), "ProductIntelligence");
const DispatchFulfillment = lazyNamed(() => import("./pages/OtherPages"), "DispatchFulfillment");
const LoyaltyAnalytics = lazyNamed(() => import("./pages/OtherPages"), "LoyaltyAnalytics");
const AuditDataHealth = lazyNamed(() => import("./pages/OtherPages"), "AuditDataHealth");

// Detail pages — same grouping rationale.
const SalesDetailData = lazyNamed(() => import("./pages/detail/SalesDetailData"), "SalesDetailData");
const InventoryDetailData = lazyNamed(() => import("./pages/detail/OtherDetailPages"), "InventoryDetailData");
const PurchaseDetailData = lazyNamed(() => import("./pages/detail/OtherDetailPages"), "PurchaseDetailData");
const FinancialDetailData = lazyNamed(() => import("./pages/detail/OtherDetailPages"), "FinancialDetailData");
const GSTDetailData = lazyNamed(() => import("./pages/detail/OtherDetailPages"), "GSTDetailData");
const TDSDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "TDSDetailData");
const WorkingCapitalDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "WorkingCapitalDetailData");
const LocationDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "LocationDetailData");
const ProductDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "ProductDetailData");
const DispatchDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "DispatchDetailData");
const LoyaltyDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "LoyaltyDetailData");
const AuditDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "AuditDetailData");
const ExpenseDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "ExpenseDetailData");
const SalesReturnsDetailData = lazyNamed(() => import("./pages/detail/AdditionalDetailPages"), "SalesReturnsDetailData");

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ExecutiveSummary },
      { path: "financial", Component: FinancialDeepDive },
      { path: "sales", Component: SalesCommandCenter },
      { path: "inventory", Component: InventoryOperations },
      { path: "procurement", Component: ProcurementIntelligence },
      { path: "gst", Component: GSTCompliance },
      { path: "tds", Component: TDSTracker },
      { path: "working-capital", Component: WorkingCapital },
      { path: "location", Component: LocationBenchmarking },
      { path: "product", Component: ProductIntelligence },
      { path: "dispatch", Component: DispatchFulfillment },
      { path: "loyalty", Component: LoyaltyAnalytics },
      { path: "audit", Component: AuditDataHealth },
      { path: "settings", Component: Settings },
      { path: "pipeline", Component: PipelineManagement },
      { path: "reports/sales", Component: SalesReport },
      { path: "reports/purchases", Component: PurchaseReport },

      // Detail Data Pages
      { path: "detail/sales", Component: SalesDetailData },
      { path: "detail/inventory", Component: InventoryDetailData },
      { path: "detail/purchase", Component: PurchaseDetailData },
      { path: "detail/financial", Component: FinancialDetailData },
      { path: "detail/gst", Component: GSTDetailData },
      { path: "detail/tds", Component: TDSDetailData },
      { path: "detail/working-capital", Component: WorkingCapitalDetailData },
      { path: "detail/location", Component: LocationDetailData },
      { path: "detail/product", Component: ProductDetailData },
      { path: "detail/dispatch", Component: DispatchDetailData },
      { path: "detail/loyalty", Component: LoyaltyDetailData },
      { path: "detail/audit", Component: AuditDetailData },
      { path: "detail/expense", Component: ExpenseDetailData },
      { path: "detail/sales-returns", Component: SalesReturnsDetailData },
    ],
  },
]);
