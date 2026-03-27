// Product categories for Indian pharmaceutical market
export type ProductCategory =
  | 'Antibiotics' | 'Analgesics' | 'Antidiabetics' | 'Cardiovascular'
  | 'Gastrointestinal' | 'Respiratory' | 'Dermatological' | 'Nutraceuticals'
  | 'Ophthalmic' | 'Hormones' | 'Antifungals' | 'Antivirals'
  | 'CNS Drugs' | 'Surgical' | 'OTC & Wellness';

export type DosageForm =
  | 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Ointment'
  | 'Drops' | 'Inhaler' | 'Powder' | 'Gel' | 'Suspension' | 'Sachet';

export type DrugSchedule = 'H' | 'H1' | 'X' | 'G' | 'OTC';

export interface Product {
  id: string;
  name: string;
  genericName: string;
  molecule: string;
  category: ProductCategory;
  subCategory: string;
  dosageForm: DosageForm;
  strength: string;
  packSize: number;
  packUnit: string;
  hsnCode: string;
  gstRate: number;
  drugSchedule: DrugSchedule;
  isNarcotic: boolean;
  requiresPrescription: boolean;
  mrp: number;
  purchasePrice: number;
  ptr: number;
  pts: number;
  companyId: string;
  marketerId: string;
  reorderLevel: number;
  maxStock: number;
  shelfLifeMonths: number;
  storageCondition: string;
  isActive: boolean;
}

export interface CompanyMaster {
  id: string;
  name: string;
  shortName: string;
  type: 'Manufacturer' | 'Marketer' | 'Both';
  gstNumber: string;
  dlNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  creditDays: number;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: 'Retail Store' | 'Warehouse' | 'Distribution Center';
  address: string;
  city: string;
  state: string;
  dlNumber: string;
  gstNumber: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  gstNumber: string;
  dlNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  creditDays: number;
  rating: number;
  leadTimeDays: number;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  type: 'Walk-in' | 'Regular' | 'B2B-Hospital' | 'B2B-Clinic' | 'B2B-Pharmacy';
  phone: string;
  email: string;
  gstNumber: string;
  dlNumber: string;
  address: string;
  city: string;
  creditLimit: number;
  creditDays: number;
  outstandingBalance: number;
  loyaltyPoints: number;
  isActive: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  registrationNumber: string;
  hospital: string;
  phone: string;
}

export interface StockQuant {
  id: string;
  productId: string;
  locationId: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  purchasePrice: number;
  mrp: number;
  landingCost: number;
  lastMovementDate: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  locationId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate: string;
  status: 'Draft' | 'Confirmed' | 'Partial' | 'Received' | 'Cancelled';
  totalAmount: number;
  gstAmount: number;
  netAmount: number;
  discountAmount: number;
  invoiceNumber: string;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  paymentDueDate: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  orderedQuantity: number;
  receivedQuantity: number;
  freeQuantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface POSOrder {
  id: string;
  locationId: string;
  customerId: string;
  doctorId: string;
  orderDate: string;
  orderTime: string;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  roundOff: number;
  netAmount: number;
  paymentMode: 'Cash' | 'Card' | 'UPI' | 'Credit';
  status: 'completed' | 'cancelled';
}

export interface POSOrderLine {
  id: string;
  posOrderId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  costPrice: number;
}

export interface B2BSalesOrder {
  id: string;
  customerId: string;
  locationId: string;
  orderDate: string;
  deliveryDate: string;
  status: 'Draft' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Cancelled';
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  paymentDueDate: string;
  invoiceNumber: string;
  supplyType: 'intra' | 'inter';
}

export interface B2BSalesOrderLine {
  id: string;
  b2bSalesOrderId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  costPrice: number;
}

export type ReturnReason = 'Expired' | 'Damaged' | 'Wrong Product' | 'Quality Issue' | 'Customer Request' | 'Near Expiry' | 'Recall';

export interface SalesReturn {
  id: string;
  originalOrderId: string;
  originalOrderType: 'POS' | 'B2B';
  customerId: string;
  locationId: string;
  returnDate: string;
  reason: ReturnReason;
  status: 'Pending' | 'Approved' | 'Processed' | 'Rejected';
  totalAmount: number;
  gstAmount: number;
  netRefund: number;
}

export interface SalesReturnLine {
  id: string;
  salesReturnId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  isResaleable: boolean;
}

export interface PurchaseReturn {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  locationId: string;
  returnDate: string;
  reason: ReturnReason;
  status: 'Draft' | 'Confirmed' | 'Dispatched' | 'Credited';
  totalAmount: number;
  gstAmount: number;
  creditNoteNumber: string;
}

export interface PurchaseReturnLine {
  id: string;
  purchaseReturnId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  batchNumber: string;
  movementType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  referenceId: string;
  referenceType: 'Purchase' | 'POS Sale' | 'B2B Sale' | 'Sales Return' | 'Purchase Return' | 'Transfer' | 'Adjustment' | 'Write-off';
  quantityChange: number;
  balanceAfter: number;
  movementDate: string;
  notes: string;
}

export interface DispatchEntry {
  id: string;
  b2bSalesOrderId: string;
  locationId: string;
  dispatchDate: string;
  transporterName: string;
  trackingNumber: string;
  status: 'Packed' | 'Dispatched' | 'In Transit' | 'Delivered';
  deliveryDate: string;
  customerName: string;
  city: string;
}

// Computed/aggregation types for dashboards
export interface RevenueByMonth {
  month: string;
  monthLabel: string;
  posRevenue: number;
  b2bRevenue: number;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  orderCount: number;
}

export interface PurchasesByMonth {
  month: string;
  monthLabel: string;
  totalPurchases: number;
  paidAmount: number;
  pendingAmount: number;
  orderCount: number;
}

export interface GSTSummaryByMonth {
  month: string;
  monthLabel: string;
  outputGST: number;
  inputGST: number;
  netGSTPayable: number;
  gst5: number;
  gst12: number;
  gst18: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface ProductProfitability {
  productId: string;
  productName: string;
  category: ProductCategory;
  companyName: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  unitsSold: number;
  abcClass: 'A' | 'B' | 'C';
}

export interface StockHealth {
  productId: string;
  productName: string;
  category: ProductCategory;
  companyName: string;
  totalOnHand: number;
  reorderLevel: number;
  maxStock: number;
  stockStatus: 'Overstocked' | 'Adequate' | 'Low' | 'Critical' | 'Out of Stock';
  daysOfStock: number;
  nearestExpiry: string;
  daysToExpiry: number;
  stockValue: number;
}

export interface SupplierPerformanceData {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimeRate: number;
  avgLeadTimeDays: number;
  totalPurchaseValue: number;
  returnRate: number;
  rating: number;
}

export interface CustomerAnalyticsData {
  customerId: string;
  customerName: string;
  customerType: string;
  totalOrders: number;
  totalSpend: number;
  avgOrderValue: number;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  loyaltyPoints: number;
  outstandingBalance: number;
}

export interface StockTurnoverData {
  productId: string;
  productName: string;
  category: ProductCategory;
  avgInventory: number;
  cogs: number;
  turnoverRatio: number;
  daysInInventory: number;
}

export interface ExpiryAlert {
  productId: string;
  productName: string;
  batchNumber: string;
  locationId: string;
  locationName: string;
  expiryDate: string;
  daysToExpiry: number;
  quantity: number;
  value: number;
  status: 'Expired' | 'Critical' | 'Warning' | 'Monitor';
}

export interface ReturnsSummary {
  month: string;
  monthLabel: string;
  salesReturns: number;
  purchaseReturns: number;
  salesReturnValue: number;
  purchaseReturnValue: number;
  topReturnReason: ReturnReason;
}
