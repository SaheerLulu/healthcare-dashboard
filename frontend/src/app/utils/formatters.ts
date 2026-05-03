/**
 * Formats a number to Indian currency format (lakhs and crores)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with ₹ symbol
 */
export const formatIndianCurrency = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formats a number to abbreviated Indian currency (lakhs/crores).
 * Preserves sign — `-30000000` renders as `-₹3.00Cr`, not `₹-30000000`.
 */
export const formatIndianCurrencyAbbreviated = (value: number): string => {
  if (!isFinite(value as number)) return '₹0';
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);
  if (v >= 10000000) {
    return `${sign}₹${(v / 10000000).toFixed(2)}Cr`;
  } else if (v >= 100000) {
    return `${sign}₹${(v / 100000).toFixed(2)}L`;
  } else if (v >= 1000) {
    return `${sign}₹${(v / 1000).toFixed(1)}K`;
  } else {
    return `${sign}₹${v.toFixed(0)}`;
  }
};

/**
 * Formats a number with Indian number system grouping
 * @param value - The number to format
 * @returns Formatted string like 12,34,567
 */
export const formatIndianNumber = (value: number): string => {
  return new Intl.NumberFormat('en-IN').format(value);
};

/**
 * Formats a date to DD-MMM-YYYY format
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatIndianDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Formats a percentage with specified decimal places
 * @param value - The percentage value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like 19.6%
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Pick an axis short-format scale based on the magnitude of values in a series.
 * Returns a tickFormatter and the unit label.
 *   max ≥ 1Cr → 'X.XXCr'
 *   max ≥ 1L  → 'X.XXL'
 *   max ≥ 1K  → 'X.XXK'
 *   else      → 'X.XX'
 *
 * Use the SAME scale across the whole axis so ticks read consistently.
 */
export const pickAxisScale = (
  values: number[],
  opts?: { currency?: boolean }
): { format: (v: number) => string; unit: string; divisor: number } => {
  const finite = values.map((v) => Math.abs(Number(v) || 0)).filter((v) => isFinite(v));
  const max = finite.length ? Math.max(...finite) : 0;
  const prefix = opts?.currency ? '₹' : '';

  let unit: string;
  let divisor: number;
  if (max >= 10000000) {
    unit = 'Cr';
    divisor = 10000000;
  } else if (max >= 100000) {
    unit = 'L';
    divisor = 100000;
  } else if (max >= 1000) {
    unit = 'K';
    divisor = 1000;
  } else {
    unit = '';
    divisor = 1;
  }

  const format = (v: number) => {
    const n = Number(v) || 0;
    const sign = n < 0 ? '-' : '';
    const scaled = Math.abs(n) / divisor;
    return `${sign}${prefix}${scaled.toFixed(2)}${unit}`;
  };

  return { format, unit, divisor };
};

/**
 * Always full value (no abbreviation), 2 decimals — used in tooltips so users
 * see the actual number even when the axis shows abbreviated ticks.
 *   formatTooltipFull(123456.789) → '1,23,456.79'
 *   formatTooltipFull(123456.789, { currency: true }) → '₹1,23,456.79'
 */
export const formatTooltipFull = (
  value: number | string,
  opts?: { currency?: boolean; decimals?: number }
): string => {
  const n = Number(value);
  if (!isFinite(n)) return opts?.currency ? '₹0.00' : '0.00';
  const decimals = opts?.decimals ?? 2;
  const sign = n < 0 ? '-' : '';
  const formatted = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return opts?.currency ? `${sign}₹${formatted}` : `${sign}${formatted}`;
};

/**
 * Number-only short form (no ₹), 2 decimals — for non-currency axes (qty, days, %).
 *   formatNumberShort(1234567) → '12.35L'
 *   formatNumberShort(450) → '450.00'
 */
export const formatNumberShort = (value: number | string): string => {
  const n = Number(value);
  if (!isFinite(n)) return '0.00';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 10000000) return `${sign}${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `${sign}${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `${sign}${(v / 1000).toFixed(2)}K`;
  return `${sign}${v.toFixed(2)}`;
};
