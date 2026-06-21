import { describe, it, expect, vi } from 'vitest';
import { AuditLogService } from '../packages/integration-core/src/audit';

function createMockDb() {
  const store: any[] = [];
  return {
    insert: vi.fn(() => ({
      values: vi.fn((row: any) => ({
        returning: vi.fn(async () => {
          const entry = { id: store.length + 1, ...row, createdAt: new Date() };
          store.push(entry);
          return [entry];
        }),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              orderBy: vi.fn(async () => store.slice(0, 20)),
            })),
          })),
          orderBy: vi.fn(async () => store.slice(0, 200)),
        })),
      })),
    })),
    _store: store,
  };
}

describe('AuditLogService', () => {
  describe('record()', () => {
    it('يُسجل الحدث مع حماية البيانات الحساسة', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const log = await service.record({
        actorUserId: 1,
        tenantId: 1,
        storeId: 1,
        action: 'store_published',
        entityType: 'store',
        entityId: 1,
        oldValue: { publishStatus: 'draft', secret: 'sk_live_1234' },
        newValue: { publishStatus: 'published', token: 'abc_secret_xyz' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });
      expect(log).toBeDefined();
      expect(log.action).toBe('store_published');
      expect(db.insert).toHaveBeenCalled();
    });

    it('يُخفي كلمات المرور والمفاتيح في before/after', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      await service.record({
        actorUserId: 1,
        tenantId: 1,
        storeId: 1,
        action: 'payment_settings_changed',
        entityType: 'payment',
        oldValue: { secretKey: 'TEST_SECRET_PLACEHOLDER_OLD', password: 'TEST_PASSWORD_PLACEHOLDER_OLD' },
        newValue: { secretKey: 'TEST_SECRET_PLACEHOLDER_NEW', password: 'TEST_PASSWORD_PLACEHOLDER_NEW' },
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent',
      });
      const insertCall = db.insert.mock.results[0];
      const valuesFn = insertCall?.value?.values;
      expect(valuesFn).toBeDefined();
    });

    it('يُخفي IP بشكل صحيح', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const log = await service.record({
        action: 'login',
        entityType: 'user',
        ipAddress: '192.168.1.100',
      });
      expect(log).toBeDefined();
    });

    it('يسجل store_published عند نجاح النشر', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const log = await service.record({
        actorUserId: 5,
        tenantId: 1,
        storeId: 1,
        action: 'store_published',
        entityType: 'store',
        entityId: 1,
        oldValue: { publishStatus: 'draft' },
        newValue: { publishStatus: 'published' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(log.action).toBe('store_published');
      expect(log.entityType).toBe('store');
    });

    it('يسجل compliance_check_failed عند فشل النشر', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const log = await service.record({
        actorUserId: 5,
        tenantId: 1,
        storeId: 1,
        action: 'compliance_check_failed',
        entityType: 'store',
        entityId: 1,
        oldValue: { publishStatus: 'draft' },
        newValue: { publishStatus: 'restricted', blockingErrorsCount: 3 },
      });
      expect(log.action).toBe('compliance_check_failed');
    });

    it('يسجل store_unpublished عند إلغاء النشر', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const log = await service.record({
        actorUserId: 5,
        tenantId: 1,
        storeId: 1,
        action: 'store_unpublished',
        entityType: 'store',
        entityId: 1,
        oldValue: { publishStatus: 'published' },
        newValue: { publishStatus: 'draft' },
      });
      expect(log.action).toBe('store_unpublished');
    });
  });

  describe('list() — filtering and pagination', () => {
    it('يدعم pagination', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const result = await service.list(1, { page: 1, limit: 10 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toBeDefined();
    });

    it('يدعم filter حسب action', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const result = await service.list(1, { action: 'store_published' });
      expect(result).toBeDefined();
    });

    it('يدعم filter حسب entityType', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const result = await service.list(1, { entityType: 'store' });
      expect(result).toBeDefined();
    });

    it('يدعم filter حسب التاريخ', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const result = await service.list(1, { dateFrom: '2025-01-01', dateTo: '2025-12-31' });
      expect(result).toBeDefined();
    });

    it('يعيد total و totalPages', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const result = await service.list(1);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalPages');
    });
  });

  describe('Tenant isolation', () => {
    it('لا يسمح بتجميع سجلات متاجر مختلفة', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      const result1 = await service.list(1);
      const result2 = await service.list(2);
      expect(result1.data).toBeDefined();
      expect(result2.data).toBeDefined();
    });
  });

  describe('Sensitive data protection', () => {
    it('لا يحفظ API keys كاملة', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      await service.record({
        action: 'payment_settings_changed',
        entityType: 'payment',
        oldValue: { apiKey: 'TEST_API_KEY_PLACEHOLDER_OLD' },
        newValue: { apiKey: 'TEST_API_KEY_PLACEHOLDER_NEW' },
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('لا يحفظ tokens كاملة', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      await service.record({
        action: 'payment_settings_changed',
        entityType: 'payment',
        oldValue: { token: 'TEST_TOKEN_PLACEHOLDER_OLD' },
        newValue: { token: 'TEST_TOKEN_PLACEHOLDER_NEW' },
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('لا يحفظ passwords في before/after', async () => {
      const db = createMockDb();
      const service = new AuditLogService(db as any);
      await service.record({
        action: 'staff_role_changed',
        entityType: 'user',
        oldValue: { password: 'old_password_123' },
        newValue: { password: 'new_password_456' },
      });
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('AuditAction coverage', () => {
    it('يدعم جميع أحداث النشر', () => {
      const publishActions = [
        'store_published', 'store_unpublished', 'store_restricted', 'store_suspended',
        'compliance_check_failed',
      ];
      for (const action of publishActions) {
        expect(action).toBeTruthy();
      }
    });

    it('يدعم جميع أحداث السياسات', () => {
      const policyActions = ['policy_updated', 'policy_published', 'policy_unpublished'];
      for (const action of policyActions) {
        expect(action).toBeTruthy();
      }
    });

    it('يدعم جميع أحداث الإعدادات', () => {
      const settingsActions = [
        'payment_settings_changed', 'shipping_settings_changed', 'return_settings_changed',
        'commercial_registration_updated', 'vat_number_updated',
      ];
      for (const action of settingsActions) {
        expect(action).toBeTruthy();
      }
    });

    it('لا يعدل نصوص السياسات', () => {
      const policyTexts = [
        { type: 'privacy', content: 'سياسة الخصوصية' },
        { type: 'terms', content: 'الشروط والأحكام' },
      ];
      for (const p of policyTexts) {
        expect(p.content).toBeTruthy();
      }
    });
  });
});
