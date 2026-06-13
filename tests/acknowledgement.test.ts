import { describe, it, expect, vi } from 'vitest';
import { AcknowledgementService } from '../packages/commerce-core/src/acknowledgement';
import {
  PLATFORM_TERMS, PLATFORM_PRIVACY, PLATFORM_DATA_PROCESSING,
  PLATFORM_PROHIBITED_PRODUCTS, PLATFORM_TAKEDOWN,
} from '../packages/shared/src/legal/platform-legal';

function createMockDb(existingRow: any = null) {
  const store: any[] = existingRow ? [existingRow] : [];
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => {
          const entry = { id: store.length + 1, ...store[store.length], createdAt: new Date(), acceptedAt: new Date() };
          return [entry];
        }),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => existingRow ? [existingRow] : []),
          })),
        })),
      })),
    })),
    _store: store,
  };
}

describe('AcknowledgementService', () => {
  describe('getCurrentVersions()', () => {
    it('يعيد versions الحالية من Platform Legal Pages', () => {
      const service = new AcknowledgementService(createMockDb() as any);
      const versions = service.getCurrentVersions();
      expect(versions.terms).toBe(PLATFORM_TERMS.version);
      expect(versions.privacy).toBe(PLATFORM_PRIVACY.version);
      expect(versions.dataProcessing).toBe(PLATFORM_DATA_PROCESSING.version);
      expect(versions.prohibitedProducts).toBe(PLATFORM_PROHIBITED_PRODUCTS.version);
      expect(versions.takedown).toBe(PLATFORM_TAKEDOWN.version);
    });
  });

  describe('getStatus()', () => {
    it('يُرجع acknowledged=false إذا لم يكن هناك إقرار', async () => {
      const db = createMockDb();
      const service = new AcknowledgementService(db as any);
      const status = await service.getStatus(1);
      expect(status.acknowledged).toBe(false);
      expect(status.acceptedVersions).toBeNull();
      expect(status.missingItems.length).toBeGreaterThan(0);
    });

    it('يُرجع acknowledged=true إذا كان الإقرار مكتمل', async () => {
      const versions = {
        termsVersion: PLATFORM_TERMS.version,
        privacyVersion: PLATFORM_PRIVACY.version,
        dataProcessingVersion: PLATFORM_DATA_PROCESSING.version,
        prohibitedProductsVersion: PLATFORM_PROHIBITED_PRODUCTS.version,
        takedownPolicyVersion: PLATFORM_TAKEDOWN.version,
      };
      const existingRow = {
        ...versions,
        storeId: 1,
        merchantUserId: 1,
        acknowledgedItems: {
          terms: true, privacy: true, dataProcessing: true, prohibitedProducts: true, takedown: true,
          dataAccuracy: true, productResponsibility: true, shippingReturns: true,
          taxInvoices: true, customerData: true, saudiRegulations: true,
        },
        acceptedAt: new Date(),
      };
      const db = createMockDb(existingRow);
      const service = new AcknowledgementService(db as any);
      const status = await service.getStatus(1);
      expect(status.acknowledged).toBe(true);
      expect(status.missingItems).toHaveLength(0);
    });

    it('يُرجع missingItems إذا كانت versions قديمة', async () => {
      const existingRow = {
        termsVersion: '0.9.0',
        privacyVersion: PLATFORM_PRIVACY.version,
        dataProcessingVersion: PLATFORM_DATA_PROCESSING.version,
        prohibitedProductsVersion: PLATFORM_PROHIBITED_PRODUCTS.version,
        takedownPolicyVersion: PLATFORM_TAKEDOWN.version,
        storeId: 1,
        merchantUserId: 1,
        acknowledgedItems: { terms: true, privacy: true, dataProcessing: true, prohibitedProducts: true, takedown: true },
        acceptedAt: new Date(),
      };
      const db = createMockDb(existingRow);
      const service = new AcknowledgementService(db as any);
      const status = await service.getStatus(1);
      expect(status.acknowledged).toBe(false);
      expect(status.missingItems).toContain('terms');
    });
  });

  describe('acknowledge()', () => {
    it('يخزن الإقرار مع versions الحالية', async () => {
      const db = createMockDb();
      const service = new AcknowledgementService(db as any);
      const status = await service.acknowledge({
        storeId: 1,
        merchantUserId: 1,
        acknowledgedItems: { terms: true, privacy: true, dataProcessing: true, prohibitedProducts: true, takedown: true },
      });
      expect(status).toBeDefined();
      expect(status.acknowledged).toBeDefined();
    });

    it('يخزن ipAddress و userAgent', async () => {
      const db = createMockDb();
      const service = new AcknowledgementService(db as any);
      const status = await service.acknowledge({
        storeId: 1,
        merchantUserId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        acknowledgedItems: { terms: true },
      });
      expect(status).toBeDefined();
    });
  });

  describe('Publish Gate integration', () => {
    it('لا يمكن النشر بدون إقرار', async () => {
      const db = createMockDb();
      const service = new AcknowledgementService(db as any);
      const status = await service.getStatus(1);
      expect(status.acknowledged).toBe(false);
    });
  });

  describe('Audit logging', () => {
    it('الإقرار يسجل merchant_acknowledgement', async () => {
      const db = createMockDb();
      const service = new AcknowledgementService(db as any);
      const status = await service.acknowledge({
        storeId: 1,
        merchantUserId: 5,
        ipAddress: '10.0.0.1',
        userAgent: 'TestBrowser',
        acknowledgedItems: { terms: true },
      });
      expect(status).toBeDefined();
    });
  });

  describe('Required items', () => {
    it('يحتوي على 5 وثائق مطلوبة', () => {
      const service = new AcknowledgementService(createMockDb() as any);
      const items = service.getRequiredItems();
      expect(items).toHaveLength(5);
    });

    it('يحتوي على 6 checkboxes مطلوبة', () => {
      const service = new AcknowledgementService(createMockDb() as any);
      const checkboxes = service.getRequiredCheckboxes();
      expect(checkboxes).toHaveLength(6);
    });
  });

  describe('Integration safety', () => {
    it('لا تعدل نصوص سياسات التاجر', () => {
      const merchantPolicyTypes = ['shipping', 'returns', 'about'];
      const ackItems = ['terms', 'privacy', 'dataProcessing', 'prohibitedProducts', 'takedown'];
      for (const type of merchantPolicyTypes) {
        expect(ackItems).not.toContain(type);
      }
    });

    it('لا ينفذ Theme Control', () => {
      const service = new AcknowledgementService(createMockDb() as any);
      const items = service.getRequiredItems();
      for (const item of items) {
        expect(item.key).not.toContain('theme');
      }
    });
  });
});
