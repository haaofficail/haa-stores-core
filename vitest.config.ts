import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@haa/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@haa/auth-core': path.resolve(__dirname, 'packages/auth-core/src'),
      '@haa/db': path.resolve(__dirname, 'packages/db/src'),
      '@haa/commerce-core': path.resolve(__dirname, 'packages/commerce-core/src'),
      '@haa/shipping-core': path.resolve(__dirname, 'packages/shipping-core/src'),
      '@haa/wallet-core': path.resolve(__dirname, 'packages/wallet-core/src'),
      '@haa/integration-core': path.resolve(__dirname, 'packages/integration-core/src'),
      '@haa/notification-core': path.resolve(__dirname, 'packages/notification-core/src'),
      '@haa/payment-providers': path.resolve(__dirname, 'packages/payment-providers/src'),
      '@haa/marketplace-core': path.resolve(__dirname, 'packages/marketplace-core/src'),
      '@haa/theme-system': path.resolve(__dirname, 'packages/theme-system/src'),
      '@haa/zatca-core': path.resolve(__dirname, 'packages/zatca-core/src'),
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Smoke test excluded from regular runs because it requires a running API server with seeded data.
    // Run manually with: pnpm smoke
    exclude: ['tests/smoke.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
