// HTTP Idempotency-Key middleware — F-QA-B-NEXT / Wave 18 P2.
//
// Verifies the middleware factory contract by invoking it directly with
// hand-built fake contexts — same pattern as
// `tests/store-access-rate-limit.test.ts`, since Hono is not a root dep.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  idempotencyKey,
  getIdempotencyKeyStats,
  resetIdempotencyKeyState,
} from '../apps/api/src/middleware/idempotency-key';

interface FakeRes {
  status: number;
  headers: Record<string, string>;
  body: string;
  replay: boolean;
}

function makeContext(opts: {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string;
}): { c: any; res: FakeRes } {
  const headers = opts.headers ?? {};
  const res: FakeRes = { status: 0, headers: {}, body: '', replay: false };
  let storedResponse: Response | undefined;
  const c: any = {
    req: {
      method: opts.method ?? 'POST',
      path: opts.path ?? '/test',
      header: (h: string) => {
        const lower = h.toLowerCase();
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === lower) return v;
        }
        return undefined;
      },
      text: async () => opts.body ?? '',
    },
    header: (k: string, v: string) => {
      res.headers[k.toLowerCase()] = v;
      if (k.toLowerCase() === 'idempotency-replay' && v === 'true') res.replay = true;
    },
    json: (body: any, status: number) => {
      res.status = status;
      res.body = JSON.stringify(body);
      storedResponse = new Response(res.body, {
        status,
        headers: { 'content-type': 'application/json' },
      });
      Object.defineProperty(c, 'res', { value: storedResponse, configurable: true });
      return storedResponse;
    },
    body: (b: string, status: number) => {
      res.status = status;
      res.body = b;
      return new Response(b, { status });
    },
    get res() {
      return storedResponse;
    },
  };
  return { c, res };
}

async function call(
  mw: ReturnType<typeof idempotencyKey>,
  ctxOpts: Parameters<typeof makeContext>[0],
  handler: (c: any) => Promise<void> | void = () => {},
): Promise<FakeRes> {
  const { c, res } = makeContext(ctxOpts);
  await mw(c, async () => {
    await handler(c);
  });
  return res;
}

describe('Idempotency-Key middleware (F-QA-B-NEXT)', () => {
  beforeEach(() => {
    resetIdempotencyKeyState();
  });

  it('passes through when header is missing and required=false', async () => {
    const mw = idempotencyKey();
    let handlerRan = false;
    await call(mw, { body: '{"x":1}' }, () => {
      handlerRan = true;
    });
    expect(handlerRan).toBe(true);
    expect(getIdempotencyKeyStats().total).toBe(0);
  });

  it('returns 400 when header is missing and required=true', async () => {
    const mw = idempotencyKey({ required: true });
    let handlerRan = false;
    const res = await call(mw, { body: '{}' }, () => {
      handlerRan = true;
    });
    expect(res.status).toBe(400);
    expect(res.body).toContain('IDEMPOTENCY_KEY_REQUIRED');
    expect(handlerRan).toBe(false);
    expect(getIdempotencyKeyStats().invalidKey).toBe(1);
  });

  it('returns 400 on a malformed key (too short)', async () => {
    const mw = idempotencyKey();
    const res = await call(
      mw,
      { headers: { 'Idempotency-Key': 'abc' }, body: '{}' },
      (c) => c.json({ ok: true }, 200),
    );
    expect(res.status).toBe(400);
    expect(res.body).toContain('IDEMPOTENCY_KEY_INVALID');
  });

  it('returns 400 on a malformed key (contains spaces)', async () => {
    const mw = idempotencyKey();
    const res = await call(
      mw,
      { headers: { 'Idempotency-Key': 'has space here long enough' }, body: '{}' },
      (c) => c.json({ ok: true }, 200),
    );
    expect(res.status).toBe(400);
  });

  it('caches a successful response and replays it on the same key+body', async () => {
    const mw = idempotencyKey();
    const key = '550e8400-e29b-41d4-a716-446655440000';

    let handlerCalls = 0;
    const r1 = await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{"a":1}' },
      (c) => {
        handlerCalls += 1;
        c.json({ refund: 100 }, 200);
      },
    );
    expect(r1.status).toBe(200);
    expect(handlerCalls).toBe(1);
    expect(r1.replay).toBe(false);

    const r2 = await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{"a":1}' },
      () => {
        handlerCalls += 1;
      },
    );
    expect(r2.status).toBe(200);
    expect(handlerCalls).toBe(1); // handler did NOT run on replay
    expect(r2.replay).toBe(true);
    expect(r2.body).toContain('refund');

    const stats = getIdempotencyKeyStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('returns 409 when the same key is reused with a different body', async () => {
    const mw = idempotencyKey();
    const key = '550e8400-e29b-41d4-a716-446655440000';

    await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{"a":1}' },
      (c) => c.json({ ok: true }, 200),
    );

    const r = await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{"a":99}' },
      (c) => c.json({ ok: true }, 200),
    );
    expect(r.status).toBe(409);
    expect(r.body).toContain('IDEMPOTENCY_KEY_CONFLICT');
    expect(getIdempotencyKeyStats().conflicts).toBe(1);
  });

  it('does NOT cache 4xx/5xx responses (transient failures retry-friendly)', async () => {
    const mw = idempotencyKey();
    const key = '550e8400-e29b-41d4-a716-446655440000';

    let calls = 0;
    await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{}' },
      (c) => {
        calls += 1;
        c.json({ error: 'transient' }, 500);
      },
    );

    // Same key + body again; since the prior response wasn't cached, the
    // handler must run a second time.
    await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{}' },
      (c) => {
        calls += 1;
        c.json({ ok: true }, 200);
      },
    );

    expect(calls).toBe(2);
  });

  it('different paths with the same key are isolated', async () => {
    const mw = idempotencyKey();
    const key = '550e8400-e29b-41d4-a716-446655440000';

    let aCalls = 0;
    let bCalls = 0;
    await call(
      mw,
      { path: '/route-a', headers: { 'Idempotency-Key': key }, body: '{}' },
      (c) => {
        aCalls += 1;
        c.json({ which: 'a' }, 200);
      },
    );
    await call(
      mw,
      { path: '/route-b', headers: { 'Idempotency-Key': key }, body: '{}' },
      (c) => {
        bCalls += 1;
        c.json({ which: 'b' }, 200);
      },
    );

    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
    expect(getIdempotencyKeyStats().misses).toBe(2);
  });

  it('cache expires after ttlMs', async () => {
    const mw = idempotencyKey({ ttlMs: 50 });
    const key = '550e8400-e29b-41d4-a716-446655440000';

    let calls = 0;
    await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{}' },
      (c) => {
        calls += 1;
        c.json({ ok: true }, 200);
      },
    );

    await new Promise((r) => setTimeout(r, 80));

    await call(
      mw,
      { headers: { 'Idempotency-Key': key }, body: '{}' },
      (c) => {
        calls += 1;
        c.json({ ok: true }, 200);
      },
    );
    expect(calls).toBe(2);
  });
});
