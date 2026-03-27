import { createBrowserRouter } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { RevenueSales } from './pages/RevenueSales';
import { Purchases } from './pages/Purchases';
import { GSTAnalysis } from './pages/GSTAnalysis';
import { Profitability } from './pages/Profitability';
import { InventoryHealth } from './pages/InventoryHealth';
import { StockMovement } from './pages/StockMovement';
import { SupplierPerformance } from './pages/SupplierPerformance';
import { CustomerAnalytics } from './pages/CustomerAnalytics';
import { ReturnsAnalysis } from './pages/ReturnsAnalysis';
import { DataTable } from './pages/DataTable';
import { DrillThrough } from './pages/DrillThrough';

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/revenue-sales', element: <RevenueSales /> },
  { path: '/purchases', element: <Purchases /> },
  { path: '/gst-analysis', element: <GSTAnalysis /> },
  { path: '/profitability', element: <Profitability /> },
  { path: '/inventory-health', element: <InventoryHealth /> },
  { path: '/stock-movement', element: <StockMovement /> },
  { path: '/supplier-performance', element: <SupplierPerformance /> },
  { path: '/customer-analytics', element: <CustomerAnalytics /> },
  { path: '/returns-analysis', element: <ReturnsAnalysis /> },
  { path: '/data-table', element: <DataTable /> },
  { path: '/drill-through', element: <DrillThrough /> },
]);
