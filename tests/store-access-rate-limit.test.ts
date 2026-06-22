// Store-access failure tracker — F-QA-B-NEXT / Wave 16 P2.
//
// Verifies the in-memory tracker + the wired denial path in
// `requireStoreAccess` without booting Hono (it isn't a root dep).
// We invoke the middleware factory directly with a hand-built fake
// context so we can assert status code, headers, and JSON body.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  requireStoreAccess,
  setStoreTenantResolver,
  setStoreAccessFailureTracker,
  createInMemoryStoreAccessFailureTracker,
} from '../packages/auth-core/src/index';

const AUTH = {
  userId: 42,
  tenantId: 7,
  activeStoreId: 1,
  roles: ['merchant_owner'],
  permissions: ['settings:read'],
};

interface FakeResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

function makeContext(opts: {
  storeId?: string;
  auth?: typeof AUTH | null;
  ip?: string;
}): { c: any; response: FakeResponse } {
  const response: FakeResponse = { status: 0, headers: {}, body: null };
  const c: any = {
    req: {
      param: (k: string) => (k === 'storeId' ? opts.storeId : undefined),
      header: (h: string) => {
        const lower = h.toLowerCase();
        if (lower === 'x-forwarded-for') return opts.ip ?? '203.0.113.1';
        return undefined;
      },
    },
    get: (k: string) => (k === 'auth' ? opts.auth ?? AUTH : undefined),
    header: (k: string, v: string) => {
      response.headers[k.toLowerCase()] = v;
    },
    json: (body: any, status: number) => {
      response.status = status;
      response.body = body;
      return body;
    },
  };
  return { c, response };
}

async function call(
  mw: ReturnType<typeof requireStoreAccess>,
  opts: Parameters<typeof makeContext>[0],
): Promise<FakeResponse & { passed: boolean }> {
  const { c, response } = makeContext(opts);
  let passed = false;
  await mw(c, async () => {
    passed = true;
  });
  if (passed && response.status === 0) response.status = 200;
  return { ...response, passed };
}

describe('Store-access failure tracker (F-QA-B-NEXT)', () => {
  beforeEach(() => {
    setStoreTenantResolver(async (storeId) => {
      if (storeId === 1) return 7;
      if (storeId === 999) return null;
      return 8;
    });
  });

  it('passes through when access is granted (no tracker hit)', async () => {
    const tracker = createInMemoryStoreAccessFailureTracker({ maxFailures: 2 });
    setStoreAccessFailureTracker(tracker);
    const mw = requireStoreAccess();

    const r = await call(mw, { storeId: '1' });
    expect(r.passed).toBe(true);
    expect(r.status).toBe(200);
    expect(tracker.size()).toBe(0);
  });

  it('returns 403 until budget is exceeded, then 429 with Retry-After', async () => {
    const tracker = createInMemoryStoreAccessFailureTracker({
      maxFailures: 2,
      windowMs: 60_000,
    });
    setStoreAccessFailureTracker(tracker);
    const mw = requireStoreAccess();

    const a = await call(mw, { storeId: '2' });
    expect(a.status).toBe(403);

    const b = await call(mw, { storeId: '3' });
    expect(b.status).toBe(403);

    const c = await call(mw, { storeId: '4' });
    expect(c.status).toBe(429);
    expect(c.headers['retry-after']).toMatch(/^\d+$/);
    expect(c.body.error.code).toBe('RATE_LIMITED');
  });

  it('counts not_found denials against the budget too', async () => {
    const tracker = createInMemoryStoreAccessFailureTracker({
      maxFailures: 1,
      windowMs: 60_000,
    });
    setStoreAccessFailureTracker(tracker);
    const mw = requireStoreAccess();

    const a = await call(mw, { storeId: '999' });
    expect(a.status).toBe(404);

    const b = await call(mw, { storeId: '999' });
    expect(b.status).toBe(429);
  });

  it('does NOT count invalid_id by default', async () => {
    const tracker = createInMemoryStoreAccessFailureTracker({ maxFailures: 1 });
    setStoreAccessFailureTracker(tracker);
    const mw = requireStoreAccess();

    const a = await call(mw, { storeId: 'abc' });
    expect(a.status).toBe(403);
    const b = await call(mw, { storeId: '-5' });
    expect(b.status).toBe(403);

    // First COUNTED denial — should still be 403, since invalid_id didn't
    // eat into the budget.
    const cResp = await call(mw, { storeId: '2' });
    expect(cResp.status).toBe(403);
  });

  it('different IPs do not share the same bucket', async () => {
    const tracker = createInMemoryStoreAccessFailureTracker({ maxFailures: 1 });
    setStoreAccessFailureTracker(tracker);
    const mw = requireStoreAccess();

    const a = await call(mw, { storeId: '2', ip: '203.0.113.1' });
    expect(a.status).toBe(403);
    const b = await call(mw, { storeId: '2', ip: '203.0.113.2' });
    expect(b.status).toBe(403);
  });

  it('bucket resets after the window elapses', async () => {
    let nowMs = 1_000_000;
    const tracker = createInMemoryStoreAccessFailureTracker({
      maxFailures: 1,
      windowMs: 30_000,
      now: () => nowMs,
    });
    setStoreAccessFailureTracker(tracker);
    const mw = requireStoreAccess();

    const a = await call(mw, { storeId: '2' });
    expect(a.status).toBe(403);
    const b = await call(mw, { storeId: '2' });
    expect(b.status).toBe(429);

    nowMs += 31_000;
    const c = await call(mw, { storeId: '2' });
    expect(c.status).toBe(403);
  });

  it('passing null clears the tracker (no 429 path)', async () => {
    const tracker = createInMemoryStoreAccessFailureTracker({ maxFailures: 1 });
    setStoreAccessFailureTracker(tracker);
    setStoreAccessFailureTracker(null);
    const mw = requireStoreAccess();

    const a = await call(mw, { storeId: '2' });
    expect(a.status).toBe(403);
    const b = await call(mw, { storeId: '2' });
    expect(b.status).toBe(403);
  });
});
