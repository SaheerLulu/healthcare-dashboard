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
 * Formats a number to abbreviated Indian currency (lakhs/crores)
 * @param value - The number to format
 * @returns Abbreviated string like ₹2.45L or ₹3.4Cr
 */
export const formatIndianCurrencyAbbreviated = (value: number): string => {
  if (value >= 10000000) {
    // Crores (1 Cr = 10,000,000)
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    // Lakhs (1 L = 100,000)
    return `₹${(value / 100000).toFixed(2)}L`;
  } else if (value >= 1000) {
    // Thousands
    return `₹${(value / 1000).toFixed(1)}K`;
  } else {
    return `₹${value.toFixed(0)}`;
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
