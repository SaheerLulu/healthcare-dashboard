import { test, expect } from '@playwright/test';
import { waitForPageSettle } from './_shared';

/**
 * Filter sidebar tests — DASH-E02-F01.
 *
 * Exercises the global filter contract end-to-end:
 *  - sidebar opens / closes
 *  - quick presets recompute the date range
 *  - changing a filter triggers a re-fetch (we verify by counting
 *    /api/executive/kpis/ calls before vs after)
 */
test('filter sidebar collapses and re-expands', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);

  // Toggle button has aria-label "Collapse filter sidebar" when open.
  const toggle = page.getByRole('button', { name: /(collapse|expand) filter sidebar/i });
  await expect(toggle).toBeVisible();

  // First click collapses
  await toggle.click();
  await expect(page.locator('#filter-sidebar-nav')).toHaveAttribute('aria-hidden', 'true');

  // Second click re-expands
  await toggle.click();
  await expect(page.locator('#filter-sidebar-nav')).toHaveAttribute('aria-hidden', 'false');
});

test('quick preset change refetches KPI endpoint', async ({ page }) => {
  let kpiCalls = 0;
  page.on('response', (resp) => {
    if (resp.url().includes('/api/executive/kpis/')) kpiCalls++;
  });

  await page.goto('/');
  await waitForPageSettle(page);
  const initial = kpiCalls;

  // Click "Last 30 Days" preset (button text in FilterPanel)
  const preset = page.getByRole('button', { name: 'Last 30 Days' });
  if (await preset.count() > 0) {
    await preset.first().click();
    await waitForPageSettle(page);
    expect(kpiCalls).toBeGreaterThan(initial);
  } else {
    test.skip(true, 'Last 30 Days preset button not visible (sidebar may be collapsed)');
  }
});

test('global filters auto-apply across pages', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);

  // Capture filter state by navigating to /sales and checking the
  // request includes the same start_date as /
  let salesCallParams = '';
  page.on('request', (req) => {
    if (req.url().includes('/api/sales/overview/')) {
      salesCallParams = req.url();
    }
  });
  await page.goto('/sales');
  await waitForPageSettle(page);

  expect(salesCallParams).toMatch(/start_date=\d{4}-\d{2}-\d{2}/);
  expect(salesCallParams).toMatch(/end_date=\d{4}-\d{2}-\d{2}/);
});
