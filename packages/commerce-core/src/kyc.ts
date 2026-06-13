import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { KycStatus, BusinessType } from '@haa/shared';

const VALID_TRANSITIONS: Record<KycStatus, KycStatus[]> = {
  not_started: ['draft'],
  draft: ['submitted', 'not_started'],
  submitted: ['under_review', 'draft', 'needs_more_info'],
  under_review: ['approved', 'rejected', 'needs_more_info'],
  approved: ['suspended'],
  rejected: ['draft', 'needs_more_info'],
  needs_more_info: ['submitted', 'draft'],
  suspended: ['draft', 'under_review'],
};

const REQUIRED_FIELDS_BY_TYPE: Record<BusinessType, string[]> = {
  individual: ['legalName', 'nationalIdOrIqama', 'city'],
  establishment: ['legalName', 'commercialRegistrationNumber', 'city'],
  company: ['legalName', 'commercialName', 'commercialRegistrationNumber', 'city'],
  freelancer: ['legalName', 'freelanceDocumentNumber', 'city'],
  productive_family: ['legalName', 'city'],
};

const ALLOWED_DOC_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export class KycService {
  constructor(private db: DbClient = createDbClient()) {}

  async getProfile(storeId: number) {
    const [profile] = await this.db.select().from(s.kycProfiles)
      .where(eq(s.kycProfiles.storeId, storeId)).limit(1);
    return profile ?? null;
  }

  async upsertProfile(storeId: number, tenantId: number, data: {
    businessType?: BusinessType;
    legalName?: string;
    commercialName?: string;
    nationalIdOrIqama?: string;
    commercialRegistrationNumber?: string;
    freelanceDocumentNumber?: string;
    vatNumber?: string;
    country?: string;
    city?: string;
    address?: string;
  }) {
    const existing = await this.getProfile(storeId);
    if (existing) {
      if (existing.status === 'submitted' || existing.status === 'under_review' || existing.status === 'approved') {
        throw new Error('Cannot modify profile while in review or approved');
      }
      const [updated] = await this.db.update(s.kycProfiles).set({
        ...data, status: 'draft', updatedAt: new Date(),
      }).where(eq(s.kycProfiles.id, existing.id)).returning();
      return updated;
    }
    const [created] = await this.db.insert(s.kycProfiles).values({
      storeId, tenantId, ...data, status: 'draft',
      businessType: data.businessType || 'individual',
    }).returning();
    return created;
  }

  async submitProfile(storeId: number) {
    const profile = await this.getProfile(storeId);
    if (!profile) throw new Error('KYC profile not found. Please complete your profile first.');
    if (profile.status !== 'draft' && profile.status !== 'needs_more_info') {
      throw new Error(`Cannot submit from status: ${profile.status}`);
    }
    const missing = this.getMissingFields(profile.businessType as BusinessType, profile);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    const docs = await this.getDocuments(storeId);
    if (docs.length === 0) {
      throw new Error('At least one document is required');
    }
    const [updated] = await this.db.update(s.kycProfiles).set({
      status: 'submitted', submittedAt: new Date(), updatedAt: new Date(),
    }).where(eq(s.kycProfiles.id, profile.id)).returning();
    return updated;
  }

  async getStatus(storeId: number) {
    const profile = await this.getProfile(storeId);
    if (!profile) return { status: 'not_started' as KycStatus, completionPercent: 0 };
    const docs = await this.getDocuments(storeId);
    const bankAccounts = await this.getBankAccounts(storeId);
    const missing = this.getMissingFields(profile.businessType as BusinessType, profile);
    const totalFields = REQUIRED_FIELDS_BY_TYPE[profile.businessType as BusinessType]?.length || 1;
    const completedFields = totalFields - missing.length;
    const hasDocuments = docs.length > 0;
    const hasBank = bankAccounts.length > 0;
    const completionPercentage = Math.round(
      ((completedFields / totalFields) * 0.4 + (hasDocuments ? 0.3 : 0) + (hasBank ? 0.3 : 0)) * 100
    );
    return {
      status: profile.status as KycStatus,
      completionPercent: completionPercentage,
      businessType: profile.businessType,
      missingFields: missing,
      hasDocuments,
      hasBankAccount: hasBank,
      submittedAt: profile.submittedAt,
    };
  }

  async getDocuments(storeId: number) {
    return this.db.select().from(s.kycDocuments)
      .where(eq(s.kycDocuments.storeId, storeId))
      .orderBy(s.kycDocuments.uploadedAt);
  }

  async uploadDocument(storeId: number, data: {
    type: string;
    fileUrl: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    if (!ALLOWED_DOC_MIME_TYPES.includes(data.mimeType)) {
      throw new Error(`Document type not allowed. Allowed: ${ALLOWED_DOC_MIME_TYPES.join(', ')}`);
    }
    if (data.sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error(`Document too large. Maximum: ${MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024}MB`);
    }
    const profile = await this.getProfile(storeId);
    if (!profile) throw new Error('KYC profile not found');
    const [doc] = await this.db.insert(s.kycDocuments).values({
      storeId, profileId: profile.id, ...data,
    }).returning();
    return { id: doc.id, type: doc.type, filename: doc.filename, status: doc.status };
  }

  async deleteDocument(storeId: number, documentId: number) {
    const profile = await this.getProfile(storeId);
    if (!profile) throw new Error('KYC profile not found');
    if (profile.status === 'submitted' || profile.status === 'under_review' || profile.status === 'approved') {
      throw new Error('Cannot delete documents while in review or approved');
    }
    await this.db.delete(s.kycDocuments)
      .where(and(eq(s.kycDocuments.id, documentId), eq(s.kycDocuments.storeId, storeId)));
  }

  async getBankAccounts(storeId: number) {
    return this.db.select().from(s.merchantBankAccounts)
      .where(eq(s.merchantBankAccounts.storeId, storeId));
  }

  async upsertBankAccount(storeId: number, data: {
    accountHolderName: string;
    bankName: string;
    iban: string;
  }) {
    if (!this.isValidSaudiban(data.iban)) {
      throw new Error('Invalid Saudi IBAN. Must start with SA and be 24 characters.');
    }
    const ibanLast4 = data.iban.slice(-4);
    const existing = await this.getBankAccounts(storeId);
    if (existing.length > 0) {
      const [updated] = await this.db.update(s.merchantBankAccounts).set({
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        iban: data.iban,
        ibanLast4,
        updatedAt: new Date(),
        status: 'submitted',
      }).where(eq(s.merchantBankAccounts.id, existing[0].id)).returning();
      return { id: updated.id, status: updated.status, ibanLast4: updated.ibanLast4, bankName: updated.bankName };
    }
    const [created] = await this.db.insert(s.merchantBankAccounts).values({
      storeId, ...data, ibanLast4,
      accountHolderName: data.accountHolderName,
      bankName: data.bankName,
      iban: data.iban,
    }).returning();
    return { id: created.id, status: created.status, ibanLast4: created.ibanLast4, bankName: created.bankName };
  }

  isKycApproved(status: KycStatus): boolean {
    return status === 'approved';
  }

  async canPayout(storeId: number): Promise<{ allowed: boolean; reason?: string }> {
    const profile = await this.getProfile(storeId);
    if (!profile || profile.status !== 'approved') {
      return { allowed: false, reason: 'KYC must be approved before payouts are enabled' };
    }
    return { allowed: true };
  }

  private getMissingFields(businessType: BusinessType, profile: Record<string, unknown>): string[] {
    const required = REQUIRED_FIELDS_BY_TYPE[businessType] || [];
    return required.filter(f => !profile[f] || (typeof profile[f] === 'string' && (profile[f] as string).trim() === ''));
  }

  private isValidSaudiban(iban: string): boolean {
    const cleaned = iban.replace(/\s/g, '');
    return cleaned.startsWith('SA') && cleaned.length === 24;
  }

  isValidTransition(from: KycStatus, to: KycStatus): boolean {
    return (VALID_TRANSITIONS[from] || []).includes(to);
  }
}
