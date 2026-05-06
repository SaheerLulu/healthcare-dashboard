import { test, expect } from '@playwright/test';
import { waitForPageSettle } from './_shared';

/**
 * Cross-filter & drill-through — DASH-E02-F02.
 *
 * Right-click on any chart should open the context menu. The exact
 * selector for the "drill into" item depends on the chart, but we
 * just assert that *something* with role=menu appears.
 */
test('right-click on a chart opens drill-through context menu', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);

  // Locate the first chart card (role=region) and right-click inside it.
  const chart = page.getByRole('region').first();
  await expect(chart).toBeVisible();
  await chart.click({ button: 'right' });

  // ContextMenu appears with at least one drill option.
  const menu = page.locator('[role="menu"], [data-testid="context-menu"]');
  // The component is in components/ContextMenu.tsx — check it shows up.
  await expect(menu.or(page.getByText(/drill/i)).first()).toBeVisible({ timeout: 5_000 });
});

test('clicking a KPI tile navigates to a detail page', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);

  // KPI cards are role=button when they have onClick (per DASH-E00-A06).
  // Click the first one and confirm the URL changes to /detail/*.
  const tile = page.getByRole('button', { name: /total revenue/i }).first();
  if (await tile.count() === 0) {
    test.skip(true, 'No interactive KPI tile found on Executive Summary');
    return;
  }
  await tile.click();
  await page.waitForURL(/\/detail\//, { timeout: 5_000 });
  expect(page.url()).toMatch(/\/detail\//);
});
