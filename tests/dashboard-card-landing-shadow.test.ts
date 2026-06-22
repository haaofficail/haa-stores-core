// Dashboard ↔ landing card parity guard (feat/dashboard-card-shadow-parity).
//
// Verifies that the merchant-dashboard `shadow-card` / `shadow-card-hover`
// tokens match the values extracted live from staging.haastores.com
// (`.lp-pcard` / `.lp-card`), and that high-visibility card surfaces
// reference the shared `.dashboard-card` utility instead of duplicating
// the inline glass-card class chain.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('dashboard ↔ landing card parity', () => {
  it('tailwind.config defines landing-parity shadow-card tokens', () => {
    const cfg = read('apps/merchant-dashboard/tailwind.config.js');
    expect(cfg).toContain(
      "'card': '0 1px 3px 0 rgba(0,0,0,0.05), 0 10px 28px -14px rgba(0,0,0,0.12)'",
    );
    expect(cfg).toContain(
      "'card-hover': '0 2px 4px 0 rgba(0,0,0,0.06), 0 16px 36px -14px rgba(0,0,0,0.15)'",
    );
  });

  it('index.css exposes a .dashboard-card utility with the landing token chain', () => {
    const css = read('apps/merchant-dashboard/src/index.css');
    expect(css).toMatch(/\.dashboard-card\s*\{/);
    expect(css).toContain('rounded-3xl');
    expect(css).toContain('bg-white/80');
    expect(css).toContain('backdrop-blur-xl');
    expect(css).toContain('shadow-card');
    expect(css).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(css).toMatch(/\.dashboard-card:hover/);
    expect(css).toContain('shadow-card-hover');
  });

  it('high-visibility card files use the shared dashboard-card utility', () => {
    const files = [
      'apps/merchant-dashboard/src/pages/dashboard/StatsCards.tsx',
      'apps/merchant-dashboard/src/pages/dashboard/PrimaryKpiCards.tsx',
      'apps/merchant-dashboard/src/pages/Wallet.tsx',
      'apps/merchant-dashboard/src/pages/settings/sections/PublishSection.tsx',
      'apps/merchant-dashboard/src/pages/settings/sections/PaymentStatusSection.tsx',
    ];
    for (const f of files) {
      expect(read(f), `${f} should reference the dashboard-card utility`).toContain('dashboard-card');
    }
  });
});
