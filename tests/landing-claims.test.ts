// TASK-0038 P0-#2 — Landing page marketing claims tests
//
// Verifies the landing-claims config behavior:
//   - Default = 'unverified' (safe fallback for unverified claims)
//   - 'verified' returns the claim text
//   - 'disabled' returns empty text
//   - Env override (VITE_LANDING_CLAIMS) per-claim OR global
//   - isClaimEnabled() works for boolean gates
//
// This is the single most important legal-risk mitigation in
// the storefront. If a claim is not backed by data, it must NOT
// display the unverified text.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('landing-claims — config resolution', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = import.meta.env.VITE_LANDING_CLAIMS;
  });

  afterEach(() => {
    // Reset module cache so each test can re-import with fresh env
    vi.resetModules();
    if (originalEnv === undefined) {
      delete (import.meta.env as any).VITE_LANDING_CLAIMS;
    } else {
      (import.meta.env as any).VITE_LANDING_CLAIMS = originalEnv;
    }
  });

  it('default: unverified claims return the safe fallback text', async () => {
    delete (import.meta.env as any).VITE_LANDING_CLAIMS;
    const { getClaim } = await import('../apps/storefront/src/lib/landing-claims');

    expect(getClaim('merchantCount').text).toBe('انضم لمجتمع Haa');
    expect(getClaim('merchantCount').status).toBe('unverified');

    expect(getClaim('zeroCommission').text).toBe('عمولة 0% على الباقة المجانية');
    expect(getClaim('themeCount').text).toBe('ثيمات جاهزة للتخصيص');
    expect(getClaim('freeForever').text).toBe('باقة مجانية متاحة');
  });

  it('default: testimonials, live ticker, and govLogos are disabled', async () => {
    delete (import.meta.env as any).VITE_LANDING_CLAIMS;
    const { isClaimEnabled, getClaim } = await import('../apps/storefront/src/lib/landing-claims');

    expect(isClaimEnabled('testimonials')).toBe(false);
    expect(isClaimEnabled('liveTicker')).toBe(false);
    expect(isClaimEnabled('govLogos')).toBe(false);
    expect(getClaim('testimonials').text).toBe('');
    expect(getClaim('liveTicker').text).toBe('');
    expect(getClaim('govLogos').text).toBe('');
  });

  it('global verified override: all claims show the verified text', async () => {
    (import.meta.env as any).VITE_LANDING_CLAIMS = 'verified';
    const { getClaim } = await import('../apps/storefront/src/lib/landing-claims');

    expect(getClaim('merchantCount').text).toBe('2,400+');
    expect(getClaim('zeroCommission').text).toBe('0% عمولة');
    expect(getClaim('themeCount').text).toBe('4 ثيمات احترافية');
    expect(getClaim('freeForever').text).toBe('مجاني للأبد');
  });

  it('per-claim override via JSON env', async () => {
    // Only verify merchantCount, leave the rest unverified.
    (import.meta.env as any).VITE_LANDING_CLAIMS = JSON.stringify({
      merchantCount: 'verified',
    });
    const { getClaim } = await import('../apps/storefront/src/lib/landing-claims');

    expect(getClaim('merchantCount').text).toBe('2,400+');
    expect(getClaim('merchantCount').status).toBe('verified');

    // Other claims stay unverified
    expect(getClaim('zeroCommission').status).toBe('unverified');
    expect(getClaim('themeCount').text).toBe('ثيمات جاهزة للتخصيص');
  });

  it('disabled status returns empty text (used for testimonials + live ticker)', async () => {
    (import.meta.env as any).VITE_LANDING_CLAIMS = JSON.stringify({
      testimonials: 'disabled',
    });
    const { getClaim, isClaimEnabled } = await import('../apps/storefront/src/lib/landing-claims');

    expect(getClaim('testimonials').text).toBe('');
    expect(getClaim('testimonials').status).toBe('disabled');
    expect(isClaimEnabled('testimonials')).toBe(false);
  });

  it('invalid JSON env falls back to global unverified', async () => {
    (import.meta.env as any).VITE_LANDING_CLAIMS = '{not valid json';
    const { getClaim } = await import('../apps/storefront/src/lib/landing-claims');

    // globalStatus is the env value if it's a valid status keyword,
    // but the JSON parse will fail, so it falls back to 'unverified'.
    // However, since '{not valid json' is not a valid status keyword
    // (it doesn't match verified/unverified/disabled), the global
    // resolution is 'unverified' too.
    expect(getClaim('merchantCount').status).toBe('unverified');
    expect(getClaim('merchantCount').text).toBe('انضم لمجتمع Haa');
  });
});
