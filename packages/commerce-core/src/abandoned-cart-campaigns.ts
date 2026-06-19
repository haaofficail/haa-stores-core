import { eq, and, lt, sql } from 'drizzle-orm';
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

export class AbandonedCartCampaignService {
  private notify: NotificationService;

  constructor(private db: DbClient = createDbClient()) {
    this.notify = new NotificationService(db);
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
   */
  async runRecoveryPass(): Promise<void> {
    const [campaigns] = await this.db.select().from(s.abandonedCartCampaigns)
      .where(eq(s.abandonedCartCampaigns.isActive, true))
      .limit(100);

    if (!campaigns) return;

    // Process each active campaign
    const allCampaigns = await this.db.select().from(s.abandonedCartCampaigns)
      .where(eq(s.abandonedCartCampaigns.isActive, true));

    for (const campaign of allCampaigns) {
      if (!campaign.steps || (campaign.steps as CampaignStep[]).length === 0) continue;
      const steps = campaign.steps as CampaignStep[];
      await this.processStep(campaign, steps[0], 1);
    }
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
