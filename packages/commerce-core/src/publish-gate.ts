import { eq } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import { ComplianceChecklistService, type ComplianceCheckInput } from './compliance-checklist.js';
import { AcknowledgementService, type AcknowledgementStatus } from './acknowledgement.js';
import type { PublishStatus, ComplianceCheckResult } from '@haa/shared';

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
        newValue: { publishStatus: 'restricted', blockingErrorsCount: checklist.blockingErrorsCount },
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
}
