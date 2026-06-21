import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { resilientFetch } from '../packages/marketplace-core/src/resilient-fetch.ts';

const origFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = origFetch; vi.restoreAllMocks(); });

function res(status: number, headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : 'ok', { status, headers });
}

describe('resilientFetch (QA INT2/INT3/INT4)', () => {
  it('returns the response on first success (no retry)', async () => {
    const f = vi.fn().mockResolvedValue(res(200));
    globalThis.fetch = f as any;
    const r = await resilientFetch('https://x.test/a', { method: 'GET' });
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('INT3: retries on 429 for any method (POST included), then succeeds', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(res(429, { 'retry-after': '0' }))
      .mockResolvedValueOnce(res(200));
    globalThis.fetch = f as any;
    const r = await resilientFetch('https://x.test/a', { method: 'POST' }, { maxRetries: 2 });
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('INT4: does NOT retry 5xx for non-idempotent POST (avoids double-create)', async () => {
    const f = vi.fn().mockResolvedValue(res(503));
    globalThis.fetch = f as any;
    const r = await resilientFetch('https://x.test/a', { method: 'POST' }, { maxRetries: 2 });
    expect(r.status).toBe(503);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('INT4: retries 5xx for idempotent GET', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(res(500))
      .mockResolvedValueOnce(res(200));
    globalThis.fetch = f as any;
    const r = await resilientFetch('https://x.test/a', { method: 'GET' }, { maxRetries: 2, maxBackoffMs: 1 });
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('INT2: aborts on timeout and retries idempotent GET on network error', async () => {
    const f = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(res(200));
    globalThis.fetch = f as any;
    const r = await resilientFetch('https://x.test/a', { method: 'GET' }, { maxRetries: 1, maxBackoffMs: 1 });
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('INT4: propagates network error for POST without retry', async () => {
    const f = vi.fn().mockRejectedValue(new Error('boom'));
    globalThis.fetch = f as any;
    await expect(resilientFetch('https://x.test/a', { method: 'POST' }, { maxRetries: 2 }))
      .rejects.toThrow('boom');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('passes an AbortSignal to fetch (timeout wiring)', async () => {
    const f = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(res(200));
    });
    globalThis.fetch = f as any;
    await resilientFetch('https://x.test/a');
  });

  it('all four channel services route through resilientFetch', () => {
    for (const f of ['salla/salla-service', 'zid/zid-service', 'noon/noon-service', 'amazon/amazon-service']) {
      const src = readFileSync(new URL(`../packages/marketplace-core/src/${f}.ts`, import.meta.url), 'utf-8');
      expect(src, `${f} imports resilientFetch`).toContain("from '../resilient-fetch.js'");
      expect(src, `${f} has no bare fetch(`).not.toMatch(/(?<![\w.])fetch\(/);
    }
  });
});
