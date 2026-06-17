import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — Apple-level quality
 *
 * Tests critical user flows end-to-end in real browsers.
 * Runs against dev servers (already started by user with pnpm dev:all).
 *
 * Apple-level discipline:
 * - 5 critical flows per app
 * - Visual regression snapshots on key pages
 * - a11y checks via @axe-core/playwright (added if needed)
 * - Run on Chromium + Firefox + WebKit
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // run sequentially to avoid dev server overload
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/e2e/report' }],
  ],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox + WebKit optional — heavy install
  ],
  // Don't auto-start webServer — dev servers are already running
  webServer: undefined,
});
