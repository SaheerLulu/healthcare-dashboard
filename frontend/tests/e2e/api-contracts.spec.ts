import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Direct API contract tests — bypasses the SPA and hits the backend
 * via Playwright's request fixture. Verifies the new endpoints from
 * Batches 4, 11, 12, 13, 22 against the live DB.
 */
test.describe('API contracts (direct)', () => {
  let api: import('@playwright/test').APIRequestContext;
  test.beforeAll(async () => {
    api = await pwRequest.newContext({ baseURL: 'http://localhost:8002' });
  });
  test.afterAll(async () => { await api.dispose(); });

  test('GET /api/health/ returns ok', async () => {
    const resp = await api.get('/api/health/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.service).toBe('healthcare-dashboard');
    expect(body.status).toBe('ok');
    expect(body.checks.database.ok).toBe(true);
  });

  test('GET /api/health/data/ returns freshness payload', async () => {
    const resp = await api.get('/api/health/data/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('threshold_seconds');
    expect(body).toHaveProperty('overall');
    expect(body.threshold_seconds).toBe(15 * 60);
  });

  test('GET /api/inventory/days-of-cover/ returns sorted SKUs', async () => {
    const resp = await api.get('/api/inventory/days-of-cover/?limit=5');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('count');
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBe(true);
    if (body.results.length >= 2) {
      // Sorted ascending by days_of_cover.
      expect(body.results[0].days_of_cover).toBeLessThanOrEqual(body.results[1].days_of_cover);
    }
    if (body.results.length) {
      expect(['critical', 'low', 'ok']).toContain(body.results[0].urgency);
    }
  });

  test('GET /api/working-capital/runway/ returns runway envelope', async () => {
    const resp = await api.get('/api/working-capital/runway/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('current_cash');
    expect(body).toHaveProperty('avg_monthly_burn');
    expect(['critical', 'amber', 'healthy']).toContain(body.verdict);
  });

  test('GET /api/location/radar/ returns 0-100 normalised scores', async () => {
    const resp = await api.get('/api/location/radar/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.metrics).toEqual(['Revenue', 'Margin', 'Basket', 'Turnover', 'Return health']);
    if (body.series.length) {
      const scores = body.series[0].scores;
      for (const k of ['revenue', 'margin', 'basket', 'turnover', 'return_health']) {
        expect(scores[k]).toBeGreaterThanOrEqual(0);
        expect(scores[k]).toBeLessThanOrEqual(100);
      }
    }
  });

  test('GET /api/product/substitutability/ returns molecule analysis', async () => {
    const resp = await api.get('/api/product/substitutability/?limit=5');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('generic_revenue_share');
    expect(body).toHaveProperty('top1_concentration_avg');
    expect(body).toHaveProperty('molecules');
    expect(Array.isArray(body.molecules)).toBe(true);
  });

  test('GET /api/loyalty/rfm/ returns RFM segments', async () => {
    const resp = await api.get('/api/loyalty/rfm/?limit=5');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('segments');
    expect(body).toHaveProperty('customers');
    const segNames = body.segments.map((s: any) => s.segment);
    expect(segNames).toEqual(
      expect.arrayContaining(['Champions', 'Loyal', 'Potential', 'At-Risk', 'Lost', 'Hibernating']),
    );
  });

  test('GET /api/audit/anomalies/ returns triaged feed', async () => {
    const resp = await api.get('/api/audit/anomalies/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('count');
    expect(body).toHaveProperty('items');
    if (body.items.length) {
      expect(['high', 'medium', 'low']).toContain(body.items[0].severity);
    }
  });

  test('GET /api/reconcile/summary/ returns three-metric envelope', async () => {
    const resp = await api.get('/api/reconcile/summary/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(['pass', 'amber', 'fail', 'unknown']).toContain(body.overall);
    expect(body.items.length).toBe(3);
    const metrics = body.items.map((i: any) => i.metric);
    expect(metrics).toEqual(
      expect.arrayContaining(['sales_revenue', 'gst_net_liability', 'cash_position']),
    );
  });

  test('GET /api/prefs/ returns prefs envelope', async () => {
    const resp = await api.get('/api/prefs/');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('user_id');
    expect(body).toHaveProperty('prefs');
  });

  test('PATCH /api/prefs/ merges keys', async () => {
    // Round-trip: GET, PATCH a sentinel key, GET, ensure the value comes back.
    const sentinel = `e2e-${Date.now()}`;
    const patch = await api.patch('/api/prefs/', {
      data: { e2e_marker: sentinel },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(patch.status()).toBe(200);

    const after = await api.get('/api/prefs/');
    const body = await after.json();
    expect(body.prefs.e2e_marker).toBe(sentinel);

    // Clean up the sentinel
    await api.patch('/api/prefs/', {
      data: { e2e_marker: null },
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
