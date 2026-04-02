import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ExecutiveSummary } from "./pages/ExecutiveSummary";
import { FinancialDeepDive } from "./pages/FinancialDeepDive";
import { SalesCommandCenter } from "./pages/SalesCommandCenter";
import { InventoryOperations } from "./pages/InventoryOperations";
import { ProcurementIntelligence } from "./pages/ProcurementIntelligence";
import { GSTCompliance } from "./pages/GSTCompliance";
import { Settings } from "./pages/Settings";
import {
  TDSTracker,
  WorkingCapital,
  LocationBenchmarking,
  ProductIntelligence,
  DispatchFulfillment,
  LoyaltyAnalytics,
  AuditDataHealth,
} from "./pages/OtherPages";

// Detail Data Pages
import { SalesDetailData } from "./pages/detail/SalesDetailData";
import {
  InventoryDetailData,
  PurchaseDetailData,
  FinancialDetailData,
  GSTDetailData,
} from "./pages/detail/OtherDetailPages";
import {
  TDSDetailData,
  WorkingCapitalDetailData,
  LocationDetailData,
  ProductDetailData,
  DispatchDetailData,
  LoyaltyDetailData,
  AuditDetailData,
  ExpenseDetailData,
} from "./pages/detail/AdditionalDetailPages";

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
    ],
  },
]);
