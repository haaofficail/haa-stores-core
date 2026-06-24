// HAA-LEGAL-ENTITY — Owner-provided commercial registration for the
// Haa Stores operating entity. Source of truth lives in
// `packages/shared/src/legal/platform-entity.ts`.
//
// Two layers of coverage:
//
//   1. Behavioural — `PLATFORM_LEGAL_ENTITY` carries the correct CR,
//      a display line that includes both the legal name and the CR,
//      and a literal `'active'` status (compile-time `as const`).
//
//   2. Source-grep guards — the CR `7038798612` must live in EXACTLY
//      ONE place. The email template, landing page, and platform legal
//      page must import the constant; the merchant storefront footer
//      must NOT contain the platform CR (merchant CR is theirs).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('PLATFORM_LEGAL_ENTITY constant', () => {
  it('exposes the official commercial registration', () => {
    expect(PLATFORM_LEGAL_ENTITY.commercialRegistration).toBe('7038798612');
  });

  it('exposes the Arabic legal name', () => {
    expect(PLATFORM_LEGAL_ENTITY.legalNameAr).toBe('مؤسسة حرف الهاء التجارية');
  });

  it('exposes the entity type as establishment', () => {
    expect(PLATFORM_LEGAL_ENTITY.entityType).toBe('establishment');
  });

  it('exposes the issue date as 2024-04-08', () => {
    expect(PLATFORM_LEGAL_ENTITY.issueDate).toBe('2024-04-08');
  });

  it('marks the entity as active (literal type via `as const`)', () => {
    // Compile-time assertion: status must be the literal 'active'.
    const status: 'active' = PLATFORM_LEGAL_ENTITY.status;
    expect(status).toBe('active');
  });

  it('exposes a displayLine that includes both legal name and CR', () => {
    expect(PLATFORM_LEGAL_ENTITY.displayLine).toContain('مؤسسة حرف الهاء التجارية');
    expect(PLATFORM_LEGAL_ENTITY.displayLine).toContain('7038798612');
  });

  it('is frozen-shape via `as const` (compile-time)', () => {
    // Compile-time: all fields are literal types. Runtime assertion that
    // each field is a string (or 'active' literal) — assignment above
    // already validates the status literal.
    const entries = Object.entries(PLATFORM_LEGAL_ENTITY);
    for (const [, value] of entries) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('Single-source-of-truth source-grep', () => {
  it('email template imports PLATFORM_LEGAL_ENTITY from @haa/shared', () => {
    const src = read('packages/notification-core/src/email-template.ts');
    expect(src).toMatch(/import\s+\{[^}]*PLATFORM_LEGAL_ENTITY[^}]*\}\s+from\s+'@haa\/shared'/);
  });

  it('email template does NOT hardcode the CR string', () => {
    const src = read('packages/notification-core/src/email-template.ts');
    expect(src).not.toContain('7038798612');
  });

  it('landing page imports PLATFORM_LEGAL_ENTITY from @haa/shared', () => {
    const src = read('apps/storefront/src/pages/LandingPage.tsx');
    expect(src).toMatch(/import\s+\{[^}]*PLATFORM_LEGAL_ENTITY[^}]*\}\s+from\s+'@haa\/shared'/);
  });

  it('landing page does NOT hardcode the CR string', () => {
    const src = read('apps/storefront/src/pages/LandingPage.tsx');
    expect(src).not.toContain('7038798612');
  });

  it('platform legal page imports PLATFORM_LEGAL_ENTITY from @haa/shared', () => {
    const src = read('apps/storefront/src/pages/LegalPage.tsx');
    expect(src).toMatch(/import\s+\{[^}]*PLATFORM_LEGAL_ENTITY[^}]*\}\s+from\s+'@haa\/shared'/);
  });

  it('platform legal page does NOT hardcode the CR string', () => {
    const src = read('apps/storefront/src/pages/LegalPage.tsx');
    expect(src).not.toContain('7038798612');
  });

  it('merchant storefront Footer does NOT contain the platform CR (merchant CR is theirs)', () => {
    const src = read('apps/storefront/src/components/Footer.tsx');
    expect(src).not.toContain('7038798612');
  });
});
