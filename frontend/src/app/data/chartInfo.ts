/** Per-chart documentation surfaced in the info popover (the "i" icon). */
export interface ChartInfo {
  title: string;
  text: string;
}

export const INVENTORY_CHART_INFO: Record<string, ChartInfo> = {
  stockValueByCategory: {
    title: 'Stock Value by Category',
    text:
      'Sum of stock_value_cost (qty × purchase rate) for each product category from the latest inventory snapshot. The right-axis bar shows the count of fast-moving SKUs in each category (movement_status = "fast").\n\nSource: report_inventory (latest snapshot date).',
  },
  stockQuantityByCategory: {
    title: 'Stock Quantity by Category',
    text:
      'Sum of qty_on_hand grouped by product category from the latest inventory snapshot. Slice size = quantity, label shows the percentage of the total.\n\nSource: report_inventory (latest snapshot date).',
  },
  expiryDistribution: {
    title: 'Expiry Distribution',
    text:
      'Stock value bucketed by days_to_expiry: Expired (<0), 0–30, 31–60, 61–90, >90 days.\n\nColors reflect priority: red = critical, amber = warning, blue = attention, green = safe.',
  },
  quantityNearExpiry: {
    title: 'Quantity Near Expiry',
    text:
      'Same expiry buckets as the bar chart but slice size = qty_on_hand (units), not value. Use this view when the question is "how many units" rather than "how much capital".',
  },
  stockMovementTrend: {
    title: 'Stock Movement Trend',
    text:
      'Inbound = monthly purchase quantity from report_purchases.\nOutbound = monthly sales quantity from report_sales.\n\nRight-click on a month and Drill Through to see every individual movement event in that month.',
  },
  closingStockTrend: {
    title: 'Closing Stock Trend',
    text:
      'Reconstructs month-end on-hand quantity by walking back from the current snapshot:\nclosing[m] = closing[m+1] − purchases[m+1] + sales[m+1].\n\nRight-click → Drill Through to see the events that drove a given month\'s movement.',
  },
  deadStockAnalysis: {
    title: 'Dead Stock Analysis',
    text:
      'Top dead-stock products: SKUs with movement_status = "dead" (no sale in 90+ days) and qty_on_hand > 0. Bar height = stock_value_cost.\n\nSource: report_inventory.',
  },
  carryingCostBreakdown: {
    title: 'Carrying Cost Breakdown',
    text:
      'Reconstructs month-end stock value from the current report_inventory snapshot, walking back through purchases (line_total) and COGS (purchase_rate × quantity).\n\nApplies a 25% annual holding rate split into:\n• Storage 7%\n• Insurance 2%\n• Obsolescence 10%\n• Financing 6%\n\nEach monthly value = stock_value × component% / 12. Rate constants live in backend/api/inventory.py.',
  },
  inventorySalesRatio: {
    title: 'Inventory-to-Sales Ratio',
    text:
      'Per category: Inventory Value (left axis) is the current stock_value_cost. Monthly Sales (right axis) is line_total over the last 30 days. The ratio (inv / monthly sales) tells you how many months of sales the current stock would cover.',
  },
  stockOptimizationRecommendations: {
    title: 'Stock Optimization Recommendations',
    text:
      'Per category, computed from days_of_stock and last-30-day sales:\n• "Reduce Stock" when days_of_stock > 120 — saving = stock value × 25% / 12 × 60%.\n• "Replenish" when days_of_stock < 15 — saving estimate = monthly_sales × 5%.\n\nPriority colors: red = high, amber = medium, green = low.',
  },
  demandForecastVsActual: {
    title: 'Demand Forecast vs Actual',
    text:
      'Forecast = trailing 3-month moving average of monthly sales quantity over the past 12 months. Confidence band = forecast ± 15%.\n\nNo exponential smoothing or seasonality adjustment is applied — this is a deliberately simple baseline.',
  },
  seasonalDemandIndex: {
    title: 'Seasonal Demand Index',
    text:
      'For each month, index = (actual sales / 12-month average) × 100. Above 100 = busier than average; below 100 = quieter. The peak-category label is the top-selling category in that month.',
  },
  forecastAccuracyByCategory: {
    title: 'Forecast Accuracy by Category',
    text:
      'For each category, MAPE (Mean Absolute Percentage Error) is computed across the last 6 months of forecast vs actual. Accuracy = 100 − MAPE. Top 10 categories by accuracy are shown.',
  },
  turnoverGmroiTrend: {
    title: 'Turnover & GMROI Trend',
    text:
      'Turnover = COGS / average inventory cost (annualized to 12 months).\nGMROI = gross margin / average inventory cost.\n\nTrend uses 6 monthly snapshots reconstructed from sales + purchase flows.',
  },
  categoryEfficiencyRadar: {
    title: 'Category Efficiency Radar',
    text:
      'Five normalized efficiency metrics per category — turnover, GMROI, fill rate, days of stock (inverted), and margin. Radii are scaled 0–100 so categories can be compared side-by-side.',
  },
  batchAgingDistribution: {
    title: 'Batch Aging Distribution',
    text:
      'Bars: number of active batches in each age bucket (days since manufacture / first stock-in). Line: average days_to_expiry per bucket. Source: report_inventory grouped by batch_no.',
  },
  fifoCompliance: {
    title: 'FIFO Compliance',
    text:
      'For each month, the FIFO compliance score = % of sales lines whose batch_no was the oldest available batch at the time of sale. Below 90% indicates risk of write-offs from out-of-rotation old stock.',
  },
  investmentByCategory: {
    title: 'Investment by Category (with ROI)',
    text:
      'Bars: total stock_value_cost per category. Line: ROI % = (gross margin from last 30 days) / (current inventory value) × 100. Categories sorted by total investment.',
  },
  investmentVsReturnScatter: {
    title: 'Investment vs Return',
    text:
      'Each bubble = one product. X = current investment (stock_value_cost). Y = monthly return (gross margin × 30 / period). Bubble size = inventory turnover. Top 40 products by investment.',
  },
  roiTrend: {
    title: 'ROI Trend',
    text:
      'Monthly ROI % = monthly gross margin / total current investment × 100, computed across the last 6 months. The two trend lines show monthly ROI and a smoothed annualized ROI.',
  },
  roiByVelocitySegment: {
    title: 'ROI by Velocity Segment',
    text:
      'Splits SKUs into Fast / Medium / Slow / Dead by movement_status. For each segment, shows total investment (left bar) and ROI % (right bar). Dead-stock ROI is typically zero; fast-mover ROI tends to be highest.',
  },
};
