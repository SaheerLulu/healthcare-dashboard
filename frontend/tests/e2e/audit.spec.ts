import { test, expect } from '@playwright/test';
import { waitForPageSettle } from './_shared';

/**
 * Audit & Data Health — Batches 11 + 16.
 */

test('/audit shows reconciliation status with three metrics', async ({ page }) => {
  await page.goto('/audit');
  await waitForPageSettle(page);

  await expect(page.getByText(/reconciliation status/i)).toBeVisible();
  // Three rows: sales_revenue, gst_net_liability, cash_position
  await expect(page.getByText('sales_revenue')).toBeVisible();
  await expect(page.getByText('gst_net_liability')).toBeVisible();
  await expect(page.getByText('cash_position')).toBeVisible();
});

test('/audit overall verdict pill is one of pass/amber/fail/n/a', async ({ page }) => {
  await page.goto('/audit');
  await waitForPageSettle(page);

  const pill = page.getByText(/^Overall/i).locator('..');
  // The pill text must be one of the four allowed verdicts.
  const text = (await pill.textContent()) || '';
  expect(text.toLowerCase()).toMatch(/(pass|amber|fail|n\/a)/);
});

test('/audit data quality progress bars render', async ({ page }) => {
  await page.goto('/audit');
  await waitForPageSettle(page);

  await expect(page.getByText(/data quality metrics/i)).toBeVisible();
});
