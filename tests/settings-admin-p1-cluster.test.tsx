// Audit Part 5 — P1 settings/admin cluster.
//
// Four P1 findings from
// `docs/agent/audit/MD_PAGES_AUDIT_PART_5_SETTINGS_ADMIN.md` shipped in
// the same PR because they share zero data flow but all live in the
// "merchant admin" surface area and are each a single-file fix:
//
//   1) ApiKeys.tsx — freshly-minted plaintext key persists in React
//      state forever; needs an "I've saved this" gate + 5-minute
//      auto-clear timer + (already present) copy-to-clipboard + toast.
//   2) Employees.tsx — reads `Number(localStorage.getItem(
//      'active_store_id'))` directly. `Number(null) = 0` → silent 404
//      on `/merchant/0/employees`. Must use `useAuth().storeId`.
//   3) MigrationHub.tsx — 3× `await res.blob()` with NO `res.ok` check;
//      a 401/500 returns HTML/JSON that gets saved as `*.csv`/`*.txt`.
//      Pattern to mirror: `Exports.tsx:54`.
//   4) Imports.tsx — `importsApi.confirm()` must route through
//      `request()` so the auto-Idempotency-Key from PR #82 attaches on
//      the confirm POST. Double-tab Import = double inventory if it
//      uses raw fetch.
//
// All four are source-grep tests: cheaper than full render, immune to
// JSDOM CSS regressions, and they lock the bug fix to specific lines so
// a future refactor that re-introduces the bug fails the gate.
//
// What this test does NOT check:
//   - That the server actually rejects duplicate Idempotency-Key hits.
//     That's `apps/api/src/middleware/idempotency.ts` and is covered by
//     the API integration suite.
//   - The visual polish of the new "I've saved this" checkbox panel
//     (brand fidelity is a separate P3 finding in the same audit row).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const API_KEYS = read('apps/merchant-dashboard/src/pages/ApiKeys.tsx');
const EMPLOYEES = read('apps/merchant-dashboard/src/pages/Employees.tsx');
const MIGRATION = read('apps/merchant-dashboard/src/pages/MigrationHub.tsx');
const IMPORTS = read('apps/merchant-dashboard/src/pages/Imports.tsx');
const API_TS = read('apps/merchant-dashboard/src/lib/api.ts');

describe('Fix 1 — ApiKeys minted key auto-clear + save-confirm gate (P1)', () => {
  it('tracks an explicit "saved" confirmation state', () => {
    expect(API_KEYS).toMatch(/\bsavedConfirmed\b/);
    expect(API_KEYS).toMatch(/setSavedConfirmed\(/);
  });

  it('renders an "I have saved this key" checkbox bound to that state', () => {
    expect(API_KEYS).toMatch(/data-testid="newkey-saved-checkbox"/);
    expect(API_KEYS).toMatch(/checked=\{savedConfirmed\}/);
  });

  it('disables the dismiss button until the merchant confirms', () => {
    // The dismiss button (the XCircle) carries an explicit testid so a
    // future refactor that splits the panel still has to wire the gate.
    expect(API_KEYS).toMatch(/data-testid="newkey-dismiss"/);
    expect(API_KEYS).toMatch(/disabled=\{!savedConfirmed\}/);
  });

  it('declares a 5-minute auto-clear constant (5 * 60 * 1000)', () => {
    expect(API_KEYS).toMatch(/AUTO_CLEAR_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  });

  it('installs a setTimeout in a useEffect keyed on newKey that wipes the key', () => {
    // The cleanup function (clearTimeout) is mandatory — otherwise a
    // back-to-back mint leaks the previous timer.
    expect(API_KEYS).toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(!newKey\)\s*return/);
    expect(API_KEYS).toMatch(/setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?setNewKey\(null\)/);
    expect(API_KEYS).toMatch(/clearTimeout\(timer\)/);
  });

  it('exposes a copy-to-clipboard control with toast confirmation', () => {
    // Already present pre-fix but locked in for regression safety.
    expect(API_KEYS).toMatch(/navigator\.clipboard\.writeText\(newKey\)/);
    expect(API_KEYS).toMatch(/toast\.success\(t\('apikeys\.copied'\)\)/);
    expect(API_KEYS).toMatch(/data-testid="newkey-copy"/);
  });
});

describe('Fix 2 — Employees reads storeId from useAuth, not localStorage (P1)', () => {
  it('imports useAuth from the canonical hook path', () => {
    expect(EMPLOYEES).toMatch(/from\s+['"]@\/hooks\/useAuth['"]/);
  });

  it('destructures storeId from useAuth()', () => {
    expect(EMPLOYEES).toMatch(/const\s*\{\s*storeId\s*\}\s*=\s*useAuth\(\)/);
  });

  it('removes the direct localStorage read (Number(localStorage.getItem(...)))', () => {
    // The exact bad pattern that returned `0` for missing key. We forbid
    // it via a negative match — a future copy/paste from another page
    // would re-introduce the silent-404 bug.
    expect(EMPLOYEES).not.toMatch(
      /Number\(\s*localStorage\.getItem\(\s*['"]active_store_id['"]\s*\)\s*\)/,
    );
  });

  it('guards mutating handlers (handleSave, handleDelete) against null storeId', () => {
    // With useAuth() the type is `number | null`; both handlers must
    // short-circuit on null so we never POST to /merchant/null/...
    const handleSave = EMPLOYEES.slice(EMPLOYEES.indexOf('async function handleSave'));
    expect(handleSave).toMatch(/if\s*\(!storeId\)\s*return/);
    const handleDelete = EMPLOYEES.slice(EMPLOYEES.indexOf('async function handleDelete'));
    expect(handleDelete).toMatch(/if\s*\(!storeId\)\s*return/);
  });
});

describe('Fix 3 — MigrationHub checks res.ok before res.blob() (P1)', () => {
  it('declares a single shared downloadBlob helper (DRY)', () => {
    // The audit specifically calls out 3 duplicated sites
    // (`63-72, 82-91, 100-109`). The cleanest fix is to extract one
    // helper so the `res.ok` check can't drift across sites.
    expect(MIGRATION).toMatch(/const\s+downloadBlob\s*=\s*async/);
  });

  it('checks res.ok before calling res.blob()', () => {
    // The exact gap: a 401/500 body downloaded as CSV. The `if (!res.ok)`
    // guard MUST sit textually between the fetch and the blob extract.
    const helper = MIGRATION.slice(MIGRATION.indexOf('const downloadBlob'));
    const okIdx = helper.indexOf('if (!res.ok)');
    const blobIdx = helper.indexOf('res.blob()');
    expect(okIdx).toBeGreaterThan(-1);
    expect(blobIdx).toBeGreaterThan(-1);
    expect(okIdx).toBeLessThan(blobIdx);
  });

  it('throws ApiClientError on a failed response (so toast surfaces the message)', () => {
    expect(MIGRATION).toMatch(/throw\s+new\s+ApiClientError\(/);
  });

  it('all three download handlers go through downloadBlob (no raw fetch + blob path)', () => {
    // None of the three handlers should still call `res.blob()` directly
    // — they delegate to the helper.
    const template = MIGRATION.slice(
      MIGRATION.indexOf('handleDownloadTemplate'),
      MIGRATION.indexOf('handleDownloadGoogleFeed'),
    );
    const google = MIGRATION.slice(
      MIGRATION.indexOf('handleDownloadGoogleFeed'),
      MIGRATION.indexOf('handleDownloadMetaFeed'),
    );
    const meta = MIGRATION.slice(
      MIGRATION.indexOf('handleDownloadMetaFeed'),
      MIGRATION.indexOf('return ('),
    );
    for (const handler of [template, google, meta]) {
      expect(handler).toMatch(/downloadBlob\(/);
      expect(handler).not.toMatch(/await\s+res\.blob\(\)/);
    }
  });
});

describe('Fix 4 — Imports confirm uses importsApi.confirm() → request() → Idempotency-Key (P1)', () => {
  it('Imports.tsx calls importsApi.confirm (not raw fetch) on import', () => {
    // The confirm path is the inventory-mutating call. It MUST go
    // through the typed API helper so it inherits the central
    // Idempotency-Key.
    expect(IMPORTS).toMatch(/importsApi\.confirm\(\s*storeId\s*,\s*csvContent\s*\)/);
    // The import-confirm handler doesn't fall back to a raw fetch path.
    const handler = IMPORTS.slice(
      IMPORTS.indexOf('const handleImport'),
      IMPORTS.indexOf('return ('),
    );
    expect(handler).not.toMatch(/\bfetch\(/);
  });

  it('importsApi.confirm is wired through request() (not a raw fetch)', () => {
    // request() is the only function in api.ts that auto-attaches the
    // Idempotency-Key. Anything that bypasses it loses the guarantee.
    const confirmBlock = API_TS.slice(API_TS.indexOf('export const importsApi'));
    expect(confirmBlock).toMatch(/confirm:\s*\([^)]*\)\s*=>\s*\n?\s*request</);
    expect(confirmBlock).not.toMatch(/confirm:\s*\([^)]*\)\s*=>\s*\n?\s*fetch\(/);
  });

  it('request() still auto-attaches Idempotency-Key on POST (PR #82 contract holds)', () => {
    // Locks the upstream guarantee for this page. If a future refactor
    // breaks the central header, the Imports P1 silently regresses —
    // this test catches it next to the call-site test above.
    expect(API_TS).toMatch(/MUTATING_METHODS\s*=\s*new\s+Set\(/);
    expect(API_TS).toMatch(/headers\[\s*['"]Idempotency-Key['"]\s*\]\s*=/);
    expect(API_TS).toMatch(/crypto\.randomUUID\(\)/);
  });
});
