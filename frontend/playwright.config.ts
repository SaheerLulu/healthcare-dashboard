import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — DASH-E00-A06 (a11y) + DASH-E20-F01 (perf budget) + DASH-E16 (smoke).
 *
 * Two web-server entries spin up the whole stack so `npm run test:e2e`
 * is one command from a clean clone:
 *
 *   - Django backend on :8002 (runs migrations on boot, reuses the
 *     shared upstream SQLite path the frontend already proxies to).
 *   - Vite dev server on :5173 (proxies /api → :8002).
 *
 * Tests target Chromium by default — the dashboard's design budget is
 * Chrome/Edge primary per DASH-E00-A06 (Browser Support). Firefox and
 * WebKit projects are wired but commented out; flip them on once
 * Lighthouse parity is confirmed.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,        // Test DB isn't isolated per worker
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                  // Same reason — single SQLite file
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The frontend reads the JWT from localStorage; in dev,
    // DASHBOARD_REQUIRE_AUTH defaults to off so anonymous calls work.
    // If you flip it on locally, set the token here:
    // storageState: 'tests/e2e/.auth/state.json',
  },
  expect: {
    timeout: 10_000,
  },
  timeout: 60_000,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } },
    // },
  ],
  webServer: [
    {
      // Django backend. start.sh runs migrate + a full pipeline + the
      // server, but for E2E we want fast boot — assume the DB already
      // exists. If it doesn't, run `bash backend/start.sh` once first.
      command: 'python3 manage.py runserver 8002',
      cwd: '../backend',
      url: 'http://127.0.0.1:8002/api/health/',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
