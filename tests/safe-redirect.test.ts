import { describe, it, expect } from 'vitest';
import { isSafeRedirectUrl } from '../apps/storefront/src/lib/safe-redirect';

describe('isSafeRedirectUrl (QA CO5 / payment redirect safety)', () => {
  it('allows internal relative paths (dev fake 3DS)', () => {
    expect(isSafeRedirectUrl('/fake-3ds-challenge?x=1')).toBe(true);
    expect(isSafeRedirectUrl('/s/demo/order/ORD-1')).toBe(true);
  });
  it('allows absolute http(s) provider URLs', () => {
    expect(isSafeRedirectUrl('https://checkout.tabby.ai/abc')).toBe(true);
    expect(isSafeRedirectUrl('https://api.moyasar.com/v1/3ds')).toBe(true);
  });
  it('rejects javascript: and data: schemes (XSS)', () => {
    expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeRedirectUrl('blob:https://x/abc')).toBe(false);
  });
  it('rejects protocol-relative URLs (//evil.com)', () => {
    expect(isSafeRedirectUrl('//evil.com/phish')).toBe(false);
  });
  it('rejects empty/invalid/non-string', () => {
    expect(isSafeRedirectUrl('')).toBe(false);
    expect(isSafeRedirectUrl('   ')).toBe(false);
    expect(isSafeRedirectUrl(undefined as unknown as string)).toBe(false);
    expect(isSafeRedirectUrl(null as unknown as string)).toBe(false);
    expect(isSafeRedirectUrl('not a url')).toBe(false);
  });
});
