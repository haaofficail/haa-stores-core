import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildMerchantVerificationRecords,
  calculatePublishReadiness,
  evaluateContactVerification,
  evaluateRegistryVerification,
  normalizeBankVerificationStatus,
  toBankVerificationView,
  type MerchantBankAccountSource,
} from '../apps/admin-dashboard/src/lib/merchantVerification';

describe('admin merchant verification readiness', () => {
  it('allows publishing only when all merchant verification checks pass', () => {
    const result = calculatePublishReadiness({
      storeProfileComplete: true,
      phoneVerified: true,
      emailVerified: true,
      registryStatus: 'accepted',
      bankStatus: 'verified',
      paymentConfigured: true,
      shippingConfigured: true,
      policiesPresent: true,
      highRiskFlags: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(result.checklist.every((item) => item.status === 'passed')).toBe(true);
  });

  it('blocks readiness when the bank account is rejected', () => {
    const result = calculatePublishReadiness({
      storeProfileComplete: true,
      phoneVerified: true,
      emailVerified: true,
      registryStatus: 'accepted',
      bankStatus: 'rejected',
      paymentConfigured: true,
      shippingConfigured: true,
      policiesPresent: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).toContain('الحساب البنكي غير موثق.');
  });

  it('blocks readiness when phone verification is missing', () => {
    const result = calculatePublishReadiness({
      storeProfileComplete: true,
      phoneVerified: false,
      emailVerified: true,
      registryStatus: 'accepted',
      bankStatus: 'verified',
      paymentConfigured: true,
      shippingConfigured: true,
      policiesPresent: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).toContain('رقم الجوال غير موثق.');
  });

  it('keeps a submitted registry document reviewable instead of blocking KYC approval', () => {
    const result = calculatePublishReadiness({
      storeProfileComplete: true,
      phoneVerified: true,
      emailVerified: true,
      registryStatus: 'pending_review',
      bankStatus: 'verified',
      paymentConfigured: true,
      shippingConfigured: true,
      policiesPresent: true,
      highRiskFlags: [],
    });

    const registry = result.checklist.find((item) => item.key === 'registry');

    expect(result.allowed).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(registry?.status).toBe('warning');
    expect(result.warnings).toContain('السجل التجاري أو وثيقة العمل الحر بانتظار قرار المراجع.');
  });

  it('returns actionable admin links and merchant instructions for blocked checklist items', () => {
    const result = calculatePublishReadiness({
      storeProfileComplete: false,
      phoneVerified: false,
      emailVerified: false,
      registryStatus: 'not_added',
      bankStatus: 'pending_review',
      paymentConfigured: false,
      shippingConfigured: false,
      policiesPresent: false,
      highRiskFlags: ['manual_review'],
    });

    const phone = result.checklist.find((item) => item.key === 'phone');
    const bank = result.checklist.find((item) => item.key === 'bank');
    const payment = result.checklist.find((item) => item.key === 'payment');

    expect(phone?.action.adminHref).toBe('/kyc');
    expect(phone?.action.merchantInstruction).toContain('OTP');
    expect(bank?.action.adminHref).toBe('/bank-accounts');
    expect(bank?.action.merchantInstruction).toContain('حساب بنكي');
    expect(payment?.action.adminHref).toBe('/store-payment-settings');
    expect(result.blockingReasons.length).toBeGreaterThanOrEqual(8);
  });

  it('normalizes bank-account states without requiring a full IBAN', () => {
    expect(normalizeBankVerificationStatus(null)).toBe('not_added');
    expect(normalizeBankVerificationStatus({ status: 'submitted' })).toBe('pending_review');
    expect(normalizeBankVerificationStatus({ status: 'verified' })).toBe('verified');
    expect(normalizeBankVerificationStatus({ status: 'rejected' })).toBe('rejected');
    expect(normalizeBankVerificationStatus({ verificationStatus: 'needs_reverification' })).toBe('needs_reverification');
  });

  it('sanitizes bank-account display data to last four digits only', () => {
    const source = {
      bankName: 'البنك الأول',
      accountHolderName: 'شركة المثال',
      iban: 'SA0380000000608010167519',
      ibanLast4: '7519',
      status: 'verified',
    } as MerchantBankAccountSource & { iban: string };

    const view = toBankVerificationView(source);

    expect(view).not.toHaveProperty('iban');
    expect(JSON.stringify(view)).not.toContain('SA0380000000608010167519');
    expect(view.maskedIban).toBe('****7519');
  });

  it('evaluates commercial registration and freelance document state by entity type', () => {
    const now = new Date('2026-06-30T00:00:00.000Z');

    expect(evaluateRegistryVerification({
      commercialRegistrationNumber: '1010123456',
      status: 'approved',
      expiryDate: '2027-01-01T00:00:00.000Z',
      activityMatchStatus: 'matched',
    }, 'company', now).status).toBe('accepted');

    expect(evaluateRegistryVerification({
      freelanceDocumentNumber: 'FL-12345',
      status: 'approved',
      expiryDate: '2027-01-01T00:00:00.000Z',
    }, 'freelance', now).status).toBe('accepted');

    expect(evaluateRegistryVerification({
      commercialRegistrationNumber: '1010123456',
      status: 'approved',
      expiryDate: '2025-01-01T00:00:00.000Z',
    }, 'establishment', now).status).toBe('expired');
  });

  it('flags a phone change after successful phone verification', () => {
    const contact = evaluateContactVerification({
      phoneVerified: true,
      phoneVerifiedAt: '2026-01-01T00:00:00.000Z',
      phoneLastChangedAt: '2026-02-01T00:00:00.000Z',
      emailVerified: true,
      emailVerifiedAt: '2026-01-01T00:00:00.000Z',
      lastOtpAttemptAt: '2026-02-01T00:05:00.000Z',
      lastOtpAttemptStatus: 'sent',
    });

    expect(contact.phoneChangedAfterVerification).toBe(true);
    expect(contact.lastOtpAttemptStatus).toBe('sent');
  });

  it('builds records from existing admin data without exposing full bank numbers', () => {
    const records = buildMerchantVerificationRecords({
      tenants: [{ id: 10, name: 'تاجر العطور', slug: 'perfumes', phoneVerified: true, emailVerified: true }],
      stores: [{
        id: 20,
        tenantId: 10,
        name: 'متجر العطور',
        slug: 'luxury-store',
        email: 'owner@example.com',
        phone: '+966555555555',
        phoneVerified: true,
        emailVerified: true,
        paymentStatus: 'active',
        shippingStatus: 'active',
        policies: { privacy: 'yes', returns: 'yes', shipping: 'yes', terms: 'yes' },
      }],
      kycProfiles: [{
        id: 30,
        storeId: 20,
        businessType: 'establishment',
        legalName: 'مؤسسة العطور',
        commercialRegistrationNumber: '1010123456',
        status: 'approved',
      }],
      bankAccounts: [{
        id: 40,
        storeId: 20,
        bankName: 'البنك الأول',
        accountHolderName: 'مؤسسة العطور',
        iban: 'SA0380000000608010167519',
        ibanLast4: '1234',
        status: 'verified',
      } as MerchantBankAccountSource & { iban: string }],
    });

    expect(records).toHaveLength(1);
    expect(records[0].readiness.allowed).toBe(true);
    expect(JSON.stringify(records[0])).not.toContain('SA0380000000608010167519');
    expect(records[0].bank.maskedIban).toBe('****1234');
  });
});

describe('admin merchant verification page separation', () => {
  it('does not render owner-side operational gate vocabulary in the merchant verification page', () => {
    const page = readFileSync(new URL('../apps/admin-dashboard/src/pages/Compliance.tsx', import.meta.url), 'utf-8');
    const model = readFileSync(new URL('../apps/admin-dashboard/src/lib/merchantVerification.ts', import.meta.url), 'utf-8');
    const combined = `${page}\n${model}`;

    expect(combined).not.toMatch(/\bG(?:[1-9]|10)\b/);
    expect(combined).not.toMatch(/\bPCI\b/i);
    expect(combined).not.toMatch(/\bASV\b/i);
    expect(combined).not.toMatch(/pen[- ]?test/i);
    expect(combined).not.toMatch(/disaster recovery/i);
  });

  it('keeps the dedicated owner-side gate engine outside the page route', () => {
    const page = readFileSync(new URL('../apps/admin-dashboard/src/pages/Compliance.tsx', import.meta.url), 'utf-8');

    expect(page).toContain("../lib/merchantVerification");
    expect(page).not.toContain("../lib/platformComplianceGates");
  });

  it('exposes a complete admin decision workflow instead of read-only diagnostics', () => {
    const page = readFileSync(new URL('../apps/admin-dashboard/src/pages/Compliance.tsx', import.meta.url), 'utf-8');

    expect(page).toContain("submitDecision(decisionMode === 'changes' ? 'needs_more_info' : 'rejected')");
    expect(page).toContain('لا يمكن الاعتماد قبل إغلاق موانع الجاهزية');
    expect(page).toContain('merchant-verification-decision-reason');
    expect(page).toContain('adminApi.reviewBankAccount');
    expect(page).toContain('merchant-bank-review-reason');
    expect(page).toContain('مراحل اعتماد التاجر');
    expect(page).toContain('المبيعات والمستخلصات');
    expect(page).toContain('السجل والتعديلات');
  });

  it('uses a separate merchant file route instead of rendering all details under the merchant list', () => {
    const app = readFileSync(new URL('../apps/admin-dashboard/src/App.tsx', import.meta.url), 'utf-8');
    const page = readFileSync(new URL('../apps/admin-dashboard/src/pages/Compliance.tsx', import.meta.url), 'utf-8');

    expect(app).toContain('path="/compliance/:recordId"');
    expect(page).toContain('function merchantFilePath(record: MerchantVerificationRecord)');
    expect(page).toContain('const { recordId } = useParams');
    expect(page).toContain('if (isMerchantFile)');
    expect(page).not.toContain('setSelectedId(record.id)');
  });

  it('scopes merchant-file payments to the selected store on the server', () => {
    const page = readFileSync(new URL('../apps/admin-dashboard/src/pages/Compliance.tsx', import.meta.url), 'utf-8');
    const api = readFileSync(new URL('../apps/admin-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');

    expect(api).toContain('getPayments: (params: { storeId?: number } = {})');
    expect(api).toContain("qs.set('storeId', String(params.storeId))");
    expect(page).toContain('adminApi.getPayments({ storeId: selectedRecord!.storeId! })');
    expect(page).toContain('enabled: isMerchantFile && canReadPayments && Boolean(selectedRecord?.storeId)');
  });
});

describe('admin merchant verification API safeguards', () => {
  it('requires and persists a reason when requesting changes', () => {
    const adminIndex = readFileSync(new URL('../apps/api/src/routes/admin/index.ts', import.meta.url), 'utf-8');
    const routes = readFileSync(new URL('../apps/api/src/routes/admin/tenants-stores.ts', import.meta.url), 'utf-8');

    expect(adminIndex).toContain("status: z.enum(['approved', 'rejected', 'needs_more_info'])");
    expect(adminIndex).toContain('Review reason is required when rejecting or requesting changes');
    expect(routes).toContain("rejectionReason: status === 'approved' ? null : (rejectionReason || null)");
    expect(routes).toContain("templateCode = status === 'approved' ? 'kyc_approved'");
  });
});
