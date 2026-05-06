import { test, expect } from '@playwright/test';
import { waitForPageSettle } from './_shared';

/**
 * User preferences round-trip — DASH-E20-F02-US02 wired in Batch 17.
 *
 * Toggle the sidebar, reload, and verify the new state survives.
 */
test('sidebar collapsed state persists across reload', async ({ page }) => {
  // Start fresh: ensure sidebar is open initially by patching prefs to
  // sidebar_open=true and navigating.
  await page.goto('/');
  await waitForPageSettle(page);

  const toggle = page.getByRole('button', { name: /(collapse|expand) filter sidebar/i });
  // Capture current state
  const initial = (await page.locator('#filter-sidebar-nav').getAttribute('aria-hidden')) === 'true';
  await toggle.click();
  await waitForPageSettle(page);

  const afterToggle = (await page.locator('#filter-sidebar-nav').getAttribute('aria-hidden')) === 'true';
  expect(afterToggle).not.toBe(initial);

  // Reload and check persistence
  await page.reload();
  await waitForPageSettle(page);
  const afterReload = (await page.locator('#filter-sidebar-nav').getAttribute('aria-hidden')) === 'true';
  expect(afterReload).toBe(afterToggle);

  // Restore for subsequent tests
  if (afterReload) {
    await page.getByRole('button', { name: /expand filter sidebar/i }).click();
  }
});

test('quick preset choice persists across reload', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);

  const preset = page.getByRole('button', { name: 'This Month' });
  if (await preset.count() === 0) {
    test.skip(true, 'This Month preset not visible (sidebar collapsed?)');
    return;
  }
  await preset.first().click();
  await waitForPageSettle(page);

  // Reload and confirm This Month is highlighted again. The presence
  // of the button with an "active" style is hard to assert without a
  // distinguishing class — instead, we look at the request params on
  // the next executive/kpis call.
  await page.reload();
  let params = '';
  page.on('request', (req) => {
    if (req.url().includes('/api/executive/kpis/') && !params) {
      params = req.url();
    }
  });
  await waitForPageSettle(page);
  // start_date should be the first of this month.
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  expect(params).toContain(`start_date=${firstOfMonth}`);

  // Restore default for subsequent tests
  await page.getByRole('button', { name: /Last 6 Months/i }).first().click();
});
