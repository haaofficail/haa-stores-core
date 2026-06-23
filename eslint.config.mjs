import tseslint from 'typescript-eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import drizzlePlugin from 'eslint-plugin-drizzle';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.pnpm/**', '**/storybook-static/**', '**/*.d.ts', '**/*.js', '**/*.mjs', '**/*.cjs', '.claude/**', '.serena/**'] },

  // Base TS/TSX rules
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooksPlugin,
      drizzle: drizzlePlugin,
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // P2-026 audit fix: was 'off', escalated to 'warn' so new `any`
      // doesn't silently land. Cannot go to 'error' yet — commerce-core
      // alone has 132 existing `any` usages (P2-030) that need a
      // file-by-file cleanup PR train. Pre-commit max-warnings is 0
      // for newly-changed code, so this catches regressions on touch.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-require-imports': 'off',
      // Loaded so eslint-disable comments in source files resolve correctly.
      // exhaustive-deps is warn (not error) — real violations are suppressed at call sites.
      'react-hooks/exhaustive-deps': 'warn',
      // enforce-delete-with-where is warn — call sites that need bypass use disable comments.
      // drizzleObjectName scopes the rule to real drizzle handles (db, tx) so native
      // Map/Set/URLSearchParams .delete() calls in app code are not false-flagged.
      'drizzle/enforce-delete-with-where': ['warn', { drizzleObjectName: ['db', 'tx'] }],
    },
  },

  // ─── App Boundary Isolation Rules ───
  {
    files: ['apps/merchant-dashboard/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        // DECISION-OS-009: dashboards must consume themes via the /server subpath only.
        // `paths` matches exact bare specifiers — `/server` subpaths are allowed.
        paths: [
          {
            name: '@haa/storefront-themes',
            message: 'Merchant dashboard must import via @haa/storefront-themes/server (DECISION-OS-009).',
          },
          {
            name: '@haa/theme-system',
            message: 'Merchant dashboard must use @haa/theme-system/server (DECISION-OS-009).',
          },
          {
            name: '@haa/theme-engine',
            message: 'Merchant dashboard must not import internal theme runtime packages (DECISION-OS-009).',
          },
          {
            name: '@haa/theme-web',
            message: 'Merchant dashboard must not import the theme-web preview package (DECISION-OS-009).',
          },
        ],
        patterns: [{
          group: ['@haa/storefront', '@haa/storefront/**'],
          message: 'Merchant dashboard must never import storefront app code. This breaks app boundary isolation.',
        }],
      }],
    },
  },

  {
    files: ['apps/storefront/src/**/*.{ts,tsx}'],
    rules: {
      // Boundary violations are hard errors — cross-app imports break isolation.
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@haa/merchant-dashboard', '@haa/merchant-dashboard/**'], message: 'Storefront must never import merchant-dashboard code.' },
          { group: ['@haa/admin-dashboard', '@haa/admin-dashboard/**'], message: 'Storefront must never import admin-dashboard code.' },
          { group: ['@haa/system-theme', '@haa/system-theme/**'], message: 'Storefront must never import system-theme (dashboard UI only).' },
        ],
      }],
      // P1-#5: lucide-react direct imports — warn only (many files still migrating to <Icon>).
      // The Icon wrapper (apps/storefront/src/components/ui/icon.tsx) enforces
      // the 24px/18px/16px size governance. Using a separate rule name allows
      // independent severity from the boundary-isolation errors above.
      '@typescript-eslint/no-restricted-imports': ['warn', {
        patterns: [
          { regex: '^lucide-react$', message: 'P1-#5: import icons via <Icon icon={...} /> from "@/components/ui/icon" instead of using lucide directly. This enforces the 24/18/16 icon size governance.' },
        ],
      }],
    },
  },

  {
    files: ['apps/admin-dashboard/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@haa/storefront', '@haa/storefront/**', '@haa/storefront-themes', '@haa/storefront-themes/**'], message: 'Admin dashboard must never import storefront theme code.' },
          { group: ['@haa/merchant-dashboard', '@haa/merchant-dashboard/**'], message: 'Admin dashboard must never import merchant-dashboard code.' },
        ],
      }],
    },
  },

  {
    files: ['packages/storefront-themes/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@haa/system-theme', '@haa/system-theme/**'], message: 'storefront-themes must never import system-theme.' }],
      }],
    },
  },

  {
    files: ['packages/system-theme/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@haa/storefront-themes', '@haa/storefront-themes/**'], message: 'system-theme must never import storefront theme packages.' },
          { group: ['@haa/theme-system', '@haa/theme-system/**'], message: 'system-theme must never import theme-system (storefront core engine).' },
        ],
      }],
    },
  },

  // ─── P2-030 legacy `any` debt — file allow-list ───
  // Files with pre-existing `any` usage that pre-date the P2-026
  // escalation (off → warn). New files MUST NOT be added here; this
  // list shrinks as P2-030 cleanup PRs land. Lint-staged max-warnings
  // is 0, and we'd otherwise be unable to touch any of these files
  // without first cleaning the entire file. Tracked: P2-030.
  {
    files: [
      'packages/commerce-core/src/loyalty.ts',
      'packages/commerce-core/src/orders.ts',
      'packages/commerce-core/src/outbound-webhook.ts',
      'packages/commerce-core/src/store-settings-service.ts',
      'packages/commerce-core/src/wallet-posting-service.ts',
      'packages/commerce-core/src/billing-settings-service.ts',
      'packages/integration-core/src/webhook.ts',
      'packages/integration-core/src/audit.ts',
      'packages/payment-providers/src/factory.ts',
      'packages/wallet-core/src/ledger.ts',
      'apps/api/src/routes/orders.ts',
      'apps/merchant-dashboard/src/lib/api.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
