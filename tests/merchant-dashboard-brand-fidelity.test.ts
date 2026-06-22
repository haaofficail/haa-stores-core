// Merchant Dashboard — brand fidelity guard.
//
// Locks the rule that *dashboard chrome* (sidebar, topbar, KPI gradients,
// banners, action cards) stays on the Haa primary scale (#5c9cd5 →
// primary-50..primary-800) and does not creep into indigo/violet/sky.
//
// Two failure modes this prevents:
//   1. Re-introducing `indigo-*` gradients on dashboard chrome — the
//      original "two-brands" perception the platform owner flagged
//      ("لوحة التاجر لا يبدو أنها تستفيد من الثيم المركزي").
//   2. The platform logo silently disappearing from the Sidebar — the
//      old gradient-container + "ه" letter rendered the brand identity
//      as plain text instead of the platform logo. The guard pins the
//      Sidebar to load `/haa-logo-*.png` like Login does.
//
// What this guard does NOT lock:
//   - Marketplace-vendor brand colors (Zid/Salla gradients are vendor
//     property; the allow-list below carves them out).
//   - Semantic palette badges (AuditLogs / CustomerSegments / LiveRadar)
//     where indigo/violet/cyan/rose are deliberate per-category colors,
//     not chrome — those rows are in the allow-list.
//   - The pickup-ready / activeProducts KPI violet — semantic
//     differentiation between actions/cards (also allow-listed).
//
// If this test fails and the new indigo/violet is intentional (e.g. a
// new semantic category), add a precise allow-list entry below WITH a
// one-line justification.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MERCHANT_SRC = resolve(ROOT, 'apps/merchant-dashboard/src');

// Files where indigo/violet/sky may legitimately appear:
//   - marketplace vendor logos (Zid uses indigo-blue, etc.)
//   - semantic badge palettes (audit/segments/radar)
//   - intentional KPI/action semantic differentiation
const ALLOW_LIST = new Set<string>([
  // Marketplace vendor brand colors — vendor identity, not Haa chrome.
  'components/modals/MarketplaceGuideModal.tsx',
  'pages/MarketplaceGuide.tsx',
  'pages/Marketplaces.tsx',
  'pages/IntegrationHub.tsx',
  'pages/SyncLogs.tsx',
  // Semantic badge palettes — wider color set is deliberate per category.
  'pages/AuditLogs.tsx',
  'pages/CustomerSegments.tsx',
  'pages/LiveRadar.tsx',
  'pages/GrowthInsights.tsx',
  // Semantic variant tags — distinct from chrome.
  'components/products/ProductGrid.tsx',
  'components/products/ProductListTable.tsx',
  // Dashboard action / KPI semantic differentiation (pickup, activeProducts).
  // The chrome gradients (orders KPI, ship action, AI greeting) were
  // migrated off indigo; these two retain violet to keep distinct meaning
  // alongside primary-driven counterparts.
  'pages/dashboard/RecentActionableOrders.tsx',
  'pages/dashboard/NextActionBanner.tsx', // violet branch is for pickup item
  'pages/dashboard/hooks/useDashboardComputed.ts', // pickup item color
  'pages/dashboard/hooks/useDashboardData.ts', // activeProducts KPI
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
      walk(full, acc);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

// Match Tailwind utilities like `bg-indigo-500`, `text-indigo-700`,
// `from-indigo-400`, `to-indigo-600`, `via-indigo-500`, `shadow-indigo-500/25`,
// `ring-indigo-100`, `border-indigo-200`. We deliberately exclude bare
// `indigo` in comments by requiring the `-<num>` suffix in a class-string
// position (Tailwind palette ramp).
const INDIGO_RAMP = /\b(?:from|via|to|bg|text|border|ring|shadow|outline|placeholder|caret|decoration|stroke|fill|accent|divide)-indigo-\d{2,3}\b/;

describe('Merchant Dashboard — brand fidelity (Haa primary chrome)', () => {
  it('no chrome-level component uses indigo-* (use primary-* or add to allow-list)', () => {
    const files = walk(MERCHANT_SRC);
    const violations: string[] = [];
    for (const file of files) {
      const rel = file.replace(MERCHANT_SRC + '/', '');
      if (ALLOW_LIST.has(rel)) continue;
      const body = readFileSync(file, 'utf-8');
      if (INDIGO_RAMP.test(body)) {
        // Pull the offending lines for the failure message.
        const offending = body
          .split('\n')
          .map((line, idx) => ({ line, idx: idx + 1 }))
          .filter(({ line }) => INDIGO_RAMP.test(line));
        for (const o of offending) {
          violations.push(`${rel}:${o.idx} → ${o.line.trim().slice(0, 120)}`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        'Chrome-level indigo-* usage found in merchant-dashboard. Move to primary-* or add file to ALLOW_LIST with justification:\n' +
          violations.join('\n'),
      );
    }
    expect(violations).toEqual([]);
  });

  it('Sidebar.tsx renders the platform logo image (not a gradient + letter)', () => {
    const file = resolve(MERCHANT_SRC, 'components/layout/Sidebar.tsx');
    const text = readFileSync(file, 'utf-8');
    // Must reference the platform logo asset (any of the size variants).
    expect(text).toMatch(/\/haa-logo-(?:64|192|512)\.png/);
    // Must declare srcSet so the browser picks a size-appropriate variant.
    expect(text).toContain('srcSet=');
    // Must include sizes + explicit width/height to prevent CLS.
    expect(text).toMatch(/sizes=/);
    expect(text).toMatch(/width=\{?\d+\}?/);
    expect(text).toMatch(/height=\{?\d+\}?/);
    // Must include an onError fallback so the brand identity survives a
    // missing asset (offline, CDN miss).
    expect(text).toMatch(/onError=/);
  });

  it('Sidebar logo is decorative (alt="") — brand name is announced by adjacent text', () => {
    // Slice the first <img ...> block in Sidebar.tsx — that is the logo.
    const file = resolve(MERCHANT_SRC, 'components/layout/Sidebar.tsx');
    const text = readFileSync(file, 'utf-8');
    const imgStart = text.indexOf('<img');
    const imgEnd = text.indexOf('/>', imgStart);
    expect(imgStart).toBeGreaterThan(-1);
    expect(imgEnd).toBeGreaterThan(imgStart);
    const block = text.slice(imgStart, imgEnd + 2);
    expect(block).toMatch(/alt=""/);
    // Negative case: must NOT label the logo with the brand name (would
    // duplicate the adjacent <span>{t('app.title', 'متاجر هاء')}</span>).
    expect(block).not.toMatch(/alt="(?:متاجر هاء|هاء|Haa)"/);
  });

  // Pinned by `docs/agent/audit/MD_PAGES_AUDIT_PART_1_AUTH.md` Finding #1.
  // The original brand-fidelity guard above only catches Tailwind class
  // names — raw `#hex` colors in inline styles slipped through. The
  // OnboardingSuccess confetti hardcoded `#6366f1` (indigo-500) and
  // `#8b5cf6` (violet-500), bypassing the chrome check entirely.
  it('OnboardingSuccess.tsx confetti uses no raw indigo/violet hex (use --haa-primary-* tokens)', () => {
    const file = resolve(MERCHANT_SRC, 'pages/OnboardingSuccess.tsx');
    const text = readFileSync(file, 'utf-8');
    // Indigo-500 / violet-500 are the two specific hexes that drifted; the
    // assertion is intentionally narrow to avoid false positives on the
    // wider Tailwind ramp (those are caught by the chrome test above when
    // expressed as class names).
    expect(text).not.toMatch(/#6366f1/i);
    expect(text).not.toMatch(/#8b5cf6/i);
  });

  // Pinned by `docs/agent/audit/MD_PAGES_AUDIT_PART_1_AUTH.md` Finding #3.
  // WCAG 2.3.3: animation that is not essential MUST honor
  // `prefers-reduced-motion: reduce`. The confetti container must declare
  // a motion-reduce opt-out so vestibular-impaired users skip the
  // animation entirely.
  it('OnboardingSuccess.tsx confetti container honors prefers-reduced-motion', () => {
    const file = resolve(MERCHANT_SRC, 'pages/OnboardingSuccess.tsx');
    const text = readFileSync(file, 'utf-8');
    // Tailwind's `motion-reduce:hidden` compiles to
    // `@media (prefers-reduced-motion: reduce) { display: none }`.
    // Either form is acceptable; the regex covers both.
    const motionGate = /motion-reduce:hidden|prefers-reduced-motion:\s*reduce/;
    expect(text).toMatch(motionGate);
  });
});
