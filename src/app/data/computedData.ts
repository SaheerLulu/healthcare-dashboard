import type {
  RevenueByMonth, PurchasesByMonth, GSTSummaryByMonth,
  ProductProfitability, StockHealth, SupplierPerformanceData,
  CustomerAnalyticsData, StockTurnoverData, ExpiryAlert, ReturnsSummary,
  ProductCategory, ReturnReason,
} from './types';
import { monthsBetween, getMonthLabel, round2 } from './generators/helpers';
import { products } from './seed/products';
import { companies } from './seed/companies';
import { locations } from './seed/locations';
import { suppliers } from './seed/suppliers';
import { customers } from './seed/customers';
import { stockQuants } from './transactions/stockQuants';
import { purchaseOrders, purchaseOrderLines } from './transactions/purchaseOrders';
import { posOrders, posOrderLines } from './transactions/posOrders';
import { b2bOrders, b2bOrderLines } from './transactions/b2bOrders';
import { salesReturns, salesReturnLines } from './transactions/returns';
import { purchaseReturns, purchaseReturnLines } from './transactions/returns';
import { stockMovements } from './transactions/stockMovements';

// Lookup maps for efficient cross-referencing
const productMap = new Map(products.map(p => [p.id, p]));
const companyMap = new Map(companies.map(c => [c.id, c]));
const locationMap = new Map(locations.map(l => [l.id, l]));
const supplierMap = new Map(suppliers.map(s => [s.id, s]));
const customerMap = new Map(customers.map(c => [c.id, c]));

const FY_MONTHS = monthsBetween('2025-04-01', '2026-03-31');

// ==========================================
// REVENUE BY MONTH
// ==========================================
function computeRevenueByMonth(): RevenueByMonth[] {
  return FY_MONTHS.map(month => {
    // POS revenue for this month
    const monthPOS = posOrders.filter(o =>
      o.status === 'completed' && o.orderDate.startsWith(month)
    );
    const posRevenue = monthPOS.reduce((sum, o) => sum + o.netAmount, 0);

    // POS COGS
    const monthPOSLines = posOrderLines.filter(l =>
      monthPOS.some(o => o.id === l.posOrderId)
    );
    const posCOGS = monthPOSLines.reduce((sum, l) => sum + l.costPrice * l.quantity, 0);

    // B2B revenue for this month
    const monthB2B = b2bOrders.filter(o =>
      o.status !== 'Cancelled' && o.status !== 'Draft' && o.orderDate.startsWith(month)
    );
    const b2bRevenue = monthB2B.reduce((sum, o) => sum + o.netAmount, 0);

    // B2B COGS
    const monthB2BLines = b2bOrderLines.filter(l =>
      monthB2B.some(o => o.id === l.b2bSalesOrderId)
    );
    const b2bCOGS = monthB2BLines.reduce((sum, l) => sum + l.costPrice * l.quantity, 0);

    const totalRevenue = round2(posRevenue + b2bRevenue);
    const cogs = round2(posCOGS + b2bCOGS);

    return {
      month,
      monthLabel: getMonthLabel(month),
      posRevenue: round2(posRevenue),
      b2bRevenue: round2(b2bRevenue),
      totalRevenue,
      cogs,
      grossProfit: round2(totalRevenue - cogs),
      orderCount: monthPOS.length + monthB2B.length,
    };
  });
}

// ==========================================
// PURCHASES BY MONTH
// ==========================================
function computePurchasesByMonth(): PurchasesByMonth[] {
  return FY_MONTHS.map(month => {
    const monthPOs = purchaseOrders.filter(o =>
      o.status !== 'Cancelled' && o.orderDate.startsWith(month)
    );
    const total = monthPOs.reduce((sum, o) => sum + o.netAmount, 0);
    const paid = monthPOs.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.netAmount, 0);
    const partial = monthPOs.filter(o => o.paymentStatus === 'Partial').reduce((sum, o) => sum + o.netAmount * 0.5, 0);

    return {
      month,
      monthLabel: getMonthLabel(month),
      totalPurchases: round2(total),
      paidAmount: round2(paid + partial),
      pendingAmount: round2(total - paid - partial),
      orderCount: monthPOs.length,
    };
  });
}

// ==========================================
// GST SUMMARY BY MONTH
// ==========================================
function computeGSTSummaryByMonth(): GSTSummaryByMonth[] {
  return FY_MONTHS.map(month => {
    // Output GST (from sales)
    const monthPOSLines = posOrderLines.filter(l => {
      const order = posOrders.find(o => o.id === l.posOrderId);
      return order && order.status === 'completed' && order.orderDate.startsWith(month);
    });
    const monthB2BLines = b2bOrderLines.filter(l => {
      const order = b2bOrders.find(o => o.id === l.b2bSalesOrderId);
      return order && order.status !== 'Cancelled' && order.status !== 'Draft' && order.orderDate.startsWith(month);
    });

    const outputGST = round2(
      monthPOSLines.reduce((sum, l) => sum + l.gstAmount, 0) +
      monthB2BLines.reduce((sum, l) => sum + l.gstAmount, 0)
    );

    // Input GST (from purchases)
    const monthPOLines = purchaseOrderLines.filter(l => {
      const po = purchaseOrders.find(o => o.id === l.purchaseOrderId);
      return po && po.status !== 'Cancelled' && po.orderDate.startsWith(month);
    });
    const inputGST = round2(monthPOLines.reduce((sum, l) => sum + l.gstAmount, 0));

    // GST by slab
    const allSalesLines = [...monthPOSLines, ...monthB2BLines];
    const gst5 = round2(allSalesLines.filter(l => l.gstRate === 5).reduce((sum, l) => sum + l.gstAmount, 0));
    const gst12 = round2(allSalesLines.filter(l => l.gstRate === 12).reduce((sum, l) => sum + l.gstAmount, 0));
    const gst18 = round2(allSalesLines.filter(l => l.gstRate === 18).reduce((sum, l) => sum + l.gstAmount, 0));

    // CGST/SGST/IGST split
    // For B2B inter-state: full IGST; otherwise CGST + SGST (50/50)
    const b2bInterLines = monthB2BLines.filter(l => {
      const order = b2bOrders.find(o => o.id === l.b2bSalesOrderId);
      return order?.supplyType === 'inter';
    });
    const igst = round2(b2bInterLines.reduce((sum, l) => sum + l.gstAmount, 0));
    const intraGST = round2(outputGST - igst);
    const cgst = round2(intraGST / 2);
    const sgst = round2(intraGST / 2);

    return {
      month,
      monthLabel: getMonthLabel(month),
      outputGST,
      inputGST,
      netGSTPayable: round2(outputGST - inputGST),
      gst5,
      gst12,
      gst18,
      cgst,
      sgst,
      igst,
    };
  });
}

// ==========================================
// PRODUCT PROFITABILITY
// ==========================================
function computeProductProfitability(): ProductProfitability[] {
  const profitMap = new Map<string, { revenue: number; cost: number; units: number }>();

  // POS sales
  for (const line of posOrderLines) {
    const order = posOrders.find(o => o.id === line.posOrderId);
    if (!order || order.status !== 'completed') continue;
    const existing = profitMap.get(line.productId) || { revenue: 0, cost: 0, units: 0 };
    existing.revenue += line.lineTotal;
    existing.cost += line.costPrice * line.quantity;
    existing.units += line.quantity;
    profitMap.set(line.productId, existing);
  }

  // B2B sales
  for (const line of b2bOrderLines) {
    const order = b2bOrders.find(o => o.id === line.b2bSalesOrderId);
    if (!order || order.status === 'Cancelled' || order.status === 'Draft') continue;
    const existing = profitMap.get(line.productId) || { revenue: 0, cost: 0, units: 0 };
    existing.revenue += line.lineTotal;
    existing.cost += line.costPrice * line.quantity;
    existing.units += line.quantity;
    profitMap.set(line.productId, existing);
  }

  const results: ProductProfitability[] = [];
  for (const product of products) {
    const data = profitMap.get(product.id) || { revenue: 0, cost: 0, units: 0 };
    const company = companyMap.get(product.companyId);
    const grossProfit = round2(data.revenue - data.cost);
    const marginPercent = data.revenue > 0 ? round2((grossProfit / data.revenue) * 100) : 0;

    results.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      companyName: company?.shortName || company?.name || '',
      totalRevenue: round2(data.revenue),
      totalCost: round2(data.cost),
      grossProfit,
      marginPercent,
      unitsSold: data.units,
      abcClass: 'C', // Will be calculated after sorting
    });
  }

  // ABC Classification based on revenue
  results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  const totalRev = results.reduce((sum, r) => sum + r.totalRevenue, 0);
  let cumRev = 0;
  for (const r of results) {
    cumRev += r.totalRevenue;
    const cumPct = (cumRev / totalRev) * 100;
    if (cumPct <= 80) r.abcClass = 'A';
    else if (cumPct <= 95) r.abcClass = 'B';
    else r.abcClass = 'C';
  }

  return results;
}

// ==========================================
// STOCK HEALTH
// ==========================================
function computeStockHealth(): StockHealth[] {
  const TODAY = '2026-03-27';
  const todayDate = new Date(TODAY);

  // Group stock quants by product
  const productStockMap = new Map<string, { totalOnHand: number; nearestExpiry: string; daysToExpiry: number; stockValue: number }>();

  for (const sq of stockQuants) {
    const existing = productStockMap.get(sq.productId) || {
      totalOnHand: 0,
      nearestExpiry: '9999-12-31',
      daysToExpiry: 9999,
      stockValue: 0,
    };
    existing.totalOnHand += sq.quantityOnHand;
    existing.stockValue += sq.quantityOnHand * sq.purchasePrice;

    if (sq.expiryDate < existing.nearestExpiry && sq.quantityOnHand > 0) {
      existing.nearestExpiry = sq.expiryDate;
      const expiryDate = new Date(sq.expiryDate);
      existing.daysToExpiry = Math.floor((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    productStockMap.set(sq.productId, existing);
  }

  // Compute average daily sales for days-of-stock
  const salesCount = new Map<string, number>();
  for (const line of posOrderLines) {
    const order = posOrders.find(o => o.id === line.posOrderId);
    if (order?.status === 'completed') {
      salesCount.set(line.productId, (salesCount.get(line.productId) || 0) + line.quantity);
    }
  }
  for (const line of b2bOrderLines) {
    const order = b2bOrders.find(o => o.id === line.b2bSalesOrderId);
    if (order && order.status !== 'Cancelled' && order.status !== 'Draft') {
      salesCount.set(line.productId, (salesCount.get(line.productId) || 0) + line.quantity);
    }
  }

  return products.map(product => {
    const stock = productStockMap.get(product.id) || {
      totalOnHand: 0, nearestExpiry: '', daysToExpiry: 0, stockValue: 0
    };
    const company = companyMap.get(product.companyId);
    const totalSold = salesCount.get(product.id) || 0;
    const avgDailySales = totalSold / 365; // FY
    const daysOfStock = avgDailySales > 0 ? Math.round(stock.totalOnHand / avgDailySales) : stock.totalOnHand > 0 ? 999 : 0;

    let stockStatus: StockHealth['stockStatus'];
    if (stock.totalOnHand === 0) stockStatus = 'Out of Stock';
    else if (stock.totalOnHand < product.reorderLevel * 0.3) stockStatus = 'Critical';
    else if (stock.totalOnHand < product.reorderLevel) stockStatus = 'Low';
    else if (stock.totalOnHand > product.maxStock) stockStatus = 'Overstocked';
    else stockStatus = 'Adequate';

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      companyName: company?.shortName || '',
      totalOnHand: stock.totalOnHand,
      reorderLevel: product.reorderLevel,
      maxStock: product.maxStock,
      stockStatus,
      daysOfStock,
      nearestExpiry: stock.nearestExpiry === '9999-12-31' ? '' : stock.nearestExpiry,
      daysToExpiry: stock.daysToExpiry === 9999 ? 0 : stock.daysToExpiry,
      stockValue: round2(stock.stockValue),
    };
  });
}

// ==========================================
// SUPPLIER PERFORMANCE
// ==========================================
function computeSupplierPerformance(): SupplierPerformanceData[] {
  return suppliers.map(supplier => {
    const supplierPOs = purchaseOrders.filter(o => o.supplierId === supplier.id && o.status !== 'Cancelled');
    const receivedPOs = supplierPOs.filter(o => o.status === 'Received' || o.status === 'Partial');

    let onTime = 0;
    let late = 0;
    let totalLeadDays = 0;

    for (const po of receivedPOs) {
      if (po.actualDeliveryDate && po.expectedDeliveryDate) {
        const actual = new Date(po.actualDeliveryDate).getTime();
        const expected = new Date(po.expectedDeliveryDate).getTime();
        const leadDays = Math.floor((new Date(po.actualDeliveryDate).getTime() - new Date(po.orderDate).getTime()) / (1000 * 60 * 60 * 24));
        totalLeadDays += leadDays;
        if (actual <= expected + 2 * 86400000) { // 2 day grace period
          onTime++;
        } else {
          late++;
        }
      }
    }

    // Return rate from purchase returns
    const supplierReturns = purchaseReturns.filter(r => r.supplierId === supplier.id);
    const totalPurchaseValue = supplierPOs.reduce((sum, o) => sum + o.netAmount, 0);
    const returnValue = supplierReturns.reduce((sum, r) => sum + r.totalAmount, 0);
    const returnRate = totalPurchaseValue > 0 ? round2((returnValue / totalPurchaseValue) * 100) : 0;

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalOrders: supplierPOs.length,
      onTimeDeliveries: onTime,
      lateDeliveries: late,
      onTimeRate: (onTime + late) > 0 ? round2((onTime / (onTime + late)) * 100) : 0,
      avgLeadTimeDays: receivedPOs.length > 0 ? Math.round(totalLeadDays / receivedPOs.length) : supplier.leadTimeDays,
      totalPurchaseValue: round2(totalPurchaseValue),
      returnRate,
      rating: supplier.rating,
    };
  });
}

// ==========================================
// CUSTOMER ANALYTICS
// ==========================================
function computeCustomerAnalytics(): CustomerAnalyticsData[] {
  const TODAY = '2026-03-27';

  return customers.map(customer => {
    // POS orders
    const custPOS = posOrders.filter(o => o.customerId === customer.id && o.status === 'completed');
    const posSpend = custPOS.reduce((sum, o) => sum + o.netAmount, 0);

    // B2B orders
    const custB2B = b2bOrders.filter(o => o.customerId === customer.id && o.status !== 'Cancelled');
    const b2bSpend = custB2B.reduce((sum, o) => sum + o.netAmount, 0);

    const totalOrders = custPOS.length + custB2B.length;
    const totalSpend = round2(posSpend + b2bSpend);

    // Last order date
    const allDates = [
      ...custPOS.map(o => o.orderDate),
      ...custB2B.map(o => o.orderDate),
    ].sort().reverse();
    const lastOrderDate = allDates[0] || '';
    const daysSinceLast = lastOrderDate
      ? Math.floor((new Date(TODAY).getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerType: customer.type,
      totalOrders,
      totalSpend,
      avgOrderValue: totalOrders > 0 ? round2(totalSpend / totalOrders) : 0,
      lastOrderDate,
      daysSinceLastOrder: daysSinceLast,
      loyaltyPoints: customer.loyaltyPoints,
      outstandingBalance: customer.outstandingBalance,
    };
  });
}

// ==========================================
// STOCK TURNOVER
// ==========================================
function computeStockTurnover(): StockTurnoverData[] {
  // Average inventory = (beginning + ending) / 2, approximate with current stock
  const productSales = new Map<string, number>();

  for (const line of posOrderLines) {
    const order = posOrders.find(o => o.id === line.posOrderId);
    if (order?.status === 'completed') {
      const cost = line.costPrice * line.quantity;
      productSales.set(line.productId, (productSales.get(line.productId) || 0) + cost);
    }
  }
  for (const line of b2bOrderLines) {
    const order = b2bOrders.find(o => o.id === line.b2bSalesOrderId);
    if (order && order.status !== 'Cancelled' && order.status !== 'Draft') {
      const cost = line.costPrice * line.quantity;
      productSales.set(line.productId, (productSales.get(line.productId) || 0) + cost);
    }
  }

  // Current stock value by product
  const stockValueMap = new Map<string, number>();
  for (const sq of stockQuants) {
    stockValueMap.set(sq.productId, (stockValueMap.get(sq.productId) || 0) + sq.quantityOnHand * sq.purchasePrice);
  }

  return products.map(product => {
    const cogs = productSales.get(product.id) || 0;
    const avgInventory = stockValueMap.get(product.id) || 0;
    const turnoverRatio = avgInventory > 0 ? round2(cogs / avgInventory) : 0;
    const daysInInventory = turnoverRatio > 0 ? Math.round(365 / turnoverRatio) : avgInventory > 0 ? 999 : 0;

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      avgInventory: round2(avgInventory),
      cogs: round2(cogs),
      turnoverRatio,
      daysInInventory,
    };
  });
}

// ==========================================
// EXPIRY ALERTS
// ==========================================
function computeExpiryAlerts(): ExpiryAlert[] {
  const TODAY = '2026-03-27';
  const todayDate = new Date(TODAY);
  const alerts: ExpiryAlert[] = [];

  for (const sq of stockQuants) {
    if (sq.quantityOnHand === 0) continue;

    const expiryDate = new Date(sq.expiryDate);
    const daysToExpiry = Math.floor((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry > 180) continue; // Only alert within 180 days

    const product = productMap.get(sq.productId);
    const location = locationMap.get(sq.locationId);
    if (!product) continue;

    let status: ExpiryAlert['status'];
    if (daysToExpiry <= 0) status = 'Expired';
    else if (daysToExpiry <= 30) status = 'Critical';
    else if (daysToExpiry <= 90) status = 'Warning';
    else status = 'Monitor';

    alerts.push({
      productId: sq.productId,
      productName: product.name,
      batchNumber: sq.batchNumber,
      locationId: sq.locationId,
      locationName: location?.name || '',
      expiryDate: sq.expiryDate,
      daysToExpiry,
      quantity: sq.quantityOnHand,
      value: round2(sq.quantityOnHand * sq.purchasePrice),
      status,
    });
  }

  return alerts.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

// ==========================================
// RETURNS SUMMARY
// ==========================================
function computeReturnsSummary(): ReturnsSummary[] {
  return FY_MONTHS.map(month => {
    const monthSalesReturns = salesReturns.filter(r => r.returnDate.startsWith(month));
    const monthPurchaseReturns = purchaseReturns.filter(r => r.returnDate.startsWith(month));

    const salesReturnValue = monthSalesReturns.reduce((sum, r) => sum + r.totalAmount, 0);
    const purchaseReturnValue = monthPurchaseReturns.reduce((sum, r) => sum + r.totalAmount, 0);

    // Top return reason
    const reasonCounts = new Map<ReturnReason, number>();
    for (const r of monthSalesReturns) {
      reasonCounts.set(r.reason, (reasonCounts.get(r.reason) || 0) + 1);
    }
    let topReason: ReturnReason = 'Customer Request';
    let maxCount = 0;
    for (const [reason, count] of reasonCounts) {
      if (count > maxCount) { maxCount = count; topReason = reason; }
    }

    return {
      month,
      monthLabel: getMonthLabel(month),
      salesReturns: monthSalesReturns.length,
      purchaseReturns: monthPurchaseReturns.length,
      salesReturnValue: round2(salesReturnValue),
      purchaseReturnValue: round2(purchaseReturnValue),
      topReturnReason: topReason,
    };
  });
}

// ==========================================
// EXPORTS
// ==========================================
export const revenueByMonth = computeRevenueByMonth();
export const purchasesByMonth = computePurchasesByMonth();
export const gstSummaryByMonth = computeGSTSummaryByMonth();
export const productProfitability = computeProductProfitability();
export const stockHealth = computeStockHealth();
export const supplierPerformance = computeSupplierPerformance();
export const customerAnalytics = computeCustomerAnalytics();
export const stockTurnover = computeStockTurnover();
export const expiryAlerts = computeExpiryAlerts();
export const returnsSummary = computeReturnsSummary();

// Category-level aggregations for quick chart data
export const categories: ProductCategory[] = [
  'Antibiotics', 'Analgesics', 'Antidiabetics', 'Cardiovascular',
  'Gastrointestinal', 'Respiratory', 'Dermatological', 'Nutraceuticals',
  'Ophthalmic', 'Hormones', 'Antifungals', 'Antivirals',
  'CNS Drugs', 'Surgical', 'OTC & Wellness',
];

export const locationNames = locations.map(l => l.name);
export const companyNames = companies.map(c => c.shortName || c.name);
