import { describe, expect, it } from 'vitest';
import {
  PLATFORM_COMPLIANCE_ITEMS,
  evaluatePlatformComplianceGate,
  summarizeTenantCompliance,
  type TenantCompliance,
} from '../apps/admin-dashboard/src/lib/platformComplianceGates';

function tenant(overrides: Partial<TenantCompliance> = {}): TenantCompliance {
  return {
    id: 1,
    name: 'Test tenant',
    slug: 'test-tenant',
    commercialRegistrationNumber: null,
    commercialRegistrationIssuedAt: null,
    vatNumber: null,
    vatRegisteredAt: null,
    ecommerceLicenseNumber: null,
    ecommerceLicenseIssuedAt: null,
    ecommerceLicenseExpiresAt: null,
    dpoEmail: null,
    dpoPhone: null,
    dpoAppointedAt: null,
    trademarkNumber: null,
    trademarkRegisteredAt: null,
    trademarkExpiresAt: null,
    asvLastScanAt: null,
    asvVendor: null,
    asvCertificateUrl: null,
    pentestLastScanAt: null,
    pentestVendor: null,
    pentestReportUrl: null,
    pentestPass: null,
    hostingRegion: null,
    hostingProvider: null,
    hostingKsaResidency: false,
    tabbyDpaSignedAt: null,
    tabbyDpaUrl: null,
    drPlanDocumentedAt: null,
    drLastTabletopAt: null,
    drNextTabletopAt: null,
    ...overrides,
  };
}

function gate(code: string) {
  const item = PLATFORM_COMPLIANCE_ITEMS.find((candidate) => candidate.code === code);
  if (!item) throw new Error(`Missing gate ${code}`);
  return item;
}

describe('platform admin compliance gates', () => {
  const now = new Date('2026-06-30T12:00:00.000Z');

  it('does not complete ASV from a certificate URL alone', () => {
    const result = evaluatePlatformComplianceGate(gate('G6'), tenant({
      asvCertificateUrl: 'https://example.com/asv.pdf',
    }), now);

    expect(result.status).toBe('needs_review');
  });

  it('marks stale ASV and pentest evidence by age', () => {
    const asv = evaluatePlatformComplianceGate(gate('G6'), tenant({
      asvCertificateUrl: 'https://example.com/asv.pdf',
      asvVendor: 'ASV Vendor',
      asvLastScanAt: '2026-01-01T00:00:00.000Z',
    }), now);
    const pentest = evaluatePlatformComplianceGate(gate('G7'), tenant({
      pentestReportUrl: 'https://example.com/pentest.pdf',
      pentestVendor: 'CREST Vendor',
      pentestLastScanAt: '2025-01-01T00:00:00.000Z',
      pentestPass: true,
    }), now);

    expect(asv.status).toBe('stale');
    expect(pentest.status).toBe('stale');
  });

  it('marks expired owner registrations separately from missing fields', () => {
    const result = evaluatePlatformComplianceGate(gate('G3'), tenant({
      ecommerceLicenseNumber: 'EC-123',
      ecommerceLicenseIssuedAt: '2025-01-01T00:00:00.000Z',
      ecommerceLicenseExpiresAt: '2026-01-01T00:00:00.000Z',
    }), now);

    expect(result.status).toBe('expired');
  });

  it('requires explicit KSA residency confirmation for hosting', () => {
    const result = evaluatePlatformComplianceGate(gate('G8'), tenant({
      hostingProvider: 'Hostinger',
      hostingRegion: 'KSA',
      hostingKsaResidency: false,
    }), now);

    expect(result.status).toBe('needs_review');
  });

  it('counts only complete gates toward the tenant percentage', () => {
    const summary = summarizeTenantCompliance(tenant({
      commercialRegistrationNumber: '1010123456',
      commercialRegistrationIssuedAt: '2026-01-15T00:00:00.000Z',
      asvCertificateUrl: 'https://example.com/asv.pdf',
    }), now);

    expect(summary.completeSlots).toBe(1);
    expect(summary.issueCount).toBe(1);
    expect(summary.percent).toBe(10);
  });
});
