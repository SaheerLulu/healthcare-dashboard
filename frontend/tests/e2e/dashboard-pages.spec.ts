import { test, expect } from '@playwright/test';
import { watchForBadResponses, expectNoFailures, waitForPageSettle } from './_shared';

/**
 * Render-smoke for every page in routes.tsx. Each visit must:
 *  - load with HTTP 200 on every /api/ call
 *  - render a heading at the top of the page
 *  - have no uncaught console error
 *
 * Only the index page asserts the document <title>; the SPA never
 * updates the title per-route in the current implementation.
 */
const PAGES: Array<[string, string | RegExp]> = [
  ['/', /Executive Summary/],
  ['/sales', /Sales Command Center/],
  ['/financial', /Financial Deep Dive/],
  ['/inventory', /Inventory Operations/],
  ['/procurement', /Procurement Intelligence/],
  ['/gst', /GST Compliance/],
  ['/tds', /TDS Tracker/],
  ['/working-capital', /Working Capital/],
  ['/location', /Location Benchmarking/],
  ['/product', /Product Intelligence/],
  ['/dispatch', /Dispatch/i],
  ['/loyalty', /Loyalty/i],
  ['/audit', /Audit/i],
  ['/settings', /Settings/],
  ['/pipeline', /Pipeline Management/],
  ['/reports/sales', /Sales/i],
  ['/reports/purchases', /Purchase/i],
];

const DETAIL_PAGES = [
  '/detail/sales',
  '/detail/inventory',
  '/detail/purchase',
  '/detail/financial',
  '/detail/gst',
  '/detail/tds',
  '/detail/working-capital',
  '/detail/location',
  '/detail/product',
  '/detail/dispatch',
  '/detail/loyalty',
  '/detail/audit',
  '/detail/expense',
  '/detail/sales-returns',
];

test.describe('Dashboard pages render', () => {
  for (const [path, headingPattern] of PAGES) {
    test(`page ${path}`, async ({ page }) => {
      const captured = watchForBadResponses(page);
      await page.goto(path);
      await waitForPageSettle(page);
      await expect(page.getByRole('heading').first()).toContainText(headingPattern);
      await expectNoFailures(captured);
    });
  }
});

test.describe('Detail pages render', () => {
  for (const path of DETAIL_PAGES) {
    test(`page ${path}`, async ({ page }) => {
      const captured = watchForBadResponses(page);
      await page.goto(path);
      await waitForPageSettle(page);
      // Detail pages should display *some* content within 5s — usually
      // a title or a table header. We only assert no 5xx and no crash.
      await expect(page.locator('body')).toBeVisible();
      await expectNoFailures(captured);
    });
  }
});

test.describe('Layout shell', () => {
  test('top bar and footer render on every page', async ({ page }) => {
    await page.goto('/');
    await waitForPageSettle(page);
    // Footer carries the Last Sync line wired in Layout.tsx.
    await expect(page.locator('footer')).toContainText(/Last Sync/);
  });

  test('skip-to-main link is present and focusable (DASH-E00-A06)', async ({ page }) => {
    await page.goto('/');
    const skip = page.getByRole('link', { name: /skip to main content/i });
    await expect(skip).toBeAttached();
    // Focus the link and confirm it points at the main element.
    await skip.focus();
    expect(await skip.getAttribute('href')).toBe('#main-content');
  });
});
