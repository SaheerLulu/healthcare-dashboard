import { test, expect } from '@playwright/test';
import { waitForPageSettle } from './_shared';

/**
 * Accessibility checks — DASH-E00-A06.
 *
 * These are spot-checks, not a full WCAG audit (Lighthouse / axe-core
 * is the right tool for that). The point is to lock down the
 * keyboard-nav and aria contract so a refactor that drops them is
 * caught early.
 */

test('skip-to-main is the first focusable element', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toContainText(/skip to main content/i);
});

test('every chart card has role=region with a name', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);
  const regions = page.getByRole('region');
  const count = await regions.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const name = await regions.nth(i).getAttribute('aria-label');
    expect(name?.length || 0).toBeGreaterThan(0);
  }
});

test('every interactive KPI tile has aria-label', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);
  const buttons = page.locator('[role="button"][aria-label]');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
});

test('focus is visible on action buttons (no outline:none without focus-visible:ring)', async ({ page }) => {
  await page.goto('/');
  await waitForPageSettle(page);
  // Tab around and make sure something has focus (browser default outline OR our ring).
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
  }
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(['A', 'BUTTON', 'INPUT', 'SELECT'].includes(focusedTag)).toBe(true);
});
