import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.pnpm/**', '**/storybook-static/**', '**/*.js', '**/*.mjs', '**/*.cjs'] },

  // Base TS/TSX rules
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ─── App Boundary Isolation Rules ───
  {
    files: ['apps/merchant-dashboard/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
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
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@haa/merchant-dashboard', '@haa/merchant-dashboard/**'], message: 'Storefront must never import merchant-dashboard code.' },
          { group: ['@haa/admin-dashboard', '@haa/admin-dashboard/**'], message: 'Storefront must never import admin-dashboard code.' },
          { group: ['@haa/system-theme', '@haa/system-theme/**'], message: 'Storefront must never import system-theme (dashboard UI only).' },
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
);
