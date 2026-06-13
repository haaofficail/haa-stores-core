import { defineConfig } from 'vitest/config';
import path from 'path';

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
    },
  },
  test: {
    globals: true,
    include: ['tests/smoke.test.ts'],
  },
});
