import { eq } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import { renderStorePublishedEmail } from '@haa/notification-core';
import { ComplianceChecklistService } from './compliance-checklist.js';
import { AcknowledgementService, type AcknowledgementStatus } from './acknowledgement.js';
import { pickWelcomeEmailProvider } from './email-provider.js';
import type { PublishStatus, ComplianceCheckResult } from '@haa/shared';

/**
 * Internal — full context required to render the publish-success email.
 * Extends `StorePublishedContext` from `@haa/notification-core` with the
 * recipient email (which the renderer itself does not need, but the
 * provider.send() call does). Kept private to this module so we don't
 * pollute the notification-core public types with a recipient field
 * that's never part of the rendered HTML.
 */
interface PublishedEmailContext {
  merchantName: string;
  merchantEmail: string;
  storeName: string;
  storeUrl: string;
  dashboardUrl: string;
}

/**
 * Resolve the storefront base URL for a merchant's store. Mirrors the
 * subdomain pattern used in `auth-flow.buildStoreBaseUrl` so all
 * transactional emails point at the same canonical surface:
 * `https://<slug>.haastores.com` (the `STOREFRONT_APEX_DOMAIN` env
 * lets staging override the apex).
 */
function buildStoreBaseUrl(slug: string): string {
  const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
  return `https://${slug}.${apex}`;
}

/**
 * Resolve the merchant dashboard base URL. The dashboard is hosted on
 * the apex `merchant.<apex>` subdomain. Falls back to the production
 * value when `STOREFRONT_APEX_DOMAIN` is unset.
 */
function buildDashboardUrl(): string {
  const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
  return `https://merchant.${apex}`;
}

export interface PublishResult {
  success: boolean;
  publishStatus?: PublishStatus;
  checklist?: ComplianceCheckResult;
  acknowledgement?: AcknowledgementStatus;
  message?: string;
}

export interface PublishContext {
  actorUserId?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class PublishGateService {
  private checklistService: ComplianceChecklistService;
  private acknowledgementService: AcknowledgementService;
  private auditService: AuditLogService;

  constructor(private db: DbClient = createDbClient()) {
    this.checklistService = new ComplianceChecklistService(db);
    this.acknowledgementService = new AcknowledgementService(db);
    this.auditService = new AuditLogService(db);
  }

  async getPublishStatus(storeId: number): Promise<PublishStatus> {
    const [store] = await this.db.select({ publishStatus: s.stores.publishStatus })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    return (store?.publishStatus as PublishStatus) || 'draft';
  }

  async publish(storeId: number, tenantId: number, ctx?: PublishContext): Promise<PublishResult> {
    const currentStatus = await this.getPublishStatus(storeId);
    if (currentStatus === 'suspended') {
      return { success: false, message: 'المتجر موقوف — لا يمكن النشر' };
    }

    const checklist = await this.checklistService.run(storeId, tenantId);

    if (!checklist.passed) {
      await this.updatePublishStatus(storeId, 'restricted');
      await this.auditService.record({
        actorUserId: ctx?.actorUserId ?? null,
        tenantId,
        storeId,
        action: 'compliance_check_failed',
        entityType: 'store',
        entityId: storeId,
        oldValue: { publishStatus: currentStatus },
        newValue: { publishStatus: 'restricted', blockingErrorsCount: checklist.blockingErrorsCount, warningsCount: checklist.warningsCount },
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
      });
      return {
        success: false,
        checklist,
        message: 'الامتثال غير مكتمل — لا يمكن النشر',
      };
    }

    // Check Merchant Acknowledgement
    const acknowledgement = await this.acknowledgementService.getStatus(storeId);
    if (!acknowledgement.acknowledged) {
      return {
        success: false,
        acknowledgement,
        message: 'الإقرار مطلوب قبل النشر',
      };
    }

    await this.updatePublishStatus(storeId, 'published');
    await this.auditService.record({
      actorUserId: ctx?.actorUserId ?? null,
      tenantId,
      storeId,
      action: 'store_published',
      entityType: 'store',
      entityId: storeId,
      oldValue: { publishStatus: currentStatus },
      newValue: { publishStatus: 'published' },
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    // HAA-PUBLISH-SUCCESS-EMAIL — Fire-and-forget. The DB row
    // (`stores.publish_status = 'published'`) is the source of truth
    // for "this store is now live"; email failure must NEVER fail the
    // publish response. Same pattern as the welcome email in
    // AuthFlowService.verifySignup and the order emails in
    // OrdersService.sendOrderEmail.
    void (async () => {
      try {
        const provider = pickWelcomeEmailProvider();
        if (!provider) return;
        const emailCtx = await this.buildPublishedContext(storeId);
        if (!emailCtx) return;
        const { subject, html } = renderStorePublishedEmail({
          merchantName: emailCtx.merchantName,
          storeName: emailCtx.storeName,
          storeUrl: emailCtx.storeUrl,
          dashboardUrl: emailCtx.dashboardUrl,
        });
        await provider.send({ recipient: emailCtx.merchantEmail, subject, body: html });
      } catch (err) {
        // Log only the kind + store id — no PII (no email, no name).
        console.error(
          '[publish-email] kind=store_published store=' +
            storeId +
            ' err=' +
            (err instanceof Error ? err.message : 'unknown'),
        );
      }
    })();

    return {
      success: true,
      publishStatus: 'published',
      message: 'تم نشر المتجر بنجاح',
    };
  }

  async unpublish(storeId: number, ctx?: PublishContext): Promise<PublishResult> {
    const currentStatus = await this.getPublishStatus(storeId);
    if (currentStatus === 'suspended') {
      return { success: false, message: 'المتجر موقوف — لا يمكن إلغاء النشر' };
    }

    await this.updatePublishStatus(storeId, 'draft');
    await this.auditService.record({
      actorUserId: ctx?.actorUserId ?? null,
      tenantId: null,
      storeId,
      action: 'store_unpublished',
      entityType: 'store',
      entityId: storeId,
      oldValue: { publishStatus: currentStatus },
      newValue: { publishStatus: 'draft' },
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
    });
    return {
      success: true,
      publishStatus: 'draft',
      message: 'تم إلغاء نشر المتجر',
    };
  }

  private async updatePublishStatus(storeId: number, status: PublishStatus): Promise<void> {
    await this.db.update(s.stores)
      .set({ publishStatus: status, updatedAt: new Date() })
      .where(eq(s.stores.id, storeId));
  }

  /**
   * HAA-PUBLISH-SUCCESS-EMAIL — Assemble the publish-success email
   * context. Joins `stores` + `tenant_users` (role='owner') + `users`
   * to pull the merchant's display name, recipient email, the store's
   * display name + slug, and derives the public storefront + dashboard
   * URLs (same env-aware helpers as `auth-flow.buildWelcomeContext`).
   *
   * Returns `null` if any required field can't be resolved — the caller
   * treats that as "skip the email" (no throw, never blocks publish).
   *
   * The "primary merchant" resolution mirrors `auth-flow.buildWelcomeContext`:
   * we pick the first `tenant_users` row with role='owner' on the
   * store's tenant. (`auth-flow` walks user → tenant; we walk store →
   * tenant → owner-user — same join, different starting node.)
   */
  private async buildPublishedContext(storeId: number): Promise<PublishedEmailContext | null> {
    const [store] = await this.db
      .select({
        name: s.stores.name,
        slug: s.stores.slug,
        tenantId: s.stores.tenantId,
      })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (!store) return null;

    const [tenantUser] = await this.db
      .select({ userId: s.tenantUsers.userId })
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.tenantId, store.tenantId))
      .limit(1);
    if (!tenantUser) return null;

    const [user] = await this.db
      .select({ name: s.users.name, email: s.users.email })
      .from(s.users)
      .where(eq(s.users.id, tenantUser.userId))
      .limit(1);
    if (!user) return null;
    if (!user.email) return null;
    if (!user.name) return null;

    return {
      merchantName: user.name,
      merchantEmail: user.email,
      storeName: store.name,
      storeUrl: buildStoreBaseUrl(store.slug),
      dashboardUrl: buildDashboardUrl(),
    };
  }
}
