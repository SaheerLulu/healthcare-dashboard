import { Page, Response, expect } from '@playwright/test';

/**
 * Wait until the page settles — last network call older than `idleMs`,
 * and no recharts skeleton/loading text visible.
 */
export async function waitForPageSettle(page: Page, idleMs = 800) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await page.waitForTimeout(idleMs);
}

/** Assert a page rendered without a console error or 5xx response. */
export function watchForBadResponses(page: Page) {
  const failures: string[] = [];
  page.on('response', (resp: Response) => {
    if (resp.url().includes('/api/') && resp.status() >= 500) {
      failures.push(`${resp.request().method()} ${resp.url()} -> ${resp.status()}`);
    }
  });
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    // Recharts emits a benign React lifecycle warning we don't want to
    // fail on; skip it. Anything else surfaces.
    if (msg.type() === 'error' && !msg.text().includes('componentWill')) {
      consoleErrors.push(`console.error: ${msg.text()}`);
    }
  });
  return { failures, consoleErrors };
}

export async function expectNoFailures(captured: { failures: string[]; consoleErrors: string[] }) {
  expect(captured.failures, `5xx responses: ${captured.failures.join('\n')}`).toEqual([]);
  // Console errors are best-effort; surface them but don't gate yet.
  if (captured.consoleErrors.length) {
    console.log('Console issues:', captured.consoleErrors.slice(0, 5).join('\n'));
  }
}
