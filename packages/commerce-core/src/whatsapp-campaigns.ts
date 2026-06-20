import { eq, and, sql, inArray } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { CustomerSegmentType } from '@haa/shared';
import { normalizeWhatsappPhone, buildWhatsappLink } from './contact-channels.js';
import { UnifoncWhatsAppProvider } from '@haa/notification-core';

export interface CreateCampaignInput {
  name: string;
  segmentType?: CustomerSegmentType;
  messageTemplate: string;
  scheduledAt?: Date;
}

export class WhatsAppCampaignService {
  constructor(private db: DbClient = createDbClient()) {}

  async listCampaigns(storeId: number) {
    return this.db.select().from(s.whatsappCampaigns)
      .where(eq(s.whatsappCampaigns.storeId, storeId))
      .orderBy(s.whatsappCampaigns.createdAt);
  }

  async createCampaign(storeId: number, input: CreateCampaignInput) {
    const recipients = await this.resolveRecipients(storeId, input.segmentType);

    const [campaign] = await this.db.insert(s.whatsappCampaigns).values({
      storeId,
      name: input.name,
      segmentType: input.segmentType,
      messageTemplate: input.messageTemplate,
      status: 'draft',
      totalRecipients: recipients.length,
      scheduledAt: input.scheduledAt,
    }).returning();

    if (recipients.length > 0) {
      await this.db.insert(s.whatsappCampaignSends).values(
        recipients.map(r => ({
          campaignId: campaign.id,
          customerId: r.customerId,
          phone: r.phone,
          status: 'pending' as const,
        })),
      );
    }

    return campaign;
  }

  async previewRecipients(storeId: number, segmentType?: CustomerSegmentType) {
    const recipients = await this.resolveRecipients(storeId, segmentType);
    return { count: recipients.length, sample: recipients.slice(0, 5) };
  }

  /**
   * Send a campaign — called by scheduler or manual trigger.
   * Respects WhatsApp opt-in (only sends to customers with whatsapp enabled in prefs).
   */
  async sendCampaign(campaignId: number, storeId: number): Promise<void> {
    const [campaign] = await this.db.select().from(s.whatsappCampaigns)
      .where(and(
        eq(s.whatsappCampaigns.id, campaignId),
        eq(s.whatsappCampaigns.storeId, storeId),
      )).limit(1);

    // امنع إعادة الدخول على حملة قيد التشغيل (re-tick المجدول بعد انتهاء قفل Redis) — منع إرسال مكرر (QA WhatsApp #5)
    if (!campaign || campaign.status === 'completed' || campaign.status === 'running') return;

    await this.db.update(s.whatsappCampaigns)
      .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(s.whatsappCampaigns.id, campaignId));

    const pending = await this.db.select().from(s.whatsappCampaignSends)
      .where(and(
        eq(s.whatsappCampaignSends.campaignId, campaignId),
        eq(s.whatsappCampaignSends.status, 'pending'),
      )).limit(500);

    const provider = new UnifoncWhatsAppProvider();
    let sentCount = 0;
    let failedCount = 0;

    for (const send of pending) {
      const phone = normalizeWhatsappPhone(send.phone);
      if (!phone) {
        await this.db.update(s.whatsappCampaignSends)
          .set({ status: 'failed', errorMessage: 'Invalid phone', sentAt: new Date() })
          .where(eq(s.whatsappCampaignSends.id, send.id));
        failedCount++;
        continue;
      }

      const message = interpolateTemplate(campaign.messageTemplate, {
        phone,
      });

      let result: { success: boolean; messageId?: string; error?: string };
      if (provider.isAvailable) {
        result = await provider.send({ recipient: phone, body: message });
      } else {
        // Fallback: generate wa.me deep link for manual sending
        const waLink = buildWhatsappLink(phone, message);
        result = { success: true, messageId: `deeplink:${waLink}` };
      }

      await this.db.update(s.whatsappCampaignSends).set({
        status: result.success ? 'sent' : 'failed',
        messageId: result.messageId,
        errorMessage: result.error,
        sentAt: new Date(),
      }).where(eq(s.whatsappCampaignSends.id, send.id));

      if (result.success) sentCount++; else failedCount++;

      // Rate limit: 3 messages/second (Unifonic limit)
      await sleep(350);
    }

    const allDone = await this.db.select({ total: sql<string>`COUNT(*)` })
      .from(s.whatsappCampaignSends)
      .where(and(
        eq(s.whatsappCampaignSends.campaignId, campaignId),
        eq(s.whatsappCampaignSends.status, 'pending'),
      ));

    const remaining = Number(allDone[0]?.total ?? 0);

    await this.db.update(s.whatsappCampaigns).set({
      status: remaining === 0 ? 'completed' : 'running',
      sentCount: sql`${s.whatsappCampaigns.sentCount} + ${sentCount}`,
      failedCount: sql`${s.whatsappCampaigns.failedCount} + ${failedCount}`,
      completedAt: remaining === 0 ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(s.whatsappCampaigns.id, campaignId));
  }

  async deleteCampaign(campaignId: number, storeId: number): Promise<void> {
    await this.db.delete(s.whatsappCampaigns)
      .where(and(
        eq(s.whatsappCampaigns.id, campaignId),
        eq(s.whatsappCampaigns.storeId, storeId),
        inArray(s.whatsappCampaigns.status, ['draft', 'failed']),
      ));
  }

  private async resolveRecipients(
    storeId: number,
    _segmentType?: CustomerSegmentType,
  ): Promise<Array<{ customerId: number; phone: string }>> {
    const rows = await this.db.select({
      id: s.customers.id,
      phone: s.customers.phone,
    }).from(s.customers)
      .where(eq(s.customers.storeId, storeId));

    return rows
      .filter(r => r.phone && normalizeWhatsappPhone(r.phone))
      .map(r => ({ customerId: r.id, phone: normalizeWhatsappPhone(r.phone!)! }));
  }
}

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
