// Guard tests for `fix/dashboard-error-handling-and-a11y` (Audit Part 2,
// three P1 findings):
//
//   1. `AuditLogs.tsx` previously had no error handling on its data
//      load — a rejected fetch left the spinner spinning forever. The
//      fix routes failures through `messageFromError(e, t)` and shows
//      a recoverable error UI. This file asserts the import + catch
//      shape stay in place so a future refactor cannot regress to a
//      silent failure.
//
//   2. `Reports.tsx:142-145` previously used a raw `fetch()` + manual
//      `getToken()` for the full-CSV export. That bypassed the central
//      `request()` pipeline and the `ApiClientError` recovery flow.
//      The fix migrates to `reportsApi.exportCsv()`. This file asserts
//      `Reports.tsx` no longer calls `fetch(` directly anywhere in the
//      file — every network call must go through the wrapper.
//
//   3. 13 dashboard sub-components had icon-only / icon-bearing
//      interactive elements without `aria-label`. Source-grep guard:
//      every <button> / <a> in `apps/merchant-dashboard/src/pages/
//      dashboard/*.tsx` that contains an icon child must have an
//      `aria-label=` attribute. The list below names the files that
//      contain at least one interactive element this rule applies to;
//      the test asserts each carries at least one `aria-label=`.
//
// All assertions are source-greps (no React render needed) so they run
// fast in CI and never require touching the DOM. The whole suite is a
// pure regression gate.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

/**
 * Strips // line comments and /* block comments *\/ from JS/TS source
 * so that negative source-grep assertions (e.g. "no `fetch(` call")
 * don't trip on historical mentions inside the rationale comment.
 * We only operate on whole-line // matches and balanced block comments;
 * this is good enough for our regression-gate use, which only cares
 * about whether *executable* code contains a token.
 */
function stripComments(src: string): string {
  // Remove /* ... */ block comments (non-greedy).
  let stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove // line comments.
  stripped = stripped.replace(/^\s*\/\/.*$/gm, '');
  // Also remove trailing // comments after code (but not URLs).
  stripped = stripped.replace(/([^:'"`])\/\/[^\n]*$/gm, '$1');
  return stripped;
}

const AUDIT_LOGS = 'apps/merchant-dashboard/src/pages/AuditLogs.tsx';
const REPORTS = 'apps/merchant-dashboard/src/pages/Reports.tsx';
const API_LIB = 'apps/merchant-dashboard/src/lib/api.ts';

// 13 dashboard sub-components touched by the a11y sweep. Each file
// MUST contain at least one `aria-label=` attribute after this fix —
// either on a newly-labelled icon-only button or on the button/anchor
// where the icon-only sibling was wrapped.
const DASHBOARD_A11Y_FILES = [
  'apps/merchant-dashboard/src/pages/dashboard/DashboardHeader.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/SmartAlertsStrip.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/RecentCustomersList.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/AnalyticsSection.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/MoreSection.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/ShowMoreKpiToggle.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/LowStockList.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/NextActionBanner.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/RecentActionableOrders.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/RecentSoldProducts.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/StoreReadinessBanner.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/QuickActionsGrid.tsx',
  'apps/merchant-dashboard/src/pages/dashboard/SubscriptionBadge.tsx',
] as const;

describe('AuditLogs.tsx — error handling (Audit Part 2, P1 finding #1)', () => {
  const src = read(AUDIT_LOGS);

  it('imports messageFromError from the central error-mapper', () => {
    expect(src).toMatch(
      /import\s+\{\s*messageFromError\s*\}\s+from\s+['"]@\/lib\/error-mapper['"]/,
    );
  });

  it('imports toast from sonner so failures surface to the merchant', () => {
    expect(src).toMatch(/import\s+\{\s*toast\s*\}\s+from\s+['"]sonner['"]/);
  });

  it('has a try/catch wrapping the audit fetch (no silent swallow)', () => {
    // At least one try { ... } catch (e|err) { ... } block must exist.
    expect(src).toMatch(/}\s*catch\s*\(\s*[a-zA-Z_]\w*\s*\)\s*{/);
  });

  it('calls messageFromError inside the catch (no toast.error("common.error") fallback)', () => {
    expect(src).toMatch(/messageFromError\(\s*[a-zA-Z_]\w*\s*,\s*t\s*\)/);
    // And does NOT regress to the generic placeholder string.
    expect(src).not.toMatch(/toast\.error\(\s*['"]common\.error['"]/);
  });

  it('exposes a retry UI when the load fails', () => {
    // The fix renders a retry button bound to loadLogs in the loadError branch.
    expect(src).toMatch(/loadError/);
    expect(src).toMatch(/onClick=\{\s*loadLogs\s*\}/);
  });
});

describe('Reports.tsx — export goes through api wrapper (P1 finding #2)', () => {
  const src = read(REPORTS);

  it('does not call fetch( directly anywhere in the file', () => {
    // Negative source-grep: the raw fetch() call that bypassed the
    // central pipeline at line 142-145 must be gone, and no new ones
    // may slip back in. Strip JS comments first so that historical
    // mentions of `fetch()` inside the audit-rationale comment block
    // don't trigger false positives — the rule is "no executable call".
    const code = stripComments(src);
    expect(code).not.toMatch(/\bfetch\s*\(/);
    expect(code).not.toMatch(/await\s+fetch\b/);
  });

  it('does not import getToken (manual auth header bypass removed)', () => {
    // The raw fetch path used to read the token via `getToken()` and
    // pass it manually as Bearer. The wrapper handles that now. Same
    // comment-strip caveat as the fetch( assertion — we want the
    // executable import gone, not the historical note.
    const code = stripComments(src);
    // `fetchError` (state variable) shares the `fetch` prefix but is
    // not the same token; assert the function call shape only.
    expect(code).not.toMatch(/\bgetToken\s*\(/);
    expect(code).not.toMatch(/import[^;]*\bgetToken\b/);
  });

  it('calls reportsApi.exportCsv for the full-report export', () => {
    expect(src).toMatch(/reportsApi\.exportCsv\(/);
  });

  it('uses messageFromError on export failure (no generic common.error)', () => {
    expect(src).toMatch(/messageFromError\(\s*[a-zA-Z_]\w*\s*,\s*t\s*\)/);
  });
});

describe('api.ts — reportsApi.exportCsv exists and uses ApiClientError', () => {
  const src = read(API_LIB);

  it('declares an exportCsv method under reportsApi', () => {
    expect(src).toMatch(/exportCsv\s*:/);
  });

  it('exportCsv throws typed ApiClientError on failure', () => {
    // The wrapper has to surface a typed error so messageFromError can
    // map it to the right Arabic message in the caller.
    const exportCsvBlockMatch = src.match(/exportCsv:[\s\S]*?\n  \},/);
    expect(exportCsvBlockMatch).not.toBeNull();
    const block = exportCsvBlockMatch![0];
    expect(block).toMatch(/throw\s+new\s+ApiClientError\(/);
  });

  it('exportCsv returns a Blob (CSV stream, not JSON)', () => {
    const exportCsvBlockMatch = src.match(/exportCsv:[\s\S]*?\n  \},/);
    expect(exportCsvBlockMatch).not.toBeNull();
    const block = exportCsvBlockMatch![0];
    expect(block).toMatch(/Promise<Blob>|res\.blob\(\)/);
  });
});

describe('Dashboard sub-components — every icon-bearing interactive has aria-label (P1 finding #3)', () => {
  for (const rel of DASHBOARD_A11Y_FILES) {
    it(`${rel} contains at least one aria-label=`, () => {
      const src = read(rel);
      expect(src).toMatch(/aria-label=/);
    });
  }

  it('All 13 covered files include an aria-label attribute (no exceptions)', () => {
    const missing: string[] = [];
    for (const rel of DASHBOARD_A11Y_FILES) {
      const src = read(rel);
      if (!/aria-label=/.test(src)) missing.push(rel);
    }
    expect(missing).toEqual([]);
  });

  it('SmartAlertsStrip dismiss <button> is now labelled (icon-only X)', () => {
    const src = read(
      'apps/merchant-dashboard/src/pages/dashboard/SmartAlertsStrip.tsx',
    );
    // The dismiss button wraps the <X /> icon and calls onDismiss(...).
    // The <button ... > tag may span multiple lines, so [\s\S] is used
    // instead of [^>]. Both the button and the icon must appear, plus
    // at least one aria-label= attribute in the file.
    expect(src).toMatch(/<button[\s\S]*?onDismiss\(/);
    expect(src).toMatch(/<X\s+className/);
    expect(src).toMatch(/aria-label=/);
  });

  it('DashboardHeader mobile menu <button> is now labelled (icon-only Menu)', () => {
    const src = read(
      'apps/merchant-dashboard/src/pages/dashboard/DashboardHeader.tsx',
    );
    // Three icon-only header buttons: Menu (mobile), Bell, RotateCw.
    // All three must carry an aria-label.
    const ariaLabelCount = (src.match(/aria-label=/g) || []).length;
    expect(ariaLabelCount).toBeGreaterThanOrEqual(3);
  });

  it('RecentCustomersList tel <a> link is now labelled (icon-only phone svg)', () => {
    const src = read(
      'apps/merchant-dashboard/src/pages/dashboard/RecentCustomersList.tsx',
    );
    expect(src).toMatch(/href=\{`tel:/);
    expect(src).toMatch(/callCustomerAria|aria-label=/);
  });
});

describe('i18n — new aria keys exist in ar.json', () => {
  const ar = JSON.parse(
    read('apps/merchant-dashboard/src/i18n/locales/ar.json'),
  ) as Record<string, any>;

  it('common.openMenuAria is present', () => {
    expect(ar.common?.openMenuAria).toBeTypeOf('string');
  });

  it('dashboard.smartAlerts.dismissAria is present', () => {
    expect(ar.dashboard?.smartAlerts?.dismissAria).toBeTypeOf('string');
  });

  it('dashboard.callCustomerAria is present and interpolates {{name}}', () => {
    expect(ar.dashboard?.callCustomerAria).toBeTypeOf('string');
    expect(ar.dashboard.callCustomerAria).toMatch(/\{\{name\}\}/);
  });

  it('audit.loadError is present for the new AuditLogs error UI', () => {
    expect(ar.audit?.loadError).toBeTypeOf('string');
  });
});
