import { eq, desc } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import {
  PLATFORM_TERMS, PLATFORM_PRIVACY, PLATFORM_DATA_PROCESSING,
  PLATFORM_PROHIBITED_PRODUCTS, PLATFORM_TAKEDOWN,
  type LegalDocument,
} from '@haa/shared';

export interface AcknowledgementStatus {
  acknowledged: boolean;
  acceptedVersions: Record<string, string> | null;
  currentVersions: Record<string, string>;
  missingItems: string[];
  acceptedAt: string | null;
}

export interface AcknowledgeInput {
  storeId: number;
  merchantUserId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  acknowledgedItems: Record<string, boolean>;
}

const DOCUMENT_VERSIONS: Record<string, LegalDocument> = {
  terms: PLATFORM_TERMS,
  privacy: PLATFORM_PRIVACY,
  dataProcessing: PLATFORM_DATA_PROCESSING,
  prohibitedProducts: PLATFORM_PROHIBITED_PRODUCTS,
  takedown: PLATFORM_TAKEDOWN,
};

const REQUIRED_ITEMS = [
  { key: 'terms', label: 'شروط استخدام المنصة', versionField: 'termsVersion' as const },
  { key: 'privacy', label: 'سياسة الخصوصية', versionField: 'privacyVersion' as const },
  { key: 'dataProcessing', label: 'اتفاقية معالجة البيانات', versionField: 'dataProcessingVersion' as const },
  { key: 'prohibitedProducts', label: 'المنتجات المحظورة', versionField: 'prohibitedProductsVersion' as const },
  { key: 'takedown', label: 'البلاغات والإزالة', versionField: 'takedownPolicyVersion' as const },
];

const REQUIRED_CHECKBOXES = [
  { key: 'dataAccuracy', label: 'أقر بصحة بياناتي التجارية والقانونية' },
  { key: 'productResponsibility', label: 'أقر بمسؤوليتي عن المنتجات والأسعار' },
  { key: 'shippingReturns', label: 'أقر بمسؤوليتي عن الشحن والاسترجاع والضمان' },
  { key: 'taxInvoices', label: 'أقر بمسؤوليتي عن الضريبة والفواتير' },
  { key: 'customerData', label: 'أقر بمسؤوليتي عن بيانات العملاء وفق الأنظمة' },
  { key: 'saudiRegulations', label: 'أقر بالالتزام بالأنظمة المعمول بها في المملكة العربية السعودية' },
];

export class AcknowledgementService {
  private auditService: AuditLogService;

  constructor(private db: DbClient = createDbClient()) {
    this.auditService = new AuditLogService(db);
  }

  getCurrentVersions(): Record<string, string> {
    return {
      terms: PLATFORM_TERMS.version,
      privacy: PLATFORM_PRIVACY.version,
      dataProcessing: PLATFORM_DATA_PROCESSING.version,
      prohibitedProducts: PLATFORM_PROHIBITED_PRODUCTS.version,
      takedown: PLATFORM_TAKEDOWN.version,
    };
  }

  async getStatus(storeId: number): Promise<AcknowledgementStatus> {
    const currentVersions = this.getCurrentVersions();
    const [latest] = await this.db.select()
      .from(s.merchantAcknowledgements)
      .where(eq(s.merchantAcknowledgements.storeId, storeId))
      .orderBy(desc(s.merchantAcknowledgements.acceptedAt))
      .limit(1);

    if (!latest) {
      return {
        acknowledged: false,
        acceptedVersions: null,
        currentVersions,
        missingItems: Object.keys(currentVersions),
        acceptedAt: null,
      };
    }

    const acceptedVersions: Record<string, string> = {
      terms: latest.termsVersion,
      privacy: latest.privacyVersion,
      dataProcessing: latest.dataProcessingVersion,
      prohibitedProducts: latest.prohibitedProductsVersion,
      takedown: latest.takedownPolicyVersion,
    };

    const missingItems: string[] = [];
    for (const item of REQUIRED_ITEMS) {
      if (acceptedVersions[item.key] !== currentVersions[item.key]) {
        missingItems.push(item.key);
      }
    }

    const items = latest.acknowledgedItems as Record<string, boolean>;
    for (const checkbox of REQUIRED_CHECKBOXES) {
      if (!items[checkbox.key]) {
        missingItems.push(checkbox.key);
      }
    }

    return {
      acknowledged: missingItems.length === 0,
      acceptedVersions,
      currentVersions,
      missingItems,
      acceptedAt: latest.acceptedAt?.toISOString() ?? null,
    };
  }

  async acknowledge(input: AcknowledgeInput): Promise<AcknowledgementStatus> {
    const currentVersions = this.getCurrentVersions();
    const versions = {
      termsVersion: currentVersions.terms,
      privacyVersion: currentVersions.privacy,
      dataProcessingVersion: currentVersions.dataProcessing,
      prohibitedProductsVersion: currentVersions.prohibitedProducts,
      takedownPolicyVersion: currentVersions.takedown,
    };

    await this.db.insert(s.merchantAcknowledgements).values({
      merchantUserId: input.merchantUserId,
      storeId: input.storeId,
      ...versions,
      acknowledgedItems: input.acknowledgedItems,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    await this.auditService.record({
      actorUserId: input.merchantUserId,
      storeId: input.storeId,
      action: 'merchant_acknowledgement',
      entityType: 'store',
      entityId: input.storeId,
      oldValue: null,
      newValue: {
        versions: currentVersions,
        acknowledgedItems: input.acknowledgedItems,
      },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return this.getStatus(input.storeId);
  }

  getRequiredItems() {
    return REQUIRED_ITEMS;
  }

  getRequiredCheckboxes() {
    return REQUIRED_CHECKBOXES;
  }
}
