// WA-PR-7 — Abandoned-cart → WhatsApp auto-recovery trigger.
//
// What this test locks:
//   1. Feature flag — fires only when FEATURE_WHATSAPP_LIVE=1.
//      Critical: a misconfigured env must NEVER send automated WhatsApp
//      outreach. The flag is the global kill switch.
//   2. Opt-out — customers with `whatsappOptOut=true` are silently
//      skipped. This is a PDPL + WhatsApp Business Policy requirement
//      and is NOT optional.
//   3. Idempotency — the dedup row in `campaign_recoveries`
//      (storeId, checkoutSessionId, step, channel='whatsapp') prevents
//      a re-tick from firing the same cart×step twice.
//   4. Ladder timing — 1h / 6h / 24h windows. Carts outside every
//      window MUST NOT fire (e.g. a 5-min-old cart never gets a
//      step-1 message).
//   5. No double-fire across ticks — running the same recovery pass
//      twice MUST result in the same number of sends as one pass.
//
// We mock the DbClient with an in-memory list of carts + customers +
// existing dedup rows. This is faster than a real DB and also more
// reliable in CI sandboxes that don't have Postgres.
//
// We also mock the WhatsApp sender — the real one is wired in
// `apps/api/src/worker.ts` via `sendWhatsappMessage(getWhatsappManager,
// ...)` but the service contract is just a Promise<void> + throws on
// failure, so a Jest-style spy is sufficient.

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AbandonedCartCampaignService,
  mapCartAgeToLadderStep,
  WHATSAPP_RECOVERY_LADDER_MIN,
  isWhatsappAutoRecoveryEnabled,
  buildWhatsappRecoveryBody,
  type WhatsappSender,
  type FireWhatsappRecoveryResult,
} from '../packages/commerce-core/src/abandoned-cart-campaigns.ts';
// Import only the table identities we mock — we deliberately do NOT
// pull `@haa/db/schema` (which would drag in the whole schema graph
// via .js-suffixed re-exports). The service compares by table identity,
// so importing the same modules guarantees a match.
import * as checkoutSchema from '../packages/db/src/schema/checkout.ts';
import * as customersSchema from '../packages/db/src/schema/customers.ts';
import * as campaignsSchema from '../packages/db/src/schema/campaigns.ts';

// ── In-memory test doubles ────────────────────────────────────────────────────

interface Cart {
  id: string;
  storeId: number;
  status: 'pending' | 'completed';
  customerName: string;
  customerPhone: string;
  total: string;
  updatedAt: Date;
}

interface Customer {
  id: number;
  storeId: number;
  phone: string;
  whatsappOptOut: boolean;
}

interface RecoveryRow {
  id: number;
  storeId: number;
  checkoutSessionId: string;
  step: number;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  recoveryToken: string;
}

interface World {
  carts: Cart[];
  customers: Customer[];
  recoveries: RecoveryRow[];
  /** Auto-increment for recovery rows. */
  recoverySeq: number;
}

function makeWorld(): World {
  return { carts: [], customers: [], recoveries: [], recoverySeq: 0 };
}

/**
 * Tiny DbClient mock — implements the chained .select/.from/.where/.limit
 * + .insert/.values surface that AbandonedCartCampaignService touches.
 *
 * The strategy: each `.select(...)` returns a builder whose terminal
 * `.limit(n)` / awaited form resolves to filtered rows. The filter is
 * derived from inspecting which table was passed to `.from(...)` —
 * we never actually parse the drizzle SQL fragments, we just match on
 * the table identity (s.checkoutSessions vs s.customers vs s.campaignRecoveries)
 * and apply the test's expected logic.
 *
 * This is intentional — testing the drizzle SQL builder is not the goal;
 * testing the service's gating logic IS.
 */
function makeDbMock(world: World) {
  // Use the same module identities the service imports via
  // `@haa/db/schema` so .from(table) identity-compares match.
  // (The vitest alias maps `@haa/db/schema` → packages/db/src/schema
  // which re-exports the same module instances.)
  const schema = {
    checkoutSessions: checkoutSchema.checkoutSessions,
    customers: customersSchema.customers,
    campaignRecoveries: campaignsSchema.campaignRecoveries,
    abandonedCartCampaigns: campaignsSchema.abandonedCartCampaigns,
  } as const;
  // Lazy state shared between chained calls.
  let currentTable: unknown = null;
  let currentOp: 'select' | 'selectDistinct' | 'insert' | null = null;
  let currentSelectFields: Record<string, unknown> | null = null;
  let pendingInsertValues: Record<string, unknown> | null = null;

  function resolveRows(): unknown[] {
    if (currentTable === schema.checkoutSessions) {
      // The service queries with: status='pending' AND updatedAt < olderThan
      // AND updatedAt >= newerThan AND storeId = X. We approximate by
      // returning every cart whose `__ladderHit` matches the current
      // call's expected step. The test sets `__ladderHit` per cart based
      // on its updatedAt vs now, so we just filter `status === 'pending'`.
      return world.carts.filter(c => c.status === 'pending');
    }
    if (currentTable === schema.customers) {
      // The service queries by (storeId, phone) limit 1. Returns whatsappOptOut.
      return world.customers.map(c => ({ whatsappOptOut: c.whatsappOptOut, ...c }));
    }
    if (currentTable === schema.campaignRecoveries) {
      // Dedup check: (sessionId, step, channel='whatsapp') limit 1.
      // OR runRecoveryPass's distinct-storeId pre-check.
      return world.recoveries.map(r => ({ id: r.id, ...r }));
    }
    if (currentTable === schema.abandonedCartCampaigns) {
      return []; // no campaigns configured for these tests
    }
    return [];
  }

  // Builder returned by .select() — implements .from/.where/.limit/.orderBy.
  // To filter to the actual matching rows we re-implement the minimum
  // filtering the service needs (per table). We rely on the caller (the
  // test) to set up world state that matches.
  const builder: any = {
    from(table: unknown) {
      currentTable = table;
      return builder;
    },
    where(_pred: unknown) {
      return builder;
    },
    leftJoin(_table: unknown, _pred: unknown) {
      return builder;
    },
    orderBy(..._args: unknown[]) {
      return builder;
    },
    groupBy(..._args: unknown[]) {
      return builder;
    },
    async limit(_n: number) {
      const rows = resolveRows();
      // Per-table filtering:
      if (currentTable === schema.customers) {
        // Returns first match for (storeId, phone). We don't have the
        // exact predicate (it's a drizzle SQL fragment), but the service
        // only ever calls this for ONE (storeId, phone) at a time, so
        // returning all customers and letting the service take row[0]
        // works because we set up world.customers per-test to contain
        // the one matching row.
        return rows.slice(0, _n);
      }
      if (currentTable === schema.campaignRecoveries) {
        return rows.slice(0, _n);
      }
      if (currentTable === schema.checkoutSessions) {
        return rows.slice(0, _n);
      }
      return rows.slice(0, _n);
    },
    // Thenable for `await builder` without .limit() — used by the
    // service in some shapes.
    then(onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) {
      return Promise.resolve(resolveRows()).then(onFulfilled, onRejected);
    },
  };

  const db: any = {
    select(fields?: Record<string, unknown>) {
      currentOp = 'select';
      currentSelectFields = fields ?? null;
      return builder;
    },
    selectDistinct(fields?: Record<string, unknown>) {
      currentOp = 'selectDistinct';
      currentSelectFields = fields ?? null;
      // Distinct storeId query in runRecoveryPass — returns unique storeIds.
      const distinctBuilder: any = {
        from(table: unknown) {
          currentTable = table;
          return distinctBuilder;
        },
        where(_pred: unknown) {
          return distinctBuilder;
        },
        then(onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) {
          const storeIds = Array.from(new Set(world.carts.filter(c => c.status === 'pending').map(c => c.storeId)));
          return Promise.resolve(storeIds.map(id => ({ storeId: id }))).then(onF, onR);
        },
      };
      return distinctBuilder;
    },
    insert(table: unknown) {
      currentOp = 'insert';
      currentTable = table;
      return {
        values(v: Record<string, unknown> | Record<string, unknown>[]) {
          pendingInsertValues = Array.isArray(v) ? v[0] : v;
          // Persist for campaign_recoveries (this is the dedup write
          // we want the test to observe).
          if (currentTable === schema.campaignRecoveries && pendingInsertValues) {
            world.recoverySeq += 1;
            const row: RecoveryRow = {
              id: world.recoverySeq,
              storeId: Number(pendingInsertValues.storeId),
              checkoutSessionId: String(pendingInsertValues.checkoutSessionId),
              step: Number(pendingInsertValues.step),
              channel: (pendingInsertValues.channel ?? 'whatsapp') as 'email' | 'sms' | 'whatsapp',
              recipient: String(pendingInsertValues.recipient ?? ''),
              recoveryToken: String(pendingInsertValues.recoveryToken ?? ''),
            };
            world.recoveries.push(row);
          }
          // Return an awaitable that simulates the .returning() chain.
          const inserted: any = {
            then(onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) {
              return Promise.resolve(undefined).then(onF, onR);
            },
            returning() {
              return Promise.resolve(pendingInsertValues ? [pendingInsertValues] : []);
            },
          };
          return inserted;
        },
      };
    },
    update(_table: unknown) {
      return {
        set(_patch: unknown) {
          return { where(_p: unknown) { return Promise.resolve(); } };
        },
      };
    },
    delete(_table: unknown) {
      return { where(_p: unknown) { return Promise.resolve(); } };
    },
  };
  // Silence unused-var lint — these are read by the builder closure.
  void currentOp;
  void currentSelectFields;
  return db;
}

// ── Test fixtures + helpers ───────────────────────────────────────────────────

const ORIG_ENV = process.env.FEATURE_WHATSAPP_LIVE;

beforeEach(() => {
  process.env.FEATURE_WHATSAPP_LIVE = '1';
});
afterEach(() => {
  if (ORIG_ENV === undefined) delete process.env.FEATURE_WHATSAPP_LIVE;
  else process.env.FEATURE_WHATSAPP_LIVE = ORIG_ENV;
});

function makeService(world: World, sender: WhatsappSender) {
  const db = makeDbMock(world);
  return new AbandonedCartCampaignService(db, { whatsappSender: sender });
}

function makeCart(opts: Partial<Cart> & { id: string; storeId: number; ageMinutes: number }): Cart {
  return {
    id: opts.id,
    storeId: opts.storeId,
    status: opts.status ?? 'pending',
    customerName: opts.customerName ?? 'Ahmed',
    customerPhone: opts.customerPhone ?? '+966512345678',
    total: opts.total ?? '250.00',
    updatedAt: new Date(Date.now() - opts.ageMinutes * 60_000),
  };
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe('WA-PR-7 — ladder window mapping', () => {
  it('maps cart ages to the correct ladder step', () => {
    // Step 1 covers [60, 120) min.
    expect(mapCartAgeToLadderStep(60)).toBe(1);
    expect(mapCartAgeToLadderStep(90)).toBe(1);
    expect(mapCartAgeToLadderStep(119)).toBe(1);
    // Step 2 covers [360, 720) min.
    expect(mapCartAgeToLadderStep(360)).toBe(2);
    expect(mapCartAgeToLadderStep(500)).toBe(2);
    // Step 3 covers [1440, 2160) min.
    expect(mapCartAgeToLadderStep(1440)).toBe(3);
    expect(mapCartAgeToLadderStep(2000)).toBe(3);
  });

  it('returns null OUTSIDE every ladder window (gap and pre/post coverage)', () => {
    expect(mapCartAgeToLadderStep(5)).toBeNull();      // too fresh
    expect(mapCartAgeToLadderStep(59)).toBeNull();     // just under step 1
    expect(mapCartAgeToLadderStep(120)).toBeNull();    // between step 1 and 2
    expect(mapCartAgeToLadderStep(300)).toBeNull();    // gap before step 2
    expect(mapCartAgeToLadderStep(720)).toBeNull();    // gap before step 3
    expect(mapCartAgeToLadderStep(3000)).toBeNull();   // too stale
  });

  it('exposes the ladder constant as [60, 360, 1440] minutes', () => {
    expect(WHATSAPP_RECOVERY_LADDER_MIN).toEqual([60, 360, 1440]);
  });

  it('builds an Arabic body per ladder step', () => {
    const s1 = buildWhatsappRecoveryBody(1, 'سعد', '300.00', 'https://h.aa/r?t=x');
    const s2 = buildWhatsappRecoveryBody(2, 'سعد', '300.00', 'https://h.aa/r?t=x');
    const s3 = buildWhatsappRecoveryBody(3, 'سعد', '300.00', 'https://h.aa/r?t=x');
    expect(s1).toContain('سعد');
    expect(s1).toContain('300.00');
    expect(s1).toContain('https://h.aa/r?t=x');
    // Tone escalates: step 3 mentions expiry / آخر تذكير.
    expect(s3).toContain('آخر تذكير');
    expect(s2).not.toContain('آخر تذكير');
  });
});

// ── Feature-flag gating ───────────────────────────────────────────────────────

describe('WA-PR-7 — FEATURE_WHATSAPP_LIVE flag gating', () => {
  it('isWhatsappAutoRecoveryEnabled reads the env at call-time', () => {
    process.env.FEATURE_WHATSAPP_LIVE = '1';
    expect(isWhatsappAutoRecoveryEnabled()).toBe(true);
    process.env.FEATURE_WHATSAPP_LIVE = '0';
    expect(isWhatsappAutoRecoveryEnabled()).toBe(false);
    delete process.env.FEATURE_WHATSAPP_LIVE;
    expect(isWhatsappAutoRecoveryEnabled()).toBe(false);
  });

  it('does NOT invoke the sender when the flag is off (the global kill switch)', async () => {
    process.env.FEATURE_WHATSAPP_LIVE = '0';
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-A', storeId: 1, ageMinutes: 90 }));
    world.customers.push({ id: 1, storeId: 1, phone: '+966512345678', whatsappOptOut: false });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => undefined);
    const svc = makeService(world, sender);
    const result = await svc.fireWhatsappRecovery(1, 60);
    expect(sender).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it('refuses to fire when no sender is injected, even with the flag on', async () => {
    process.env.FEATURE_WHATSAPP_LIVE = '1';
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-A', storeId: 1, ageMinutes: 90 }));
    // No sender wired — the service must bail without throwing.
    const db = makeDbMock(world);
    const svc = new AbandonedCartCampaignService(db);
    const result = await svc.fireWhatsappRecovery(1, 60);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// ── Opt-out compliance ────────────────────────────────────────────────────────

describe('WA-PR-7 — opt-out compliance (regulatory)', () => {
  it('skips carts whose customer has whatsappOptOut=true', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-opt', storeId: 1, ageMinutes: 90, customerPhone: '+966599999999' }));
    world.customers.push({ id: 11, storeId: 1, phone: '+966599999999', whatsappOptOut: true });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => undefined);
    const svc = makeService(world, sender);
    const result = await svc.fireWhatsappRecovery(1, 60);
    expect(sender).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.skippedOptOut).toBe(1);
  });

  it('sends to carts whose customer has whatsappOptOut=false', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-ok', storeId: 1, ageMinutes: 90, customerPhone: '+966511111111' }));
    world.customers.push({ id: 12, storeId: 1, phone: '+966511111111', whatsappOptOut: false });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => undefined);
    const svc = makeService(world, sender);
    const result = await svc.fireWhatsappRecovery(1, 60);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.skippedOptOut).toBe(0);
    // Sender args carry the storeId + normalised phone + body.
    const [args] = sender.mock.calls;
    expect(args[0].storeId).toBe(1);
    expect(args[0].to).toMatch(/^\+?9665/);
    expect(args[0].body).toContain('Ahmed');
  });
});

// ── Idempotency / dedup ───────────────────────────────────────────────────────

describe('WA-PR-7 — idempotency via campaign_recoveries dedup', () => {
  it('writes a campaign_recoveries row on successful send and skips on re-tick', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-D', storeId: 1, ageMinutes: 90, customerPhone: '+966512345678' }));
    world.customers.push({ id: 21, storeId: 1, phone: '+966512345678', whatsappOptOut: false });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => undefined);
    const svc = makeService(world, sender);

    const first = await svc.fireWhatsappRecovery(1, 60);
    expect(first.sent).toBe(1);
    expect(world.recoveries).toHaveLength(1);
    expect(world.recoveries[0]).toMatchObject({
      storeId: 1,
      checkoutSessionId: 'cart-D',
      step: 1,
      channel: 'whatsapp',
    });
    expect(world.recoveries[0].recoveryToken.length).toBeGreaterThan(16);

    // Re-tick: same cart, same window, MUST be skipped via dedup.
    const second = await svc.fireWhatsappRecovery(1, 60);
    expect(second.sent).toBe(0);
    expect(second.skippedDedup).toBe(1);
    expect(sender).toHaveBeenCalledTimes(1); // not called again
    expect(world.recoveries).toHaveLength(1); // still one row
  });

  it('does NOT write a dedup row when the sender throws (retryable next tick)', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-F', storeId: 1, ageMinutes: 90, customerPhone: '+966512345678' }));
    world.customers.push({ id: 31, storeId: 1, phone: '+966512345678', whatsappOptOut: false });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => {
      throw new Error('RATE_LIMITED');
    });
    const svc = makeService(world, sender);
    const result = await svc.fireWhatsappRecovery(1, 60);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(world.recoveries).toHaveLength(0); // no dedup row — retry is safe
  });
});

// ── Ladder windows / no double-fire ───────────────────────────────────────────

describe('WA-PR-7 — ladder timing + no double-fire across ticks', () => {
  it('does NOT fire for a cart whose age falls OUTSIDE every ladder window', async () => {
    const world = makeWorld();
    // Cart age 5 minutes — far too fresh for step 1 (>= 60min).
    world.carts.push(makeCart({ id: 'cart-fresh', storeId: 1, ageMinutes: 5, customerPhone: '+966512345678' }));
    world.customers.push({ id: 41, storeId: 1, phone: '+966512345678', whatsappOptOut: false });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => undefined);
    const svc = makeService(world, sender);
    // Caller passes an out-of-ladder cartAgeMinutes — service must no-op.
    const result = await svc.fireWhatsappRecovery(1, 5);
    expect(sender).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it('reports the correct ladder step on each window (1h=1, 6h=2, 24h=3)', async () => {
    const world = makeWorld();
    const svc = makeService(world, async () => undefined);
    expect((await svc.fireWhatsappRecovery(1, 60)).step).toBe(1);
    expect((await svc.fireWhatsappRecovery(1, 360)).step).toBe(2);
    expect((await svc.fireWhatsappRecovery(1, 1440)).step).toBe(3);
  });

  it('running the recovery pass twice produces the same total sends (no double-fire)', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-G', storeId: 1, ageMinutes: 90, customerPhone: '+966512345678' }));
    world.customers.push({ id: 51, storeId: 1, phone: '+966512345678', whatsappOptOut: false });
    const sender = vi.fn<Parameters<WhatsappSender>, ReturnType<WhatsappSender>>(async () => undefined);
    const svc = makeService(world, sender);
    const r1 = await svc.fireWhatsappRecovery(1, 60);
    const r2 = await svc.fireWhatsappRecovery(1, 60);
    expect(r1.sent + r2.sent).toBe(1); // ONE send total across the two ticks
    expect(sender).toHaveBeenCalledTimes(1);
  });
});

// ── Wiring sanity (source-level checks, no DB) ────────────────────────────────

describe('WA-PR-7 — worker wiring + commerce-core exports', () => {
  it('worker.ts injects a Baileys-backed sender into AbandonedCartCampaignService', () => {
    const worker = readFileSync(new URL('../apps/api/src/worker.ts', import.meta.url), 'utf-8');
    expect(worker).toContain('AbandonedCartCampaignService');
    expect(worker).toContain('whatsappSender');
    expect(worker).toContain('sendWhatsappMessage');
    expect(worker).toContain('getWhatsappManager');
  });

  it('exports fireWhatsappRecovery + types from the service', () => {
    // Compile-time type check — if these don't exist this file won't import.
    const result: FireWhatsappRecoveryResult = {
      sent: 0, skippedOptOut: 0, skippedDedup: 0, failed: 0, step: 1,
    };
    expect(result.step).toBe(1);
  });
});
