/**
 * P1-1 audit fix: the rate limiter used to key on the LEFTMOST
 * X-Forwarded-For entry, which a client fully controls. Caddy has no
 * `trusted_proxies` configured — it APPENDS the real connecting IP to
 * X-Forwarded-For rather than replacing it, so the rightmost entry is
 * the one that's actually trustworthy in this single-hop deployment.
 * This test locks that: spoofing the leftmost entry must NOT change the
 * derived key.
 */
import { describe, it, expect } from 'vitest';
import { extractClientIp } from '../apps/api/src/middleware/rate-limiter';

function fakeContext(headers: Record<string, string | undefined>) {
  return {
    req: {
      header: (h: string) => headers[h.toLowerCase()],
    },
  } as any;
}

describe('extractClientIp', () => {
  it('uses the rightmost X-Forwarded-For entry (the hop Caddy appended)', () => {
    const c = fakeContext({ 'x-forwarded-for': '203.0.113.1, 198.51.100.7' });
    expect(extractClientIp(c)).toBe('198.51.100.7');
  });

  it('is immune to a spoofed leftmost entry — same real IP, different fake prefix, same key', () => {
    const c1 = fakeContext({ 'x-forwarded-for': 'attacker-fake-1, 198.51.100.7' });
    const c2 = fakeContext({ 'x-forwarded-for': 'attacker-fake-2, 198.51.100.7' });
    expect(extractClientIp(c1)).toBe(extractClientIp(c2));
    expect(extractClientIp(c1)).toBe('198.51.100.7');
  });

  it('prefers x-real-ip over x-forwarded-for when both are present', () => {
    const c = fakeContext({ 'x-real-ip': '198.51.100.9', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(extractClientIp(c)).toBe('198.51.100.9');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const c = fakeContext({});
    expect(extractClientIp(c)).toBe('unknown');
  });

  it('handles a single-entry X-Forwarded-For (direct connection, no upstream proxy chain)', () => {
    const c = fakeContext({ 'x-forwarded-for': '203.0.113.1' });
    expect(extractClientIp(c)).toBe('203.0.113.1');
  });
});
