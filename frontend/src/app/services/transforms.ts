/** Helpers to transform API responses to match existing chart data shapes. */

const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

/** "2025-10" → "Oct" */
export function monthLabel(period: string): string {
  if (!period) return '';
  const mm = period.split('-')[1];
  return MONTH_SHORT[mm] || period;
}

/** Convert string numbers to actual numbers in an object */
export function numericize<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    const val = result[key];
    if (typeof val === 'string' && !isNaN(Number(val)) && val !== '') {
      (result as any)[key] = Number(val);
    }
  }
  return result;
}

/** Transform monthly trend from API [{sale_month, revenue, profit}] to [{month, revenue, profit}] */
export function toMonthlyTrend(data: any[]): any[] {
  return data.map(r => {
    const n = numericize(r);
    return {
      ...n,
      month: monthLabel(r.sale_month || r.entry_month || r.purchase_month || r.period || r.month || ''),
      // Price trend fields (procurement)
      avgPrice: n.avg_rate || n.avgPrice || 0,
      priceIndex: n.price_index || n.priceIndex || (n.avg_rate ? 100 : 0),
      volatility: n.volatility || 0,
    };
  });
}

/** Transform channel mix from API [{sale_month, channel, revenue}] to [{month, POS, B2B}] */
export function toChannelMix(data: any[]): any[] {
  const byMonth: Record<string, any> = {};
  for (const r of data) {
    const m = monthLabel(r.sale_month || '');
    if (!byMonth[m]) byMonth[m] = { month: m, POS: 0, B2B: 0 };
    byMonth[m][r.channel] = Number(r.revenue) || 0;
  }
  return Object.values(byMonth);
}

/** Transform category revenue from API [{product_category, revenue, qty}] to [{name, value, orders}] */
export function toCategoryPie(data: any[]): any[] {
  return data.map(r => ({
    name: r.product_category || r.category || '',
    value: Number(r.revenue) || 0,
    orders: Number(r.qty || r.orders || r.count) || 0,
    ...numericize(r),
  }));
}

/** Transform top products from API to chart shape.
 * margin = percentage (0–100), profit = absolute rupees.
 * The backend `top_products` endpoint annotates `margin = Sum(gross_margin)` in
 * rupees, NOT a percentage — so if no explicit `*_pct` field is present, we
 * compute the percentage from revenue + absolute margin. */
export function toTopProducts(data: any[]): any[] {
  return data.map(r => {
    const revenue = Number(r.revenue) || 0;
    const profit = Number(r.profit ?? r.margin) || 0;
    const explicitPct = r.avg_margin_pct ?? r.margin_percent ?? r.margin_pct;
    const marginPct = explicitPct !== undefined && explicitPct !== null
      ? Number(explicitPct)
      : (revenue > 0 ? (profit / revenue) * 100 : 0);
    return {
      // Spread numericize FIRST so the explicit fields below override; the
      // backend returns `margin = Sum(gross_margin)` in rupees and spreading
      // it last had the rupee value clobber our computed percentage.
      ...numericize(r),
      name: r.product_name || r.name || '',
      qty: Number(r.qty || r.quantity) || 0,
      revenue,
      margin: Number(marginPct.toFixed(2)),
      cost: Number(r.cost) || 0,
      profit,
      category: r.product_category || r.category || '',
      growth: Number(r.growth) || 0,
    };
  });
}

/** Transform payment mix from API [{payment_method, revenue, orders}] to [{name, value, count}] */
export function toPaymentMix(data: any[]): any[] {
  return data.map(r => ({
    name: r.payment_method || '',
    value: Number(r.revenue) || 0,
    count: Number(r.orders) || 0,
    avgTicket: r.orders ? Math.round(Number(r.revenue) / Number(r.orders)) : 0,
  }));
}

/** Transform hourly from API [{sale_hour, revenue, orders}] */
export function toHourlySales(data: any[]): any[] {
  return data.map(r => ({
    hour: `${r.sale_hour || 0}${Number(r.sale_hour) < 12 ? 'AM' : 'PM'}`,
    sales: Number(r.revenue) || 0,
    orders: Number(r.orders) || 0,
  }));
}

/** Transform customers from API */
export function toCustomers(data: any[]): any[] {
  return data.map(r => ({
    name: r.customer_name || '',
    orders: Number(r.orders) || 0,
    revenue: Number(r.revenue) || 0,
    outstanding: Number(r.outstanding || r.avg_order) || 0,
    type: r.customer_type || '',
    city: r.customer_city || '',
    ...numericize(r),
  }));
}

/** Transform suppliers from API — uses field names expected by Procurement charts */
export function toSuppliers(data: any[]): any[] {
  return data.map(r => ({
    supplier: r.supplier_name || r.name || '',
    name: r.supplier_name || r.name || '',
    orders: Number(r.total_orders || r.orders) || 0,
    value: Number(r.total_value || r.revenue) || 0,
    products: Number(r.products) || 0,
    category: r.supplier_category || '',
    city: r.supplier_city || '',
    onTime: Number(r.on_time_pct || r.onTime) || 0,
    quality: Number(r.quality_pct || r.quality) || 0,
    rating: Number(r.rating) || 0,
    leadTime: Number(r.avg_lead_time || r.avg_days || r.leadTime) || 0,
    avgLeadTime: Number(r.avg_lead_time || r.avg_days) || 0,
    ...numericize(r),
  }));
}

/** Transform doctors from API */
export function toDoctors(data: any[]): any[] {
  return data.map(r => ({
    name: r.doctor_name || '',
    speciality: r.doctor_specialization || '',
    hospital: r.doctor_hospital || '',
    prescriptions: Number(r.prescriptions) || 0,
    revenue: Number(r.revenue) || 0,
    avgRxValue: Number(r.avg_rx_value) || 0,
    ...numericize(r),
  }));
}

/** Transform inventory overview from API */
export function toInventoryCategory(data: any[]): any[] {
  return data.map(r => ({
    category: r.product_category || '',
    value: Number(r.value || r.investment) || 0,
    qty: Number(r.qty) || 0,
    items: Number(r.items) || 0,
    ...numericize(r),
  }));
}
