import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — Haa Stores critical-path scenarios.
 *
 * Tests live in `e2e/` and run against an externally provided base URL.
 * Do NOT run automatically against staging; trigger manually via:
 *   E2E_BASE_URL=https://staging.haastores.com pnpm test:e2e
 *
 * Notes:
 * - Chromium only (CI speed; full cross-browser is out of scope here).
 * - No CI workflow is wired up: E2E against shared staging during deploys
 *   creates noise + flakes. Owner decides when to schedule.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://staging.haastores.com',
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
