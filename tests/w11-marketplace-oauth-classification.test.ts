// W11 (Autopilot Phase 3) — marketplace OAuth classification lock.
//
// Marketplace integrations (Salla, Zid, Amazon, Noon) use OAuth
// callbacks guarded by router-level requireAuth + requireStoreAccess.
// They are NOT signature-based webhooks. A common documentation error
// has been to lump them with /webhooks/* under the "public, no auth,
// verified by signature" bucket — that misclassification could lead a
// reviewer to skip auth checks on the OAuth flow.
//
// This test locks the correct classification in the RBAC coverage doc
// + asserts no comment elsewhere falsely calls them signature webhooks.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (e === 'node_modules' || e === 'dist' || e === '.turbo') continue;
      walk(full, acc);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Marketplace OAuth classification (W11)', () => {
  const rbac = readFileSync(resolve(ROOT, 'tests/rbac-coverage.test.ts'), 'utf-8');

  it('rbac-coverage classifies marketplace OAuth as auth+storeAccess (not signature webhooks)', () => {
    // Each of the 3 currently-implemented marketplace OAuth routers
    // must carry the auth+storeAccess annotation in the rbac doc.
    expect(rbac).toMatch(/marketplaces\/salla\.ts.*OAuth.*requireAuth.*requireStoreAccess/i);
    expect(rbac).toMatch(/marketplaces\/zid\.ts.*OAuth.*requireAuth.*requireStoreAccess/i);
    expect(rbac).toMatch(/marketplaces\/amazon\.ts.*OAuth.*requireAuth.*requireStoreAccess/i);
  });

  it('rbac-coverage distinguishes them from signature webhooks (webhooks.ts, shipping-webhooks.ts)', () => {
    // The webhooks files use verifyWebhookSignature + dedup — not OAuth.
    expect(rbac).toMatch(/webhooks\.ts.*verifyWebhookSignature/);
    expect(rbac).toMatch(/shipping-webhooks\.ts.*(verifyOtoWebhookSignature|signature)/);
  });

  it('no source file falsely describes marketplace OAuth as signature-based', () => {
    // Negative source-grep: a line that mentions a marketplace name
    // AND "signature" AND "webhook" in the same sentence is the
    // classic confusion. We allow it inside this test file (where
    // we're explicitly contrasting the two patterns).
    const offenders: string[] = [];
    const files = [
      ...walk(resolve(ROOT, 'apps/api/src')),
      ...walk(resolve(ROOT, 'docs')),
    ];
    for (const f of files) {
      if (f === resolve(ROOT, 'tests/rbac-coverage.test.ts')) continue;
      if (f.includes('w11-marketplace-oauth-classification')) continue;
      const txt = readFileSync(f, 'utf-8');
      for (const line of txt.split('\n')) {
        if (/\b(salla|zid|amazon|noon)\b/i.test(line) &&
            /\bsignature\b/i.test(line) &&
            /\bwebhook\b/i.test(line)) {
          offenders.push(`${f.replace(ROOT + '/', '')} — ${line.trim().slice(0, 120)}`);
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Marketplace OAuth misclassified as signature webhook:\n' + offenders.join('\n'),
      );
    }
    expect(offenders).toEqual([]);
  });

  it('rbac-coverage.test.ts file is reachable', () => {
    expect(existsSync(resolve(ROOT, 'tests/rbac-coverage.test.ts'))).toBe(true);
  });
});
