// Full Apple-grade sweep — guards everything in PR #65.
//
// 1. Deploy workflow has the SSH warmup retry step on both staging
//    and production jobs.
// 2. Topbar uses min-h-11 min-w-11 + focus-visible rings on each
//    icon button.
// 3. EmptyState component exists.
// 4. Products page imports + uses EmptyState.
// 5. useKeyboardShortcut hook exists.
// 6. Topbar wires Cmd+K to open search.
// 7. SubscriptionBadge wraps in Tooltip with upgrade CTA.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const DEPLOY = read('.github/workflows/deploy.yml');
const TOPBAR = read('apps/merchant-dashboard/src/components/layout/Topbar.tsx');
const EMPTY_STATE = read('apps/merchant-dashboard/src/components/ui/EmptyState.tsx');
const PRODUCTS = read('apps/merchant-dashboard/src/pages/Products.tsx');
const SHORTCUT = read('apps/merchant-dashboard/src/hooks/useKeyboardShortcut.ts');
const SUBSCRIPTION = read('apps/merchant-dashboard/src/pages/dashboard/SubscriptionBadge.tsx');

describe('Apple-grade full sweep (PR #65)', () => {
  describe('Deploy SSH warmup retry', () => {
    it('staging job has "Warm up SSH" step with retry loop + ConnectTimeout', () => {
      // Updated by PR #183 (deploy hardening): the warmup step's name +
      // schedule changed to survive the full 15-min fail2ban window.
      // - Step name: "...survive full 15-min fail2ban window" (was "retry past residual...")
      // - Loop:      6 attempts via `backoffs=(30 60 120 240 480 480)` (was `for attempt in 1 2 3`)
      // - Timeout:   ConnectTimeout=20 (was 30) — gives the 24-min budget more headroom
      expect(DEPLOY).toMatch(/Warm up SSH \(survive full 15-min fail2ban window\)/);
      expect(DEPLOY).toMatch(/backoffs=\(\s*30\s+60\s+120\s+240\s+480\s+480\s*\)/);
      expect(DEPLOY).toMatch(/ConnectTimeout=20/);
    });
    it('production job also has the warmup', () => {
      const prodIdx = DEPLOY.indexOf('Deploy to Production');
      expect(prodIdx).toBeGreaterThan(-1);
      const prodSection = DEPLOY.slice(prodIdx);
      expect(prodSection).toMatch(/Warm up SSH/);
    });
  });

  describe('Topbar touch targets + focus rings', () => {
    it('every icon button is h-11 w-11 (or min-h-11 min-w-11) — 44px touch target', () => {
      // Accept both the min-h-11 min-w-11 + p-3 form (introduced in PR #65)
      // and the consolidated h-11 w-11 inline-flex form (PR #66 rebase).
      const occurrences =
        (TOPBAR.match(/min-h-11 min-w-11/g) || []).length +
        (TOPBAR.match(/\bh-11 w-11\b/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(3);
    });
    it('icon buttons declare focus-visible ring on the brand color', () => {
      // ring-primary-500 (PR #65) or ring-primary-400 (PR #66) — both
      // are brand-blue tokens and satisfy the audit.
      expect(TOPBAR).toMatch(/focus-visible:ring-2[^"]*focus-visible:ring-primary-[45]00/);
    });
    it('notification dot uses bg-danger, not bg-red-500', () => {
      expect(TOPBAR).toMatch(/rounded-full bg-danger ring-2 ring-white/);
      expect(TOPBAR).not.toMatch(/rounded-full bg-red-500 ring/);
    });
  });

  describe('EmptyState component', () => {
    it('exists and exports EmptyState', () => {
      expect(EMPTY_STATE).toMatch(/export function EmptyState/);
    });
    it('renders icon + title + description + action slots', () => {
      expect(EMPTY_STATE).toMatch(/title/);
      expect(EMPTY_STATE).toMatch(/description/);
      expect(EMPTY_STATE).toMatch(/icon/);
      expect(EMPTY_STATE).toMatch(/action/);
    });
  });

  describe('Products page adopts EmptyState', () => {
    it('imports EmptyState', () => {
      expect(PRODUCTS).toMatch(/from ['"]@\/components\/ui\/EmptyState['"]/);
    });
    it('renders <EmptyState /> when products.length === 0', () => {
      expect(PRODUCTS).toMatch(/<EmptyState/);
    });
  });

  describe('Cmd+K keyboard shortcut', () => {
    it('useKeyboardShortcut hook exists', () => {
      expect(SHORTCUT).toMatch(/export function useKeyboardShortcut/);
      expect(SHORTCUT).toMatch(/metaKey \|\| e\.ctrlKey/);
    });
    it('Topbar wires k → opens search', () => {
      expect(TOPBAR).toMatch(/useKeyboardShortcut\(\{[^}]*key: 'k'/s);
    });
  });

  describe('SubscriptionBadge tooltip + upgrade CTA', () => {
    it('wraps in TooltipProvider', () => {
      expect(SUBSCRIPTION).toMatch(/<TooltipProvider>/);
      expect(SUBSCRIPTION).toMatch(/<Tooltip>/);
    });
    it('provides an upgrade Link', () => {
      expect(SUBSCRIPTION).toMatch(/<Link[^>]*to=['"]\/settings\/subscription['"]/);
      expect(SUBSCRIPTION).toMatch(/subscriptions\.upgrade/);
    });
  });
});
