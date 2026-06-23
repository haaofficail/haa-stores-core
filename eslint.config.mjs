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

  // P2-030 legacy `any` debt — fully cleaned 2026-06-23. The previous
  // file allow-list (`no-explicit-any: off` per file) has been emptied
  // and the override removed. `no-explicit-any: warn` now applies
  // uniformly; pre-commit `--max-warnings 0` keeps regressions out.

  // Test files and internal build scripts are out of scope for the
  // strict `no-explicit-any` rule:
  // - Tests routinely need `any` for mocks, partial fixtures, and
  //   asserting on shapes the SUT decides at runtime.
  // - Build scripts (token codegen for CSS/Swift/Kotlin/Figma) emit
  //   loosely-typed artifact descriptors; tightening them produces no
  //   runtime benefit and would force ~57 ad-hoc shape declarations.
  // The rule still applies everywhere else, and pre-commit
  // `--max-warnings 0` continues to catch regressions in app/package
  // source code.
  {
    files: [
      'tests/**/*.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
      'packages/tokens/scripts/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
