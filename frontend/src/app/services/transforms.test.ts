import { describe, it, expect } from 'vitest';
import {
  monthLabel,
  numericize,
  toMonthlyTrend,
  toChannelMix,
  toCategoryPie,
  toTopProducts,
  toPaymentMix,
} from './transforms';

describe('monthLabel', () => {
  it('formats YYYY-MM to short month', () => {
    expect(monthLabel('2026-01')).toBe('Jan');
    expect(monthLabel('2026-12')).toBe('Dec');
  });

  it('returns empty string on falsy input', () => {
    expect(monthLabel('')).toBe('');
  });

  it('falls back to original on unknown shape', () => {
    expect(monthLabel('weird')).toBe('weird');
  });
});

describe('numericize', () => {
  it('converts numeric strings to numbers', () => {
    const result = numericize({ revenue: '1500', qty: '10', name: 'Aspirin' });
    expect(result.revenue).toBe(1500);
    expect(result.qty).toBe(10);
    expect(result.name).toBe('Aspirin');
  });

  it('leaves empty strings alone', () => {
    const result = numericize({ revenue: '', name: 'X' });
    expect(result.revenue).toBe('');
  });

  it('leaves non-numeric strings alone', () => {
    const result = numericize({ category: 'Antibiotic' });
    expect(result.category).toBe('Antibiotic');
  });
});

describe('toMonthlyTrend', () => {
  it('maps sale_month to month label and numericizes facts', () => {
    const out = toMonthlyTrend([
      { sale_month: '2026-01', revenue: '1000', profit: '300' },
      { sale_month: '2026-02', revenue: '1500', profit: '450' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].month).toBe('Jan');
    expect(out[0].revenue).toBe(1000);
    expect(out[1].month).toBe('Feb');
    expect(out[1].profit).toBe(450);
  });

  it('handles entry_month / purchase_month / period aliases', () => {
    expect(toMonthlyTrend([{ entry_month: '2026-03', revenue: 1 }])[0].month).toBe('Mar');
    expect(toMonthlyTrend([{ purchase_month: '2026-04', revenue: 1 }])[0].month).toBe('Apr');
    expect(toMonthlyTrend([{ period: '2026-05', revenue: 1 }])[0].month).toBe('May');
  });
});

describe('toChannelMix', () => {
  it('pivots rows into {month, POS, B2B}', () => {
    const out = toChannelMix([
      { sale_month: '2026-01', channel: 'POS', revenue: 100 },
      { sale_month: '2026-01', channel: 'B2B', revenue: 200 },
      { sale_month: '2026-02', channel: 'POS', revenue: 150 },
    ]);
    expect(out).toEqual([
      { month: 'Jan', POS: 100, B2B: 200 },
      { month: 'Feb', POS: 150, B2B: 0 },
    ]);
  });

  it('keeps zero for missing channels', () => {
    const out = toChannelMix([{ sale_month: '2026-01', channel: 'POS', revenue: 100 }]);
    expect(out[0].B2B).toBe(0);
  });
});

describe('toCategoryPie', () => {
  it('shapes to {name, value, orders}', () => {
    const out = toCategoryPie([
      { product_category: 'Antibiotic', revenue: 5000, qty: 100 },
      { product_category: 'Tonic', revenue: 1000, qty: 30 },
    ]);
    expect(out[0]).toMatchObject({ name: 'Antibiotic', value: 5000, orders: 100 });
    expect(out[1]).toMatchObject({ name: 'Tonic', value: 1000, orders: 30 });
  });
});

describe('toTopProducts', () => {
  it('computes margin% from explicit pct when given', () => {
    const out = toTopProducts([
      {
        product_name: 'Aspirin',
        revenue: 10000,
        margin_percent: 25,
        margin: 2500, // absolute rupees from backend
        qty: 100,
      },
    ]);
    expect(out[0].margin).toBe(25);
    expect(out[0].profit).toBe(2500);
    expect(out[0].name).toBe('Aspirin');
  });

  it('derives margin% from revenue + absolute profit when no pct field', () => {
    const out = toTopProducts([
      { product_name: 'Cetirizine', revenue: 1000, margin: 200, qty: 10 },
    ]);
    // 200 / 1000 * 100 = 20%
    expect(out[0].margin).toBeCloseTo(20, 1);
    expect(out[0].profit).toBe(200);
  });

  it('handles zero revenue without dividing by zero', () => {
    const out = toTopProducts([
      { product_name: 'X', revenue: 0, margin: 0, qty: 0 },
    ]);
    expect(out[0].margin).toBe(0);
  });
});

describe('toPaymentMix', () => {
  it('shapes to {name, value, count, avgTicket}', () => {
    const out = toPaymentMix([{ payment_method: 'Cash', revenue: 1000, orders: 10 }]);
    expect(out[0]).toMatchObject({
      name: 'Cash',
      value: 1000,
      count: 10,
      avgTicket: 100,
    });
  });

  it('avgTicket = 0 when orders = 0', () => {
    const out = toPaymentMix([{ payment_method: 'UPI', revenue: 500, orders: 0 }]);
    expect(out[0].avgTicket).toBe(0);
  });
});
