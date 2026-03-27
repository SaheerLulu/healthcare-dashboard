// Barrel exports for all data

// Types
export type * from './types';

// Seed data
export { companies } from './seed/companies';
export { locations } from './seed/locations';
export { suppliers } from './seed/suppliers';
export { customers } from './seed/customers';
export { doctors } from './seed/doctors';
export { products } from './seed/products';

// Transaction data
export { stockQuants } from './transactions/stockQuants';
export { purchaseOrders, purchaseOrderLines } from './transactions/purchaseOrders';
export { posOrders, posOrderLines } from './transactions/posOrders';
export { b2bOrders, b2bOrderLines } from './transactions/b2bOrders';
export { salesReturns, salesReturnLines, purchaseReturns, purchaseReturnLines } from './transactions/returns';
export { stockMovements } from './transactions/stockMovements';
export { dispatchEntries } from './transactions/dispatchEntries';

// Computed aggregations
export {
  revenueByMonth,
  purchasesByMonth,
  gstSummaryByMonth,
  productProfitability,
  stockHealth,
  supplierPerformance,
  customerAnalytics,
  stockTurnover,
  expiryAlerts,
  returnsSummary,
  categories,
  locationNames,
  companyNames,
} from './computedData';
