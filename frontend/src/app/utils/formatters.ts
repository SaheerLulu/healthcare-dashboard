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
