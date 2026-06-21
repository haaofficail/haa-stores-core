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

  /**
   * عالج رسالة WhatsApp واردة — يطبّق إلغاء/تجديد الاشتراك امتثالاً (QA WA2).
   * يُستدعى من webhook المزوّد. المطابقة بالرقم تتجاوز حدود المتجر:
   * إذا طلب رقمٌ التوقف، يُلغى اشتراكه أينما ظهر (التزام تنظيمي).
   * يطابق آخر 9 أرقام دالة (الجزء الوطني للجوال السعودي) لتجاوز اختلاف الصيغ.
   * @returns الإجراء المتخذ وعدد العملاء المتأثرين.
   */
  async processInboundMessage(input: { phone: string; body: string }): Promise<{
    action: 'opt_out' | 'opt_in' | 'none';
    matched: number;
  }> {
    const normalized = normalizeWhatsappPhone(input.phone);
    if (!normalized) return { action: 'none', matched: 0 };

    const action = classifyInboundMessage(input.body);
    if (action === 'none') return { action: 'none', matched: 0 };
    const isOptOut = action === 'opt_out';

    const suffix = significantDigits(normalized);
    if (!suffix) return { action: 'none', matched: 0 };

    // رشّح بالـ suffix على مستوى SQL ثم تحقّق من التطابق الدقيق في الذاكرة (تختلف الصيغ المخزّنة)
    const candidates = await this.db.select({ id: s.customers.id, phone: s.customers.phone })
      .from(s.customers)
      .where(sql`${s.customers.phone} LIKE ${'%' + suffix}`);

    const matchedIds = candidates
      .filter(r => significantDigits(normalizeWhatsappPhone(r.phone)) === suffix)
      .map(r => r.id);

    if (matchedIds.length === 0) {
      return { action: isOptOut ? 'opt_out' : 'opt_in', matched: 0 };
    }

    if (isOptOut) {
      await this.db.update(s.customers)
        .set({ whatsappOptOut: true })
        .where(inArray(s.customers.id, matchedIds));
      return { action: 'opt_out', matched: matchedIds.length };
    }

    // تجديد الاشتراك: ارفع الحظر فقط؛ الموافقة التسويقية تبقى كما هي (تتطلب opt-in صريح منفصل)
    await this.db.update(s.customers)
      .set({ whatsappOptOut: false })
      .where(inArray(s.customers.id, matchedIds));
    return { action: 'opt_in', matched: matchedIds.length };
  }

  /**
   * سجّل إيصال تسليم/قراءة وارد من المزوّد (QA WA5).
   * يطابق بالـ messageId. تقدّمي فقط: لا يتراجع read→delivered ولا يلمس الفاشل.
   * يحدّث عدّادات الحملة عند أول انتقال لكل حالة (لتفادي العدّ المزدوج عند تكرار الإيصال).
   * @returns هل طُوبق سجلٌ وحالته الجديدة.
   */
  async recordDeliveryStatus(input: { messageId: string; status: 'delivered' | 'read' | 'failed' }): Promise<{
    matched: boolean;
    status?: string;
  }> {
    const messageId = (input.messageId || '').trim();
    if (!messageId) return { matched: false };

    const [send] = await this.db.select().from(s.whatsappCampaignSends)
      .where(eq(s.whatsappCampaignSends.messageId, messageId)).limit(1);
    if (!send) return { matched: false };

    const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 };
    const now = new Date();

    if (input.status === 'failed') {
      // علّم فشلاً فقط إن لم يكن قد وصل/قُرئ أصلاً
      if (send.status === 'delivered' || send.status === 'read') return { matched: true, status: send.status };
      await this.db.update(s.whatsappCampaignSends)
        .set({ status: 'failed' })
        .where(eq(s.whatsappCampaignSends.id, send.id));
      await this.db.update(s.whatsappCampaigns)
        .set({ failedCount: sql`${s.whatsappCampaigns.failedCount} + 1`, updatedAt: now })
        .where(eq(s.whatsappCampaigns.id, send.campaignId));
      return { matched: true, status: 'failed' };
    }

    // تقدّمي فقط: تجاهل الإيصال إن كانت الحالة الحالية أحدث أو مساوية
    if ((RANK[send.status] ?? 0) >= RANK[input.status]) {
      return { matched: true, status: send.status };
    }

    const patch: Record<string, unknown> = { status: input.status };
    if (input.status === 'delivered') patch.deliveredAt = now;
    if (input.status === 'read') {
      patch.readAt = now;
      if (!send.deliveredAt) patch.deliveredAt = now; // القراءة تستلزم التسليم
    }

    await this.db.update(s.whatsappCampaignSends).set(patch)
      .where(eq(s.whatsappCampaignSends.id, send.id));

    // حدّث عدّادات الحملة عند أول انتقال لكل حالة
    const campaignPatch: Record<string, unknown> = { updatedAt: now };
    const crossedDelivered = (RANK[send.status] ?? 0) < RANK.delivered; // لم يُحتسب delivered بعد
    if (input.status === 'delivered') {
      campaignPatch.deliveredCount = sql`${s.whatsappCampaigns.deliveredCount} + 1`;
    } else if (input.status === 'read') {
      campaignPatch.readCount = sql`${s.whatsappCampaigns.readCount} + 1`;
      if (crossedDelivered) campaignPatch.deliveredCount = sql`${s.whatsappCampaigns.deliveredCount} + 1`;
    }
    await this.db.update(s.whatsappCampaigns).set(campaignPatch)
      .where(eq(s.whatsappCampaigns.id, send.campaignId));

    return { matched: true, status: input.status };
  }

  private async resolveRecipients(
    storeId: number,
    _segmentType?: CustomerSegmentType,
  ): Promise<Array<{ customerId: number; phone: string }>> {
    const rows = await this.db.select({
      id: s.customers.id,
      phone: s.customers.phone,
    }).from(s.customers)
      .where(and(
        eq(s.customers.storeId, storeId),
        // ممتثل: أرسل فقط لمن وافق صراحةً ولم يلغِ الاشتراك (QA WA1/WA3)
        eq(s.customers.whatsappMarketingConsent, true),
        eq(s.customers.whatsappOptOut, false),
      ));

    return rows
      .filter(r => r.phone && normalizeWhatsappPhone(r.phone))
      .map(r => ({ customerId: r.id, phone: normalizeWhatsappPhone(r.phone!)! }));
  }
}

/** كلمات إلغاء الاشتراك المعتمدة (إنجليزي + عربي) — مطابقة دقيقة للكلمة الأولى */
const OPT_OUT_KEYWORDS = new Set([
  'stop', 'unsubscribe', 'cancel', 'end', 'quit',
  'إيقاف', 'ايقاف', 'إلغاء', 'الغاء', 'توقف', 'إلغ', 'الغ',
]);
/** كلمات تجديد الاشتراك المعتمدة (إنجليزي + عربي) */
const OPT_IN_KEYWORDS = new Set([
  'start', 'subscribe', 'unstop', 'yes',
  'اشتراك', 'ابدأ', 'ابدا', 'تفعيل', 'نعم',
]);

/** آخر 9 أرقام دالة (الجزء الوطني للجوال) — للمطابقة عبر اختلاف الصيغ */
export function significantDigits(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
}

/**
 * صنّف رسالة واردة: إلغاء/تجديد اشتراك أو لا شيء (QA WA2).
 * يطابق الكلمة الأولى فقط لتفادي إلغاء عرضي ("please don't stop").
 */
export function classifyInboundMessage(body: string | null | undefined): 'opt_out' | 'opt_in' | 'none' {
  const firstWord = (body || '').trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (OPT_OUT_KEYWORDS.has(firstWord)) return 'opt_out';
  if (OPT_IN_KEYWORDS.has(firstWord)) return 'opt_in';
  return 'none';
}

/**
 * طابِق حالة تسليم المزوّد إلى تصنيفنا (QA WA5).
 * يغطّي تسميات Unifonic/WhatsApp الشائعة. يعيد null لما لا يُعرف (يُتجاهل).
 */
export function mapDeliveryStatus(raw: string | null | undefined): 'delivered' | 'read' | 'failed' | null {
  const v = (raw || '').trim().toLowerCase();
  if (['delivered', 'delivery', 'deliveredtohandset', 'dlvrd'].includes(v)) return 'delivered';
  if (['read', 'seen'].includes(v)) return 'read';
  if (['failed', 'undelivered', 'undeliverable', 'rejected', 'error', 'expired'].includes(v)) return 'failed';
  return null;
}

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
