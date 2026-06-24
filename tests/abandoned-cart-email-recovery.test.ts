// HAA — System-default abandoned-cart EMAIL recovery ladder.
//
// Mirrors the WhatsApp WA-PR-7 trigger tests but for the email channel
// (`fireEmailRecovery` + `renderAbandonedCartEmail` + the `runRecoveryPass`
// wiring). Locks the following invariants:
//
//   1. Renderer (`renderAbandonedCartEmail`):
//      - Subject differs per ladder step (1 / 2 / 3) with the right
//        Arabic phrase for each tone.
//      - Singular vs plural item phrasing — "منتج واحد" for count=1,
//        "${n} منتجات" for count > 1.
//      - escapeHtml applied to customerName (XSS payload neutralised).
//
//   2. Service gating (`fireEmailRecovery`):
//      - No-op when `FEATURE_EMAIL_RECOVERY_LIVE` is unset / not '1'
//        — the global kill switch.
//      - `isEmailAutoRecoveryEnabled()` reads the env at call-time.
//
//   3. Service source-grep guards (cheap, no DB):
//      - `runRecoveryPass` reuses `WHATSAPP_RECOVERY_LADDER_MIN` for
//        the email loop (same ladder constant referenced twice).
//      - `runRecoveryPass` calls `fireEmailRecovery` AFTER the
//        WhatsApp loop (string-order assertion).
//      - `fireEmailRecovery` inserts `channel: 'email'` into
//        `campaignRecoveries` and SELECTs the same triple for dedup.
//      - `fireEmailRecovery` swallows provider exceptions (try/catch
//        around the provider.send call).
//
// We mock the DbClient with an in-memory list of carts + cart_items +
// stores + dedup rows. This is faster than a real DB and reliable in
// CI sandboxes that don't have Postgres.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AbandonedCartCampaignService,
  WHATSAPP_RECOVERY_LADDER_MIN,
  isEmailAutoRecoveryEnabled,
  type FireEmailRecoveryResult,
} from '../packages/commerce-core/src/abandoned-cart-campaigns.ts';
import {
  renderAbandonedCartEmail,
  type AbandonedCartContext,
  type NotificationProvider,
} from '../packages/notification-core/src/index.ts';
import * as checkoutSchema from '../packages/db/src/schema/checkout.ts';
import * as cartSchema from '../packages/db/src/schema/cart.ts';
import * as campaignsSchema from '../packages/db/src/schema/campaigns.ts';
import * as storesSchema from '../packages/db/src/schema/stores.ts';

// ── Source-grep helpers ────────────────────────────────────────────

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');
const SERVICE_SRC = read('packages/commerce-core/src/abandoned-cart-campaigns.ts');

// ── Renderer tests ─────────────────────────────────────────────────

function baseRendererCtx(over: Partial<AbandonedCartContext> = {}): AbandonedCartContext {
  return {
    customerName: 'سعد',
    storeName: 'متجر العنبر',
    cartTotalSar: '245.00',
    itemCount: 2,
    recoveryLink: 'https://anbar.haastores.com/recover?token=abc123',
    storeUrl: 'https://anbar.haastores.com',
    supportEmail: 'hello@haastores.com',
    step: 1,
    ...over,
  };
}

describe('renderAbandonedCartEmail — subject tone per ladder step', () => {
  it('step 1 subject contains "تركت سلتك"', () => {
    const { subject } = renderAbandonedCartEmail(baseRendererCtx({ step: 1 }));
    expect(subject).toContain('تركت سلتك');
    expect(subject).toContain('متجر العنبر');
    // Step 3 last-call phrase MUST NOT appear in step 1.
    expect(subject).not.toContain('فرصة أخيرة');
  });

  it('step 2 subject contains "لا تزال تنتظرك"', () => {
    const { subject } = renderAbandonedCartEmail(baseRendererCtx({ step: 2 }));
    expect(subject).toContain('لا تزال تنتظرك');
    expect(subject).toContain('متجر العنبر');
    expect(subject).not.toContain('فرصة أخيرة');
  });

  it('step 3 subject contains "فرصة أخيرة" + cart total', () => {
    const { subject } = renderAbandonedCartEmail(baseRendererCtx({ step: 3, cartTotalSar: '550.00' }));
    expect(subject).toContain('فرصة أخيرة');
    expect(subject).toContain('متجر العنبر');
    expect(subject).toContain('550.00');
    expect(subject).toContain('ر.س');
  });

  it('the three subjects are distinct', () => {
    const s1 = renderAbandonedCartEmail(baseRendererCtx({ step: 1 })).subject;
    const s2 = renderAbandonedCartEmail(baseRendererCtx({ step: 2 })).subject;
    const s3 = renderAbandonedCartEmail(baseRendererCtx({ step: 3 })).subject;
    expect(s1).not.toBe(s2);
    expect(s2).not.toBe(s3);
    expect(s1).not.toBe(s3);
  });
});

describe('renderAbandonedCartEmail — singular vs plural item phrasing', () => {
  it('itemCount === 1 produces "منتج واحد"', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx({ itemCount: 1 }));
    expect(html).toContain('منتج واحد');
    // The plural pattern "N منتجات" must NOT appear for singular.
    expect(html).not.toMatch(/\d+\s+منتجات/);
  });

  it('itemCount > 1 produces "${count} منتجات"', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx({ itemCount: 3 }));
    expect(html).toContain('3 منتجات');
    expect(html).not.toContain('منتج واحد');
  });

  it('itemCount === 5 produces "5 منتجات"', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx({ itemCount: 5 }));
    expect(html).toContain('5 منتجات');
  });
});

describe('renderAbandonedCartEmail — escapeHtml applied to user input', () => {
  it('XSS payload in customerName is neutralised', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const { html } = renderAbandonedCartEmail(baseRendererCtx({ customerName: malicious }));
    // The literal tag must NOT appear unescaped in the body.
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    // The escaped form MUST appear.
    expect(html).toContain('&lt;img');
    expect(html).toContain('onerror=alert(1)&gt;');
  });

  it('empty customerName falls back to "عزيزي العميل"', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx({ customerName: '' }));
    expect(html).toContain('عزيزي العميل');
  });

  it('whitespace-only customerName falls back to "عزيزي العميل"', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx({ customerName: '   ' }));
    expect(html).toContain('عزيزي العميل');
  });

  it('storeName + recoveryLink are present in the HTML', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx());
    expect(html).toContain('متجر العنبر');
    expect(html).toContain('https://anbar.haastores.com/recover?token=abc123');
  });

  it('CTA button label is "أكمل طلبك"', () => {
    const { html } = renderAbandonedCartEmail(baseRendererCtx());
    expect(html).toContain('أكمل طلبك');
  });
});

// ── Feature-flag helper ────────────────────────────────────────────

describe('isEmailAutoRecoveryEnabled', () => {
  const ORIG = process.env.FEATURE_EMAIL_RECOVERY_LIVE;
  afterEach(() => {
    if (ORIG === undefined) delete process.env.FEATURE_EMAIL_RECOVERY_LIVE;
    else process.env.FEATURE_EMAIL_RECOVERY_LIVE = ORIG;
  });

  it('returns true ONLY when FEATURE_EMAIL_RECOVERY_LIVE === "1"', () => {
    process.env.FEATURE_EMAIL_RECOVERY_LIVE = '1';
    expect(isEmailAutoRecoveryEnabled()).toBe(true);
  });

  it('returns false when FEATURE_EMAIL_RECOVERY_LIVE is "0"', () => {
    process.env.FEATURE_EMAIL_RECOVERY_LIVE = '0';
    expect(isEmailAutoRecoveryEnabled()).toBe(false);
  });

  it('returns false when FEATURE_EMAIL_RECOVERY_LIVE is unset', () => {
    delete process.env.FEATURE_EMAIL_RECOVERY_LIVE;
    expect(isEmailAutoRecoveryEnabled()).toBe(false);
  });

  it('returns false for any non-"1" value (e.g. "true" / "yes")', () => {
    process.env.FEATURE_EMAIL_RECOVERY_LIVE = 'true';
    expect(isEmailAutoRecoveryEnabled()).toBe(false);
    process.env.FEATURE_EMAIL_RECOVERY_LIVE = 'yes';
    expect(isEmailAutoRecoveryEnabled()).toBe(false);
  });
});

// ── In-memory DB mock for fireEmailRecovery behaviour ─────────────

interface Cart {
  id: string;
  cartId: string;
  storeId: number;
  status: 'pending' | 'completed';
  customerName: string;
  customerEmail: string | null;
  total: string;
  updatedAt: Date;
}

interface CartItemRow {
  id: number;
  cartId: string;
}

interface StoreRow {
  id: number;
  name: string;
  slug: string;
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
  cartItems: CartItemRow[];
  stores: StoreRow[];
  recoveries: RecoveryRow[];
  recoverySeq: number;
}

function makeWorld(): World {
  return { carts: [], cartItems: [], stores: [], recoveries: [], recoverySeq: 0 };
}

function makeDbMock(world: World) {
  const schema = {
    checkoutSessions: checkoutSchema.checkoutSessions,
    cartItems: cartSchema.cartItems,
    stores: storesSchema.stores,
    campaignRecoveries: campaignsSchema.campaignRecoveries,
    abandonedCartCampaigns: campaignsSchema.abandonedCartCampaigns,
  } as const;

  let currentTable: unknown = null;
  let pendingInsertValues: Record<string, unknown> | null = null;

  function resolveRows(): unknown[] {
    if (currentTable === schema.checkoutSessions) {
      return world.carts
        .filter(c => c.status === 'pending')
        .map(c => ({
          id: c.id,
          cartId: c.cartId,
          storeId: c.storeId,
          status: c.status,
          customerName: c.customerName,
          customerEmail: c.customerEmail,
          total: c.total,
          updatedAt: c.updatedAt,
        }));
    }
    if (currentTable === schema.cartItems) {
      return world.cartItems.map(r => ({ id: r.id, cartId: r.cartId }));
    }
    if (currentTable === schema.stores) {
      return world.stores.map(r => ({ name: r.name, slug: r.slug, id: r.id }));
    }
    if (currentTable === schema.campaignRecoveries) {
      return world.recoveries.map(r => ({ id: r.id, ...r }));
    }
    if (currentTable === schema.abandonedCartCampaigns) {
      return [];
    }
    return [];
  }

  const builder: any = {
    from(table: unknown) { currentTable = table; return builder; },
    where(_p: unknown) { return builder; },
    leftJoin(_t: unknown, _p: unknown) { return builder; },
    orderBy(..._a: unknown[]) { return builder; },
    groupBy(..._a: unknown[]) { return builder; },
    async limit(n: number) { return resolveRows().slice(0, n); },
    then(onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) {
      return Promise.resolve(resolveRows()).then(onF, onR);
    },
  };

  const db: any = {
    select(_fields?: Record<string, unknown>) {
      return builder;
    },
    selectDistinct(_fields?: Record<string, unknown>) {
      const distinctBuilder: any = {
        from(table: unknown) { currentTable = table; return distinctBuilder; },
        where(_p: unknown) { return distinctBuilder; },
        then(onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) {
          const ids = Array.from(new Set(world.carts.filter(c => c.status === 'pending').map(c => c.storeId)));
          return Promise.resolve(ids.map(id => ({ storeId: id }))).then(onF, onR);
        },
      };
      return distinctBuilder;
    },
    insert(table: unknown) {
      currentTable = table;
      return {
        values(v: Record<string, unknown> | Record<string, unknown>[]) {
          pendingInsertValues = Array.isArray(v) ? v[0] : v;
          if (currentTable === schema.campaignRecoveries && pendingInsertValues) {
            world.recoverySeq += 1;
            const row: RecoveryRow = {
              id: world.recoverySeq,
              storeId: Number(pendingInsertValues.storeId),
              checkoutSessionId: String(pendingInsertValues.checkoutSessionId),
              step: Number(pendingInsertValues.step),
              channel: (pendingInsertValues.channel ?? 'email') as 'email' | 'sms' | 'whatsapp',
              recipient: String(pendingInsertValues.recipient ?? ''),
              recoveryToken: String(pendingInsertValues.recoveryToken ?? ''),
            };
            world.recoveries.push(row);
          }
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
    update(_t: unknown) {
      return { set(_p: unknown) { return { where(_w: unknown) { return Promise.resolve(); } }; } };
    },
    delete(_t: unknown) {
      return { where(_p: unknown) { return Promise.resolve(); } };
    },
  };
  return db;
}

function makeCart(opts: { id: string; storeId: number; ageMinutes: number; email?: string | null; total?: string; cartId?: string }): Cart {
  return {
    id: opts.id,
    cartId: opts.cartId ?? opts.id,
    storeId: opts.storeId,
    status: 'pending',
    customerName: 'سعد',
    customerEmail: opts.email === undefined ? 'saad@example.com' : opts.email,
    total: opts.total ?? '245.00',
    updatedAt: new Date(Date.now() - opts.ageMinutes * 60_000),
  };
}

function makeStubProvider(): NotificationProvider & { sends: Array<{ recipient: string; subject?: string }> } {
  const sends: Array<{ recipient: string; subject?: string }> = [];
  const provider = {
    channel: 'email' as const,
    name: 'StubEmail',
    isAvailable: true,
    sends,
    async send(message: { recipient: string; subject?: string; body: string }) {
      sends.push({ recipient: message.recipient, subject: message.subject });
      return { success: true };
    },
  };
  return provider;
}

// ── Behaviour tests for fireEmailRecovery ─────────────────────────

describe('fireEmailRecovery — feature-flag gating', () => {
  const ORIG = process.env.FEATURE_EMAIL_RECOVERY_LIVE;
  afterEach(() => {
    if (ORIG === undefined) delete process.env.FEATURE_EMAIL_RECOVERY_LIVE;
    else process.env.FEATURE_EMAIL_RECOVERY_LIVE = ORIG;
  });

  it('is a no-op when FEATURE_EMAIL_RECOVERY_LIVE is unset', async () => {
    delete process.env.FEATURE_EMAIL_RECOVERY_LIVE;
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-A', storeId: 1, ageMinutes: 90 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });
    const result = await svc.fireEmailRecovery(1, 60);
    expect(provider.sends).toHaveLength(0);
    expect(result.sent).toBe(0);
  });

  it('is a no-op when FEATURE_EMAIL_RECOVERY_LIVE === "0"', async () => {
    process.env.FEATURE_EMAIL_RECOVERY_LIVE = '0';
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-A', storeId: 1, ageMinutes: 90 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });
    const result = await svc.fireEmailRecovery(1, 60);
    expect(provider.sends).toHaveLength(0);
    expect(result.sent).toBe(0);
  });
});

describe('fireEmailRecovery — happy path (flag on, recipient present)', () => {
  beforeEach(() => { process.env.FEATURE_EMAIL_RECOVERY_LIVE = '1'; });
  afterEach(() => { delete process.env.FEATURE_EMAIL_RECOVERY_LIVE; });

  it('reports the correct ladder step (1h→1, 6h→2, 24h→3)', async () => {
    const world = makeWorld();
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });
    expect((await svc.fireEmailRecovery(1, 60)).step).toBe(1);
    expect((await svc.fireEmailRecovery(1, 360)).step).toBe(2);
    expect((await svc.fireEmailRecovery(1, 1440)).step).toBe(3);
  });

  it('returns step=1 + sent=0 when cart age is OUTSIDE every ladder window', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-fresh', storeId: 1, ageMinutes: 5 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });
    const result = await svc.fireEmailRecovery(1, 5);
    expect(provider.sends).toHaveLength(0);
    expect(result.sent).toBe(0);
  });

  it('skips sessions with no customerEmail (counted in skippedNoEmail)', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-noemail', storeId: 1, ageMinutes: 90, email: null }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });
    const result = await svc.fireEmailRecovery(1, 60);
    expect(provider.sends).toHaveLength(0);
    expect(result.sent).toBe(0);
    expect(result.skippedNoEmail).toBe(1);
  });

  it('writes a campaign_recoveries row with channel="email"', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-D', storeId: 1, ageMinutes: 90 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    world.cartItems.push({ id: 1, cartId: 'cart-D' });
    world.cartItems.push({ id: 2, cartId: 'cart-D' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });

    const result = await svc.fireEmailRecovery(1, 60);
    expect(result.sent).toBe(1);
    expect(world.recoveries).toHaveLength(1);
    expect(world.recoveries[0]).toMatchObject({
      storeId: 1,
      checkoutSessionId: 'cart-D',
      step: 1,
      channel: 'email',
      recipient: 'saad@example.com',
    });
    expect(world.recoveries[0].recoveryToken.length).toBeGreaterThan(16);
    expect(provider.sends).toHaveLength(1);
  });

  it('skips on re-tick via the dedup SELECT', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-E', storeId: 1, ageMinutes: 90 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider = makeStubProvider();
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });

    const first = await svc.fireEmailRecovery(1, 60);
    expect(first.sent).toBe(1);
    const second = await svc.fireEmailRecovery(1, 60);
    expect(second.sent).toBe(0);
    expect(second.skippedDedup).toBe(1);
    expect(provider.sends).toHaveLength(1); // not sent again
    expect(world.recoveries).toHaveLength(1);
  });

  it('does NOT throw when the provider throws (failure swallowed)', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-F', storeId: 1, ageMinutes: 90 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const provider: NotificationProvider = {
      channel: 'email',
      name: 'BoomEmail',
      isAvailable: true,
      async send() { throw new Error('SMTP_DOWN'); },
    };
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => provider,
    });

    // Must NOT throw out of the call.
    const result = await svc.fireEmailRecovery(1, 60);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });

  it('returns base counters when no provider is configured', async () => {
    const world = makeWorld();
    world.carts.push(makeCart({ id: 'cart-G', storeId: 1, ageMinutes: 90 }));
    world.stores.push({ id: 1, name: 'متجر العنبر', slug: 'anbar' });
    const svc = new AbandonedCartCampaignService(makeDbMock(world), {
      emailProviderFactory: () => null,
    });
    const result = await svc.fireEmailRecovery(1, 60);
    expect(result.sent).toBe(0);
    expect(world.recoveries).toHaveLength(0);
  });
});

// ── Source-grep guards (cheap, no DB) ─────────────────────────────

describe('runRecoveryPass — email loop wiring', () => {
  it('reuses WHATSAPP_RECOVERY_LADDER_MIN for both loops', () => {
    // The constant is referenced at least twice — once in the WhatsApp
    // loop, once in the email loop — to guarantee a shared cadence.
    const matches = SERVICE_SRC.match(/WHATSAPP_RECOVERY_LADDER_MIN/g) ?? [];
    // Definition (1) + Whatsapp loop iteration (1) + Email loop iteration (1) = 3.
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it('calls fireEmailRecovery AFTER the WhatsApp loop (string order)', () => {
    const waIdx = SERVICE_SRC.indexOf('this.fireWhatsappRecovery(');
    const emailIdx = SERVICE_SRC.indexOf('this.fireEmailRecovery(');
    expect(waIdx).toBeGreaterThan(-1);
    expect(emailIdx).toBeGreaterThan(waIdx);
  });

  it('the email loop is gated by isEmailAutoRecoveryEnabled()', () => {
    // The gate must be checked BEFORE the email for-loop iterates the
    // active-stores set.
    const gateIdx = SERVICE_SRC.indexOf('isEmailAutoRecoveryEnabled()');
    const emailLoopIdx = SERVICE_SRC.indexOf('this.fireEmailRecovery(');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(emailLoopIdx);
  });

  it('extracts findStoresWithRecentPendingCheckouts as a shared helper', () => {
    expect(SERVICE_SRC).toMatch(/private\s+async\s+findStoresWithRecentPendingCheckouts\s*\(/);
  });
});

describe('fireEmailRecovery — source-grep guards', () => {
  it('inserts channel: "email" into campaign_recoveries', () => {
    // The insert block uses object literal `channel: 'email'`.
    expect(SERVICE_SRC).toMatch(/channel:\s*['"]email['"]/);
  });

  it('SELECTs (checkoutSessionId, step, channel) for dedup', () => {
    // Same triple as the WhatsApp path — the email loop must match
    // the same three columns to share the dedup table.
    const m = SERVICE_SRC.match(/eq\(s\.campaignRecoveries\.channel,\s*['"]email['"]\)/);
    expect(m).not.toBeNull();
  });

  it('wraps provider.send in try/catch (failed sends do not throw)', () => {
    // Scope: lines after the `fireEmailRecovery(` signature.
    const fireBlock = SERVICE_SRC.split('async fireEmailRecovery(')[1] ?? '';
    // Stop at next method declaration (private/async at indent 2).
    const trimmed = fireBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/await\s+provider\.send\(/);
    expect(trimmed).toMatch(/try\s*\{/);
    expect(trimmed).toMatch(/\}\s*catch\s*\(/);
  });

  it('logs failures with kind=email and no PII (no recipient/email/customerName)', () => {
    const fireBlock = SERVICE_SRC.split('async fireEmailRecovery(')[1] ?? '';
    const trimmed = fireBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/kind=email/);
    // The error log must NOT include the email address or customer name.
    const errorLogLines = trimmed.match(/console\.[a-z]+\([^)]*\)/g) ?? [];
    for (const line of errorLogLines) {
      expect(line).not.toMatch(/customerEmail|customerName|\.email\b/);
    }
  });
});

describe('FireEmailRecoveryResult — public type contract', () => {
  it('compiles + carries the right counters', () => {
    const r: FireEmailRecoveryResult = {
      sent: 0, skippedNoEmail: 0, skippedDedup: 0, failed: 0, step: 1,
    };
    expect(r.step).toBe(1);
  });
});

describe('WHATSAPP_RECOVERY_LADDER_MIN — shared constant', () => {
  it('exposes [60, 360, 1440] minutes (email loop reuses this)', () => {
    expect(WHATSAPP_RECOVERY_LADDER_MIN).toEqual([60, 360, 1440]);
  });
});
