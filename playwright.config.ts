import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — Haa Stores critical-path scenarios.
 *
 * Tests live in `e2e/` and run against local CI servers by default.
 * To test shared staging manually, pass:
 *   E2E_BASE_URL=https://staging.haastores.com pnpm test:e2e
 *
 * Notes:
 * - Chromium only (CI speed; full cross-browser is out of scope here).
 * - CI should not hit shared staging: deploys can restart staging while tests
 *   are navigating, producing noisy ERR_ABORTED timeouts.
 */
const defaultBaseURL = process.env.CI
  ? 'http://localhost:5174'
  : 'https://staging.haastores.com';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || defaultBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
