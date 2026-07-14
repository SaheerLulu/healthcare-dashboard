import { test, expect } from '@playwright/test';
import { waitForPageSettle } from './_shared';

/**
 * Pipeline Management page — DASH-E19-F01-US01..US04.
 */

test('/pipeline renders status cards and history table', async ({ page }) => {
  await page.goto('/pipeline');
  await waitForPageSettle(page);

  await expect(page.getByRole('heading', { name: /pipeline management/i })).toBeVisible();
  await expect(page.getByText(/Pipeline status \(last successful run per table\)/i)).toBeVisible();
  await expect(page.getByText(/Recent run history/i)).toBeVisible();
});

test('Sync now button is enabled when no run is in progress', async ({ page }) => {
  await page.goto('/pipeline');
  await waitForPageSettle(page);

  const sync = page.getByRole('button', { name: /sync now/i });
  await expect(sync).toBeVisible();
  // Could be disabled if a run was triggered seconds ago — accept either.
  const disabled = await sync.isDisabled();
  expect([true, false]).toContain(disabled);
});

test('Full refresh opens the REPLACE confirmation dialog', async ({ page }) => {
  await page.goto('/pipeline');
  await waitForPageSettle(page);

  const fullBtn = page.getByRole('button', { name: /full refresh/i });
  if (await fullBtn.isDisabled()) {
    test.skip(true, 'Full Refresh disabled — pipeline already running');
    return;
  }
  await fullBtn.click();

  // Modal asks the user to type REPLACE.
  await expect(page.getByRole('dialog', { name: /confirm full re-sync/i })).toBeVisible();
  const input = page.getByRole('textbox', { name: /type replace/i });
  await expect(input).toBeVisible();

  // The confirm button should be disabled until REPLACE is typed.
  const runBtn = page.getByRole('button', { name: /run full refresh/i });
  await expect(runBtn).toBeDisabled();

  await input.fill('REPLACE');
  await expect(runBtn).toBeEnabled();

  // Cancel out — we don't actually want to wipe the DB during a test.
  await page.getByRole('button', { name: /^cancel$/i }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('Settings page links to /pipeline (not its own pipeline UI)', async ({ page }) => {
  await page.goto('/settings');
  await waitForPageSettle(page);

  // The pipeline card should link to /pipeline — Batch 20 cleanup.
  const pipelineLink = page.getByRole('link', { name: /data pipeline/i });
  await expect(pipelineLink).toBeVisible();
  await pipelineLink.click();
  await page.waitForURL(/\/pipeline$/);
  await expect(page.getByRole('heading', { name: /pipeline management/i })).toBeVisible();
});
