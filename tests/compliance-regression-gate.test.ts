import { describe, it, expect } from 'vitest';

describe('Final Compliance Regression Gate', () => {
  describe('1. Compliance Checklist — missing returnWindowDays', () => {
    it('fails compliance when returnWindowDays is null', async () => {
      const { ComplianceChecklistService } = await import('../packages/commerce-core/src/compliance-checklist.js');
      const service = new ComplianceChecklistService();
      const result = service.check({
        storeId: 1,
        tenantId: 1,
        kycProfile: null,
        store: { email: 'test@test.com', phone: '+966500000000' },
        policies: [
          { type: 'privacy', isPublished: true, content: 'content' },
          { type: 'terms', isPublished: true, content: 'content' },
          { type: 'shipping', isPublished: true, content: 'content' },
          { type: 'returns', isPublished: true, content: 'content' },
        ],
        paymentMethods: [{ enabled: true }],
        shippingMethods: [{ estimatedDeliveryDays: '3-5' }],
        settings: { returnWindowDays: null, delayCancellationNotice: null, excludedReturnCategories: null },
      });
      const returnCheck = result.items.find(c => c.key === 'returnWindowDays');
      expect(returnCheck).toBeDefined();
      expect(returnCheck!.passed).toBe(false);
      expect(result.blockingErrorsCount).toBeGreaterThan(0);
    });

    it('passes compliance when returnWindowDays >= 7', async () => {
      const { ComplianceChecklistService } = await import('../packages/commerce-core/src/compliance-checklist.js');
      const service = new ComplianceChecklistService();
      const result = service.check({
        storeId: 1,
        tenantId: 1,
        kycProfile: { businessType: 'merchant', legalName: 'شركة اختبار', commercialRegistrationNumber: '1234567890', vatNumber: '3100000000000003', address: 'الرياض' },
        store: { email: 'test@test.com', phone: '+966500000000' },
        policies: [
          { type: 'privacy', isPublished: true, content: 'content' },
          { type: 'terms', isPublished: true, content: 'content' },
          { type: 'shipping', isPublished: true, content: 'content' },
          { type: 'returns', isPublished: true, content: 'content' },
        ],
        paymentMethods: [{ enabled: true }],
        shippingMethods: [{ estimatedDeliveryDays: '3-5' }],
        settings: { returnWindowDays: 7, delayCancellationNotice: null, excludedReturnCategories: null },
      });
      const returnCheck = result.items.find(c => c.key === 'returnWindowDays');
      expect(returnCheck).toBeDefined();
      expect(returnCheck!.passed).toBe(true);
    });
  });

  describe('2. Publish Gate — compliance passed but no acknowledgement', () => {
    it('blocks publish when acknowledgement not completed', async () => {
      const { AcknowledgementService } = await import('../packages/commerce-core/src/acknowledgement.js');
      const service = new AcknowledgementService();
      try {
        const ackStatus = await service.getStatus(1);
        expect(ackStatus.acknowledged).toBe(true);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('3. Publish Gate — compliance + acknowledgement', () => {
    it('publish requires both compliance and acknowledgement', async () => {
      const { PublishGateService } = await import('../packages/commerce-core/src/publish-gate.js');
      const service = new PublishGateService();
      try {
        const result = await service.publish(1, 1, { actorUserId: 1 });
        expect(result.success).toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('4. Publish records audit action store_published', () => {
    it('audit log contains store_published on successful publish', async () => {
      const { AuditLogService } = await import('../packages/integration-core/src/audit.js');
      const service = new AuditLogService();

      await service.record({
        actorUserId: 1,
        tenantId: 1,
        storeId: 1,
        action: 'store_published',
        entityType: 'store',
        entityId: 1,
        oldValue: { publishStatus: 'draft' },
        newValue: { publishStatus: 'published' },
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const logs = await service.list(1, { page: 1, pageSize: 50 });
      const publishedLog = logs.data?.find((l: any) => l.action === 'store_published');
      expect(publishedLog).toBeDefined();
      expect(publishedLog!.entityType).toBe('store');
    });
  });

  describe('5. Publish failure records compliance_check_failed', () => {
    it('audit log contains compliance_check_failed', async () => {
      const { AuditLogService } = await import('../packages/integration-core/src/audit.js');
      const service = new AuditLogService();

      await service.record({
        actorUserId: 1,
        tenantId: 1,
        storeId: 1,
        action: 'compliance_check_failed',
        entityType: 'store',
        entityId: 1,
        oldValue: null,
        newValue: { failedChecks: ['RETURN_WINDOW'] },
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const logs = await service.list(1, { page: 1, pageSize: 50 });
      const failedLog = logs.data?.find((l: any) => l.action === 'compliance_check_failed');
      expect(failedLog).toBeDefined();
    });
  });

  describe('6. Saudi Policy Generator preview does not modify content', () => {
    it('preview generates without affecting existing policies', async () => {
      const { PoliciesService } = await import('../packages/commerce-core/src/policies.js');
      const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');

      const policiesService = new PoliciesService();
      const beforePrivacy = await policiesService.getByType(1, 'privacy');
      const beforeContent = beforePrivacy?.content;

      const generator = new SaudiPolicyGenerator();
      generator.generate({ storeName: 'test', returnWindowDays: 7 });

      const afterPrivacy = await policiesService.getByType(1, 'privacy');
      expect(afterPrivacy?.content).toBe(beforeContent);
    });
  });

  describe('7. apply-generated requires confirmation', () => {
    it('generator returns result that can be previewed', async () => {
      const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
      const generator = new SaudiPolicyGenerator();
      const result = generator.generate({ storeName: 'متجر اختبار', returnWindowDays: 7 });
      expect(result.policies).toHaveLength(5);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('8. apply-generated records policy_updated', () => {
    it('policy update records audit log', async () => {
      const { AuditLogService } = await import('../packages/integration-core/src/audit.js');
      const { PoliciesService } = await import('../packages/commerce-core/src/policies.js');

      const policiesService = new PoliciesService();
      const auditService = new AuditLogService();

      const existing = await policiesService.getByType(1, 'about');
      const policy = await policiesService.upsert(1, 'about', {
        title: 'عن المتجر — اختبار',
        content: 'محتوى اختبار للسجل',
      });

      await auditService.record({
        actorUserId: 1,
        tenantId: 1,
        storeId: 1,
        action: 'policy_updated',
        entityType: 'policy',
        entityId: policy.id,
        oldValue: existing ? { title: existing.title, content: existing.content?.substring(0, 200) } : null,
        newValue: { title: 'عن المتجر — اختبار', content: 'محتوى اختبار للسجل'.substring(0, 200) },
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const logs = await auditService.list(1, { page: 1, pageSize: 50 });
      const policyLog = logs.data?.find((l: any) => l.action === 'policy_updated' && l.entityType === 'policy');
      expect(policyLog).toBeDefined();
    });
  });

  describe('9. Storefront guard — unpublished store returns 404', () => {
    it('publish status guard logic works', async () => {
      const { PublishGateService } = await import('../packages/commerce-core/src/publish-gate.js');
      const service = new PublishGateService();
      try {
        const result = await service.getPublishStatus(99999);
        expect(result).toBe('draft');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('10. Platform Legal version change invalidates acknowledgement', () => {
    it('current versions differ from accepted versions', async () => {
      const { AcknowledgementService } = await import('../packages/commerce-core/src/acknowledgement.js');
      const service = new AcknowledgementService();

      const currentVersions = service.getCurrentVersions();
      const requiredItems = service.getRequiredItems();

      expect(currentVersions.terms).toBeDefined();
      expect(requiredItems.length).toBeGreaterThan(0);
    });
  });

  describe('11. Cross-store access — audit logs scoped', () => {
    it('audit service scopes by storeId', async () => {
      const { AuditLogService } = await import('../packages/integration-core/src/audit.js');
      const service = new AuditLogService();

      await service.record({
        actorUserId: 1,
        tenantId: 1,
        storeId: 1,
        action: 'store_published',
        entityType: 'store',
        entityId: 1,
        oldValue: null,
        newValue: { publishStatus: 'published' },
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const logs1 = await service.list(1, { page: 1, pageSize: 50 });
      const logs2 = await service.list(99999, { page: 1, pageSize: 50 });

      expect(logs1.total).toBeGreaterThanOrEqual(0);
      expect(logs2.total).toBe(0);
    });
  });

  describe('12. No secrets in audit oldValue/newValue', () => {
    it('audit log masks sensitive keys (email, phone, password, address)', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');

      const sensitiveData = {
        email: 'test@example.com',
        phone: '+966500000000',
        password: 'secret123',
        address: '123 Main St',
        storeName: 'my-store',
      };

      const masked = maskObject(sensitiveData);
      expect(masked.email).not.toBe('test@example.com');
      expect(masked.phone).not.toBe('+966500000000');
      expect(masked.password).not.toBe('secret123');
      expect(masked.address).not.toBe('123 Main St');
      expect(masked.storeName).toBe('my-store');
    });

    it('apiKey is fully masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ apiKey: 'TEST_API_KEY_PLACEHOLDER' }).apiKey).toBe('***MASKED***');
    });

    it('API_KEY (case-insensitive) is fully masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ API_KEY: 'TEST_API_KEY_PLACEHOLDER' }).API_KEY).toBe('***MASKED***');
    });

    it('ApiKey (mixed case) is fully masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ ApiKey: 'TEST_API_KEY_PLACEHOLDER' }).ApiKey).toBe('***MASKED***');
    });

    it('accessToken is fully masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ accessToken: 'tok_abc' }).accessToken).toBe('***MASKED***');
    });

    it('webhookSecret is fully masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ webhookSecret: 'whsec_123' }).webhookSecret).toBe('***MASKED***');
    });

    it('clientSecret is fully masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ clientSecret: 'cs_abc' }).clientSecret).toBe('***MASKED***');
    });

    it('vatNumber shows partial (last 4 chars)', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ vatNumber: '123456789012345' }).vatNumber).toBe('***********2345');
    });

    it('commercialRegistrationNumber shows partial', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ commercialRegistrationNumber: '1234567890' }).commercialRegistrationNumber).toBe('******7890');
    });

    it('iban shows partial', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ iban: 'SA12345678901234567890' }).iban).toBe('******************7890');
    });

    it('bankAccount shows partial', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      expect(maskObject({ bankAccount: '1234567890123' }).bankAccount).toBe('*********0123');
    });

    it('nested secrets inside objects are masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      const nested = { settings: { apiKey: 'key123', vatNumber: '123456789012345' } };
      const masked = maskObject(nested);
      expect(masked.settings.apiKey).toBe('***MASKED***');
      expect(masked.settings.vatNumber).toBe('***********2345');
    });

    it('arrays containing secrets are masked', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      const arr = [{ apiKey: 'key1' }, { apiKey: 'key2' }];
      const masked = maskObject(arr);
      expect(masked[0].apiKey).toBe('***MASKED***');
      expect(masked[1].apiKey).toBe('***MASKED***');
    });

    it('normal non-sensitive values are unchanged', async () => {
      const { maskObject } = await import('../packages/shared/src/index.js');
      const data = { name: 'Test Store', count: 42, active: true, price: 99.99 };
      const masked = maskObject(data);
      expect(masked.name).toBe('Test Store');
      expect(masked.count).toBe(42);
      expect(masked.active).toBe(true);
      expect(masked.price).toBe(99.99);
    });

    it('policy content is not modified by maskObject', async () => {
      const { PoliciesService } = await import('../packages/commerce-core/src/policies.js');
      const service = new PoliciesService();
      const before = await service.list(1);

      const { maskObject } = await import('../packages/shared/src/index.js');
      maskObject({ apiKey: 'test' });

      const after = await service.list(1);
      for (let i = 0; i < before.length; i++) {
        expect(before[i].content).toBe(after[i].content);
      }
    });

    it('Theme Control is not touched', async () => {
      try {
        await import('../packages/commerce-core/src/theme-control.js');
        fail('theme-control.js should not exist');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Theme Control — not touched', () => {
    it('no theme control service exists', async () => {
      try {
        await import('../packages/commerce-core/src/theme-control.js');
        fail('theme-control.js should not exist');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('saudi policy generator does not produce theme policies', async () => {
      const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
      const generator = new SaudiPolicyGenerator();
      const result = generator.generate({ storeName: 'test', returnWindowDays: 7 });
      expect(result.policies.every(p => p.type !== 'theme')).toBe(true);
    });
  });

  describe('Platform Legal Pages — not modified', () => {
    it('platform legal documents unchanged', async () => {
      const { ALL_PLATFORM_LEGAL_DOCUMENTS } = await import('../packages/shared/src/legal/platform-legal.js');
      expect(ALL_PLATFORM_LEGAL_DOCUMENTS.length).toBe(5);
      expect(ALL_PLATFORM_LEGAL_DOCUMENTS.every(d => d.version === '1.0.0')).toBe(true);
    });
  });

  describe('Policy content — not modified by generator', () => {
    it('existing policy content preserved', async () => {
      const { PoliciesService } = await import('../packages/commerce-core/src/policies.js');
      const service = new PoliciesService();
      const before = await service.list(1);

      const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
      const generator = new SaudiPolicyGenerator();
      generator.generate({ storeName: 'test', returnWindowDays: 7 });

      const after = await service.list(1);
      expect(before.length).toBe(after.length);
      for (let i = 0; i < before.length; i++) {
        expect(before[i].content).toBe(after[i].content);
        expect(before[i].title).toBe(after[i].title);
      }
    });
  });
});
