// Dashboard ↔ landing typography parity guard.
//
// Locks the three invariants behind feat(merchant): typography parity:
//   (1) merchant index.css aliases the primary text color to #1d1d1f
//       (matching landing's --text-primary; was #0f172a slate-900).
//   (2) at least one page h1 uses `text-2xl font-bold tracking-tight` —
//       the Apple-grade heading recipe shared with landing.
//   (3) no `text-slate-*` utility classes leak into pages/ — the dashboard
//       commits to the neutral palette to match landing.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PAGES_DIR = resolve(ROOT, 'apps/merchant-dashboard/src/pages');
const CSS_PATH = resolve(ROOT, 'apps/merchant-dashboard/src/index.css');
const PRODUCTS_PATH = resolve(PAGES_DIR, 'Products.tsx');

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walkTsx(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('Dashboard typography parity with landing', () => {
  it('CSS exposes --haa-text-primary: #1d1d1f (landing baseline)', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toMatch(/--haa-text-primary:\s*#1d1d1f/i);
  });

  it('Products page h1 uses text-2xl font-bold tracking-tight', () => {
    const src = readFileSync(PRODUCTS_PATH, 'utf-8');
    expect(src).toMatch(/<h1[^>]*className="[^"]*text-2xl[^"]*font-bold[^"]*tracking-tight[^"]*"/);
  });

  // Codex P2 feedback (PR #72 review): don't just check Products.tsx —
  // every page-level <h1> across the dashboard should adopt the same
  // tight tracking. Allow-list a handful of routes that use a custom
  // hero scale (onboarding hero, success celebration, AI assistant).
  it('every page-level h1 uses tracking-(tight|tighter) or is allow-listed', () => {
    const allowList = new Set<string>([
      'apps/merchant-dashboard/src/pages/OnboardingWizard.tsx',
      'apps/merchant-dashboard/src/pages/OnboardingSuccess.tsx',
      'apps/merchant-dashboard/src/pages/AiAssistant.tsx',
    ]);
    const offenders: string[] = [];
    for (const file of walkTsx(PAGES_DIR)) {
      const rel = file.replace(ROOT + '/', '');
      if (allowList.has(rel)) continue;
      const src = readFileSync(file, 'utf-8');
      const matches = [...src.matchAll(/<h1[^>]*className="([^"]+)"/g)];
      for (const m of matches) {
        const cls = m[1];
        if (!/tracking-(tight|tighter)/.test(cls)) {
          offenders.push(`${rel} → <h1 className="${cls.slice(0, 80)}…">`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('pages/ contains no text-slate-* utility classes', () => {
    const offenders: string[] = [];
    for (const file of walkTsx(PAGES_DIR)) {
      const src = readFileSync(file, 'utf-8');
      if (/\btext-slate-\d/.test(src)) offenders.push(file.replace(ROOT + '/', ''));
    }
    expect(offenders).toEqual([]);
  });
});
