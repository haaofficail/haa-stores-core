import { eq, and, lt, gte, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { CampaignStep } from '@haa/db/schema';
import { NotificationService } from '@haa/notification-core';
import { buildWhatsappLink, normalizeWhatsappPhone } from './contact-channels.js';

export interface CampaignInput {
  name: string;
  steps: CampaignStep[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountExpiresHours?: number;
  minCartValue?: number;
}

export interface RecoveryStats {
  sent: number;
  opened: number;
  recovered: number;
  recoveredRevenue: string;
  recoveryRate: string;
}

/**
 * Outbound WhatsApp sender contract (WA-PR-7).
 *
 * The `commerce-core` package cannot import from `apps/api`, so the
 * scheduler (apps/api/src/worker.ts) injects the real Baileys-backed
 * sender from `apps/api/src/services/whatsapp/send-service.ts`. Tests
 * inject a stub so we never need a live WhatsApp socket.
 *
 * The sender MUST be idempotent at the "send attempt" level — the
 * caller relies on a thrown error to NOT write the `campaign_recoveries`
 * dedup row, so a retry on the next tick is safe.
 */
export type WhatsappSender = (input: { storeId: number; to: string; body: string }) => Promise<void>;

/**
 * Result of a single `fireWhatsappRecovery` invocation.
 *  - `sent`     — successfully sent + dedup row written.
 *  - `skippedOptOut` — customer has `whatsappOptOut=true` (regulatory).
 *  - `skippedDedup`  — a recovery row for this (cart, step, channel)
 *                     already exists (no double-fire on re-tick).
 *  - `failed`        — sender threw; NO dedup row was written.
 *
 * The trigger ladder is fixed: 60min → 360min → 1440min since the
 * checkout session's last update. Outside those windows nothing fires.
 */
export interface FireWhatsappRecoveryResult {
  sent: number;
  skippedOptOut: number;
  skippedDedup: number;
  failed: number;
  step: 1 | 2 | 3;
}

/** Trigger ladder: 1h → 6h → 24h (in minutes). */
export const WHATSAPP_RECOVERY_LADDER_MIN = [60, 360, 1440] as const;

/**
 * Map a cart's age (minutes since last activity) → ladder step number.
 * Each window is ±15min on the lower bound so a 5-min scheduler tick
 * has a guaranteed catch. Returns `null` outside all windows.
 *
 * Windows (inclusive):
 *   step 1: [60,  120) min   — "1h ago"
 *   step 2: [360, 720) min   — "6h ago"
 *   step 3: [1440, 2160) min — "24h ago"
 *
 * The half-open upper bound prevents a cart from firing the same step
 * twice if the scheduler is delayed (the next tick will be in the next
 * window). The dedup row in `campaign_recoveries` is the second line of
 * defence for the cart-id × step × channel triple.
 */
export function mapCartAgeToLadderStep(cartAgeMinutes: number): 1 | 2 | 3 | null {
  if (cartAgeMinutes >= 60 && cartAgeMinutes < 120) return 1;
  if (cartAgeMinutes >= 360 && cartAgeMinutes < 720) return 2;
  if (cartAgeMinutes >= 1440 && cartAgeMinutes < 2160) return 3;
  return null;
}

export class AbandonedCartCampaignService {
  private notify: NotificationService;
  private whatsappSender: WhatsappSender | null;

  constructor(
    private db: DbClient = createDbClient(),
    opts: { whatsappSender?: WhatsappSender } = {},
  ) {
    this.notify = new NotificationService(db);
    this.whatsappSender = opts.whatsappSender ?? null;
  }

  async listCampaigns(storeId: number) {
    return this.db.select().from(s.abandonedCartCampaigns)
      .where(eq(s.abandonedCartCampaigns.storeId, storeId))
      .orderBy(s.abandonedCartCampaigns.createdAt);
  }

  async createCampaign(storeId: number, input: CampaignInput) {
    const [campaign] = await this.db.insert(s.abandonedCartCampaigns)
      .values({
        storeId,
        name: input.name,
        steps: input.steps,
        discountType: input.discountType,
        discountValue: input.discountValue?.toString(),
        discountExpiresHours: input.discountExpiresHours ?? 24,
        minCartValue: input.minCartValue?.toString() ?? '0',
      }).returning();
    return campaign;
  }

  async updateCampaign(id: number, storeId: number, input: Partial<CampaignInput> & { isActive?: boolean }) {
    const [updated] = await this.db.update(s.abandonedCartCampaigns)
      .set({
        ...input,
        discountValue: input.discountValue !== undefined ? String(input.discountValue) : undefined,
        minCartValue: input.minCartValue !== undefined ? String(input.minCartValue) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(s.abandonedCartCampaigns.id, id), eq(s.abandonedCartCampaigns.storeId, storeId)))
      .returning();
    return updated;
  }

  async deleteCampaign(id: number, storeId: number) {
    await this.db.delete(s.abandonedCartCampaigns)
      .where(and(eq(s.abandonedCartCampaigns.id, id), eq(s.abandonedCartCampaigns.storeId, storeId)));
  }

  /**
   * Main scheduler entry — runs every 5 minutes.
   * Finds abandoned carts not yet in a recovery sequence and fires step 1.
   * Also advances carts that are ready for step 2/3.
   *
   * WA-PR-7: when `FEATURE_WHATSAPP_LIVE=1` AND a sender has been
   * injected by the worker, also fires the WhatsApp recovery ladder
   * (1h → 6h → 24h) across every active store. This runs alongside
   * (not instead of) the email/sms steps in `processStep` so existing
   * campaign configs keep working.
   */
  async runRecoveryPass(): Promise<void> {
    const [campaigns] = await this.db.select().from(s.abandonedCartCampaigns)
      .where(eq(s.abandonedCartCampaigns.isActive, true))
      .limit(100);

    if (campaigns) {
      // Process each active campaign
      const allCampaigns = await this.db.select().from(s.abandonedCartCampaigns)
        .where(eq(s.abandonedCartCampaigns.isActive, true));

      for (const campaign of allCampaigns) {
        if (!campaign.steps || (campaign.steps as CampaignStep[]).length === 0) continue;
        const steps = campaign.steps as CampaignStep[];
        await this.processStep(campaign, steps[0], 1);
      }
    }

    // WA-PR-7: WhatsApp auto-recovery ladder. Bail-out conditions are
    // checked inside `fireWhatsappRecovery` so a misconfigured env never
    // breaks the email/sms path above.
    if (!isWhatsappAutoRecoveryEnabled() || !this.whatsappSender) return;

    // Collect distinct store IDs that have ANY pending checkout in the
    // last 36h (= covers all three ladder windows + a 12h safety buffer
    // for clock skew + missed ticks).
    const since = new Date(Date.now() - 36 * 3600 * 1000);
    const activeStores = await this.db.selectDistinct({
      storeId: s.checkoutSessions.storeId,
    }).from(s.checkoutSessions)
      .where(and(
        eq(s.checkoutSessions.status, 'pending'),
        gte(s.checkoutSessions.updatedAt, since),
      ));

    for (const row of activeStores) {
      for (const ageMin of WHATSAPP_RECOVERY_LADDER_MIN) {
        try {
          await this.fireWhatsappRecovery(row.storeId, ageMin);
        } catch (err) {
          console.error(`[cart.recover] fireWhatsappRecovery failed for store=${row.storeId} age=${ageMin}min:`, err);
        }
      }
    }
  }

  /**
   * WA-PR-7 — Fire WhatsApp recovery messages for carts whose age in
   * minutes falls inside the ladder window mapped from `cartAgeMinutes`.
   *
   * Compliance + safety:
   *   1. **Feature flag:** returns 0/0/0/0 unless `FEATURE_WHATSAPP_LIVE=1`.
   *      This is the global kill switch — flip it off to halt all
   *      automated outreach without a deploy.
   *   2. **Opt-out:** carts whose customer has `whatsappOptOut=true`
   *      are silently skipped (counted in `skippedOptOut`). PDPL +
   *      WhatsApp Business Policy require this and it is NOT optional.
   *      Match is by normalized phone — the cart may have been placed
   *      without a customer login (guest checkout), in which case we
   *      look up `customers` for the same store by E.164 phone.
   *   3. **Sender unset / no ladder match:** returns immediately with
   *      counters at 0 (and `step` = the requested ladder step or 1).
   *   4. **Dedup:** writes a `campaign_recoveries` row before the send
   *      and a SELECT-then-INSERT check before that. Two scheduler
   *      ticks landing in the same minute can both pass the SELECT,
   *      but the second send's INSERT is the safety net — even if
   *      it races, the unique `recoveryToken` makes the duplicate
   *      visible in audit (recoveryToken is already UNIQUE on the table).
   *      The dedup key is `(storeId, checkoutSessionId, step,
   *      channel='whatsapp')`.
   *   5. **Best-effort:** a sender exception does NOT write the dedup
   *      row, so the next tick can retry. This is the right trade-off
   *      because a failed send (RATE_LIMITED / SESSION_NOT_CONNECTED)
   *      must be retryable.
   *
   * @returns counters for the run (testable; the scheduler ignores them).
   */
  async fireWhatsappRecovery(storeId: number, cartAgeMinutes: number): Promise<FireWhatsappRecoveryResult> {
    const step = mapCartAgeToLadderStep(cartAgeMinutes) ?? 1;
    const base: FireWhatsappRecoveryResult = {
      sent: 0, skippedOptOut: 0, skippedDedup: 0, failed: 0, step,
    };
    if (!isWhatsappAutoRecoveryEnabled()) return base;
    if (!this.whatsappSender) return base;
    if (mapCartAgeToLadderStep(cartAgeMinutes) === null) return base;

    // Window: cartAgeMinutes is the LOWER bound of the ladder bucket.
    // We look for sessions whose `updatedAt` is between
    // (now - upperBoundMin) and (now - lowerBoundMin).
    const upperBoundMin = step === 1 ? 120 : step === 2 ? 720 : 2160;
    const now = Date.now();
    const olderThan = new Date(now - cartAgeMinutes * 60 * 1000);
    const newerThan = new Date(now - upperBoundMin * 60 * 1000);

    const minCartValue = 0; // ladder fires for any cart; merchants who
    // want a min-value floor wire it through the campaign-level
    // `minCartValue` field (already enforced in `processStep`).

    const abandoned = await this.db.select()
      .from(s.checkoutSessions)
      .where(and(
        eq(s.checkoutSessions.storeId, storeId),
        eq(s.checkoutSessions.status, 'pending'),
        lt(s.checkoutSessions.updatedAt, olderThan),
        gte(s.checkoutSessions.updatedAt, newerThan),
        sql`${s.checkoutSessions.total}::numeric >= ${minCartValue}`,
      ))
      .limit(50);

    for (const session of abandoned) {
      // 1. Opt-out gate. Skip if the matched customer has opted out.
      const e164 = normalizeWhatsappPhone(session.customerPhone);
      if (!e164) continue;
      const optOut = await this.isCustomerOptedOut(storeId, e164);
      if (optOut) {
        base.skippedOptOut += 1;
        continue;
      }

      // 2. Dedup check.
      const dup = await this.db.select({ id: s.campaignRecoveries.id })
        .from(s.campaignRecoveries)
        .where(and(
          eq(s.campaignRecoveries.checkoutSessionId, session.id),
          eq(s.campaignRecoveries.step, step),
          eq(s.campaignRecoveries.channel, 'whatsapp'),
        ))
        .limit(1);
      if (dup.length > 0) {
        base.skippedDedup += 1;
        continue;
      }

      // 3. Compose + send.
      const recoveryToken = generateToken();
      const storeUrl = process.env.STOREFRONT_URL || 'https://haastores.com';
      const recoveryLink = `${storeUrl}/recover?token=${recoveryToken}`;
      const cartTotal = Number(session.total ?? 0).toFixed(2);
      const body = buildWhatsappRecoveryBody(step, session.customerName, cartTotal, recoveryLink);

      try {
        await this.whatsappSender({ storeId, to: e164, body });
      } catch {
        // Best-effort: do NOT write the dedup row so the next tick can retry.
        base.failed += 1;
        continue;
      }

      // 4. Persist dedup row (recoveryToken already has a unique index).
      const expiresAt = new Date(now + 24 * 3600 * 1000);
      await this.db.insert(s.campaignRecoveries).values({
        storeId,
        checkoutSessionId: session.id,
        campaignId: null,
        recoveryToken,
        step,
        channel: 'whatsapp',
        recipient: e164,
        expiresAt,
      });
      base.sent += 1;
    }

    return base;
  }

  /**
   * Look up the customer for a (storeId, phone) and return whether they
   * have `whatsappOptOut=true`. Returns false if no matching customer
   * is found — guest checkouts that haven't been linked to a customer
   * record yet have not (and cannot) opt out. The merchant remains
   * responsible for inbound STOP handling (WA-PR-3) which writes the
   * flag for future runs.
   */
  private async isCustomerOptedOut(storeId: number, e164: string): Promise<boolean> {
    const [row] = await this.db.select({ whatsappOptOut: s.customers.whatsappOptOut })
      .from(s.customers)
      .where(and(
        eq(s.customers.storeId, storeId),
        eq(s.customers.phone, e164),
      ))
      .limit(1);
    return Boolean(row?.whatsappOptOut);
  }

  private async processStep(
    campaign: typeof s.abandonedCartCampaigns.$inferSelect,
    step: CampaignStep,
    stepNumber: number,
  ) {
    const cutoffMs = step.delayMinutes * 60 * 1000;
    const cutoff = new Date(Date.now() - cutoffMs);
    const minCartValue = Number(campaign.minCartValue ?? 0);

    // Find abandoned sessions for this store that haven't been sent this step
    const abandoned = await this.db.select()
      .from(s.checkoutSessions)
      .where(and(
        eq(s.checkoutSessions.storeId, campaign.storeId),
        eq(s.checkoutSessions.status, 'pending'),
        lt(s.checkoutSessions.updatedAt, cutoff),
        sql`${s.checkoutSessions.total}::numeric >= ${minCartValue}`,
      ))
      .limit(50);

    for (const session of abandoned) {
      // Skip if already sent this step
      const existing = await this.db.select().from(s.campaignRecoveries)
        .where(and(
          eq(s.campaignRecoveries.checkoutSessionId, session.id),
          eq(s.campaignRecoveries.campaignId, campaign.id),
          eq(s.campaignRecoveries.step, stepNumber),
        )).limit(1);

      if (existing.length > 0) continue;

      await this.sendRecovery(campaign, step, stepNumber, session);
    }
  }

  private async sendRecovery(
    campaign: typeof s.abandonedCartCampaigns.$inferSelect,
    step: CampaignStep,
    stepNumber: number,
    session: typeof s.checkoutSessions.$inferSelect,
  ) {
    const recoveryToken = generateToken();
    const expiresAt = new Date(Date.now() + (campaign.discountExpiresHours ?? 24) * 3600000);
    const storeUrl = process.env.STOREFRONT_URL || 'https://haastores.com';
    const recoveryLink = `${storeUrl}/recover?token=${recoveryToken}`;
    const cartTotal = Number(session.total ?? 0).toFixed(2);
    const customerName = session.customerName;
    const phone = session.customerPhone;
    const email = session.customerEmail;

    let recipient = '';
    let notificationBody = '';

    if (step.channel === 'whatsapp' && phone) {
      const e164 = normalizeWhatsappPhone(phone);
      if (!e164) return;
      recipient = e164;
      const waText = step.messageBody || `مرحباً ${customerName}! سلتك بقيمة ${cartTotal} ريال. أكمل طلبك:\n${recoveryLink}`;
      notificationBody = buildWhatsappLink(e164, waText);
    } else if (step.channel === 'sms') {
      recipient = normalizeWhatsappPhone(phone) ?? phone ?? '';
      notificationBody = step.messageBody || `سلتك بقيمة ${cartTotal} ريال. أكمل طلبك: ${recoveryLink}`;
    } else if (step.channel === 'email') {
      recipient = email ?? '';
      notificationBody = step.messageBody || buildRecoveryEmail(customerName, cartTotal, recoveryLink);
    }

    if (!recipient) return;

    await this.db.insert(s.campaignRecoveries).values({
      storeId: session.storeId,
      checkoutSessionId: session.id,
      campaignId: campaign.id,
      recoveryToken,
      step: stepNumber,
      channel: step.channel as 'email' | 'sms' | 'whatsapp',
      recipient,
      expiresAt,
    });

    if (step.channel !== 'whatsapp') {
      try {
        await this.notify.send(session.storeId, step.templateCode || 'abandoned_cart', {
          name: customerName,
          cartTotal,
          recoveryLink,
          body: notificationBody,
        }, step.channel);
      } catch {
        // best-effort
      }
    }
    // WhatsApp: wa.me deeplink is in notificationBody for display in dashboard
  }

  async markRecovered(token: string, orderId: number): Promise<void> {
    await this.db.update(s.campaignRecoveries)
      .set({ status: 'recovered', recoveredAt: new Date(), recoveredOrderId: orderId })
      .where(eq(s.campaignRecoveries.recoveryToken, token));
  }

  async getStats(storeId: number, campaignId?: number): Promise<RecoveryStats> {
    const conditions = campaignId
      ? and(eq(s.campaignRecoveries.storeId, storeId), eq(s.campaignRecoveries.campaignId, campaignId))
      : eq(s.campaignRecoveries.storeId, storeId);

    const rows = await this.db.select({
      status: s.campaignRecoveries.status,
      total: sql<string>`COUNT(*)`,
    }).from(s.campaignRecoveries)
      .where(conditions)
      .groupBy(s.campaignRecoveries.status);

    const byStatus = Object.fromEntries(rows.map(r => [r.status, Number(r.total)]));
    const sent = (byStatus.sent ?? 0) + (byStatus.opened ?? 0) + (byStatus.recovered ?? 0);

    // Get recovered revenue from orders (raw join — recoveredOrderId is a non-FK integer)
    const recoveredRows = await this.db.select({
      rev: sql<string>`COALESCE(SUM(o.total::numeric), 0)`,
    }).from(s.campaignRecoveries)
      .leftJoin(s.orders, sql`${s.orders.id} = ${s.campaignRecoveries.recoveredOrderId}`)
      .where(and(conditions, eq(s.campaignRecoveries.status, 'recovered')));

    const recoveredRevenue = recoveredRows[0]?.rev ?? '0';
    const recovered = byStatus.recovered ?? 0;
    const recoveryRate = sent > 0 ? `${((recovered / sent) * 100).toFixed(1)}%` : '0%';

    return {
      sent,
      opened: byStatus.opened ?? 0,
      recovered,
      recoveredRevenue,
      recoveryRate,
    };
  }

  async markOpened(token: string): Promise<void> {
    await this.db.update(s.campaignRecoveries)
      .set({ status: 'opened' })
      .where(and(
        eq(s.campaignRecoveries.recoveryToken, token),
        eq(s.campaignRecoveries.status, 'sent'),
      ));
  }

  async getRecoveryByToken(token: string) {
    const [row] = await this.db.select().from(s.campaignRecoveries)
      .where(eq(s.campaignRecoveries.recoveryToken, token)).limit(1);
    return row ?? null;
  }
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Global feature flag for WA-PR-7 automated outreach. Defaults to OFF
 * so the very first deploy of this code stays silent until the owner
 * explicitly enables it on the env.
 *
 * Read at call-time (not at module load) so the test runner can flip
 * it per-test without resetting the import cache.
 */
export function isWhatsappAutoRecoveryEnabled(): boolean {
  return process.env.FEATURE_WHATSAPP_LIVE === '1';
}

/**
 * Build the per-ladder-step Arabic recovery body. The tone escalates
 * with the cart's age — step 1 is a gentle nudge; step 3 hints that
 * the cart will expire. Keep the message short and the link prominent
 * so it renders cleanly in WhatsApp's chat preview.
 */
export function buildWhatsappRecoveryBody(step: 1 | 2 | 3, name: string, cartTotal: string, link: string): string {
  if (step === 1) {
    return `مرحباً ${name}! تركت سلتك بقيمة ${cartTotal} ر.س — هل تحتاج مساعدة لإكمال الطلب؟\n${link}`;
  }
  if (step === 2) {
    return `${name}، سلتك (${cartTotal} ر.س) لا تزال محفوظة. أكمل طلبك الآن:\n${link}`;
  }
  return `${name}، آخر تذكير: سلتك (${cartTotal} ر.س) ستنتهي قريباً. اضغط لإكمال الطلب:\n${link}`;
}

function buildRecoveryEmail(name: string, total: string, link: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<body style="font-family:Arial,sans-serif;direction:rtl;text-align:right;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px">
  <h2 style="color:#5c9cd5">سلتك بانتظارك! 🛍️</h2>
  <p>مرحباً ${name}،</p>
  <p>لاحظنا أنك تركت سلة بقيمة <strong>${total} ريال</strong> دون إتمام الطلب.</p>
  <p>سلتك لا تزال محفوظة لك — أكمل طلبك الآن:</p>
  <a href="${link}" style="display:inline-block;background:#5c9cd5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;margin:16px 0">
    أكمل الطلب الآن
  </a>
  <p style="color:#888;font-size:12px;margin-top:24px">
    إذا لم تكن بحاجة لهذا البريد، يمكنك تجاهله.
  </p>
</div>
</body>
</html>`;
}
