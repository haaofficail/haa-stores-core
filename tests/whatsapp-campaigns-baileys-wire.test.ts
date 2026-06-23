// WhatsApp campaigns → Baileys wiring (WA-PR-4).
//
// Source-grep guard verifying the campaign send path now consults
// FEATURE_WHATSAPP_LIVE and prefers the Baileys runtime (WA-PR-3) over
// the legacy Unifonic SMS-gateway when the flag is on.
//
// What this guards:
//   - sendCampaign() reads FEATURE_WHATSAPP_LIVE.
//   - When live, it lazy-loads the Baileys send service + registry
//     (so the campaign worker doesn't pull Baileys at module-load).
//   - When the lazy load fails, the path falls back silently to the
//     existing Unifonic/deeplink contract — campaigns never throw.
//   - The Baileys path takes precedence over Unifonic when both are
//     available (prevents double-send via two transports).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SRC = readFileSync(
  resolve(ROOT, 'packages/commerce-core/src/whatsapp-campaigns.ts'),
  'utf-8',
);

describe('WhatsApp campaigns → Baileys wiring (WA-PR-4)', () => {
  it('reads FEATURE_WHATSAPP_LIVE inside sendCampaign', () => {
    expect(SRC).toMatch(/FEATURE_WHATSAPP_LIVE/);
  });

  it('lazy-imports the Baileys send service (not a top-level import)', () => {
    // Path is held in a variable to escape the circular dep + dynamic
    // import is resolved at runtime. The path-string constants and an
    // `await import(...)` must both be present.
    expect(SRC).toMatch(/['"]@haa\/api\/dist\/services\/whatsapp\/send-service\.js['"]/);
    expect(SRC).toMatch(/['"]@haa\/api\/dist\/services\/whatsapp\/registry\.js['"]/);
    expect(SRC).toMatch(/await import\(/);
    // Confirm there's no top-level static import of these modules.
    const topImports = SRC.split('\nclass ')[0] ?? SRC;
    expect(topImports).not.toMatch(/from\s+['"]@haa\/api\/dist\/services\/whatsapp/);
  });

  it('falls back silently when the lazy load fails (catch on the dynamic import)', () => {
    expect(SRC).toMatch(/\.catch\(\s*\(\)\s*=>\s*null\s*\)/);
  });

  it('Baileys path takes precedence over Unifonic when both available', () => {
    // The if-else chain inside the per-send loop must check
    // baileysSender BEFORE provider.isAvailable. Source-grep the order.
    const loopBody = SRC.slice(SRC.indexOf('for (const send of pending)'));
    const bIdx = loopBody.indexOf('baileysSender');
    const uIdx = loopBody.indexOf('provider.isAvailable');
    expect(bIdx).toBeGreaterThan(-1);
    expect(uIdx).toBeGreaterThan(bIdx);
  });

  it('never throws on Baileys failure (returns success:false; outer loop counts failure)', () => {
    expect(SRC).toMatch(/return\s*\{\s*success:\s*false[^}]*baileys_send_failed/);
  });
});
