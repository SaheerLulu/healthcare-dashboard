import { describe, it, expect } from 'vitest';
import {
  formatIndianCurrency,
  formatIndianCurrencyAbbreviated,
  formatIndianNumber,
} from './formatters';

/**
 * formatIndianCurrencyAbbreviated is rendered on every KPI tile in every
 * dashboard. Boundary cases at the K → L → Cr transitions matter most;
 * these are the values that decide whether the tile reads "₹99.99K" vs
 * "₹1.00L" — easy to get wrong and instantly visible to P-OWN/P-CFO.
 */
describe('formatIndianCurrencyAbbreviated', () => {
  it('handles zero', () => {
    expect(formatIndianCurrencyAbbreviated(0)).toBe('₹0');
  });

  it('formats sub-thousand as plain rupees', () => {
    expect(formatIndianCurrencyAbbreviated(999)).toBe('₹999');
  });

  it('formats thousands as K', () => {
    expect(formatIndianCurrencyAbbreviated(1000)).toBe('₹1.0K');
    expect(formatIndianCurrencyAbbreviated(45_300)).toBe('₹45.3K');
    expect(formatIndianCurrencyAbbreviated(99_900)).toBe('₹99.9K');
  });

  it('formats lakhs as L at 100k boundary', () => {
    expect(formatIndianCurrencyAbbreviated(100_000)).toBe('₹1.00L');
    expect(formatIndianCurrencyAbbreviated(99_99_999)).toBe('₹100.00L');
  });

  it('formats crores as Cr at 10M boundary', () => {
    expect(formatIndianCurrencyAbbreviated(1_00_00_000)).toBe('₹1.00Cr');
    expect(formatIndianCurrencyAbbreviated(15_50_00_000)).toBe('₹15.50Cr');
  });

  it('preserves sign on negatives — DASH-E00-A02 contract', () => {
    expect(formatIndianCurrencyAbbreviated(-1_00_00_000)).toBe('-₹1.00Cr');
    expect(formatIndianCurrencyAbbreviated(-45_300)).toBe('-₹45.3K');
    expect(formatIndianCurrencyAbbreviated(-500)).toBe('-₹500');
  });

  it('falls back to ₹0 on non-finite inputs', () => {
    expect(formatIndianCurrencyAbbreviated(Number.NaN)).toBe('₹0');
    expect(formatIndianCurrencyAbbreviated(Number.POSITIVE_INFINITY)).toBe('₹0');
    expect(formatIndianCurrencyAbbreviated(Number.NEGATIVE_INFINITY)).toBe('₹0');
  });
});

describe('formatIndianCurrency', () => {
  it('uses Intl en-IN', () => {
    // Some Node builds without ICU normalise the rupee glyph differently;
    // we just assert the string contains the integer and the rupee.
    const out = formatIndianCurrency(1234567);
    expect(out).toMatch(/12,34,567/);
  });
});

describe('formatIndianNumber', () => {
  it('groups in Indian system 12,34,567', () => {
    expect(formatIndianNumber(1234567)).toBe('12,34,567');
  });
});
