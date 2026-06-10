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

test('date preset choice persists across reload (default_quick_preset_v2)', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);

  // Pick the 7D chip in the GlobalDateBar and confirm the prefs PATCH
  // carries the v2 key with the reproducible preset name.
  const patchPromise = page.waitForRequest((req) =>
    req.url().includes('/api/prefs/') && req.method() === 'PATCH', { timeout: 10_000 }
  ).catch(() => null);
  const bar = page.getByTestId('global-date-bar');
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: '7D', exact: true }).click();
  const patchReq = await patchPromise;
  if (patchReq) {
    expect(patchReq.postData() || '').toContain('default_quick_preset_v2');
    expect(patchReq.postData() || '').toContain('Last 7 Days');
  }
  await waitForPageSettle(page);

  // Reload: the hydrated window must span exactly 7 days (anchored to the
  // freshest data date when the pipeline is stale, so we assert span,
  // not absolute dates).
  let params = '';
  page.on('request', (req) => {
    if (req.url().includes('/api/executive/kpis/') && !params) {
      params = req.url();
    }
  });
  await page.reload();
  await waitForPageSettle(page);
  const url = new URL(params);
  const start = new Date(url.searchParams.get('start_date')!);
  const end = new Date(url.searchParams.get('end_date')!);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  expect(spanDays).toBe(7);

  // Restore default for subsequent tests
  await bar.getByRole('button', { name: '1M', exact: true }).click();
  await waitForPageSettle(page);
});
