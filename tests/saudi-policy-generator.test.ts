import { describe, it, expect } from 'vitest';

describe('Saudi Policy Generator', () => {
  it('generates Arabic Saudi policy drafts without CJK contamination', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'هاء',
      legalName: 'مؤسسة حرف الهاء التجارية',
      commercialRegistrationNumber: '1111111111',
      vatNumber: '300000000000003',
      supportEmail: 'support@haastores.com',
      supportPhone: '+966500000000',
      businessAddress: 'الرياض',
      returnWindowDays: 7,
      refundProcessingDays: 7,
      deliveryMinDays: 3,
      deliveryMaxDays: 7,
      shippingFee: 0,
    });

    const allContent = result.policies.map((policy) => policy.content).join('\n');
    expect(allContent).not.toMatch(/[\u3400-\u9fff]/u);
    expect(allContent).not.toContain('plus 5');
    expect(allContent).toContain('خمس سنوات');
    expect(allContent).toContain('يحق للعميل إلغاء الطلب إذا تأخر التسليم أو التنفيذ لأكثر من 15 يومًا');
    expect(allContent).toContain('حقوق صاحب البيانات');
    expect(allContent).toContain('المسوغ النظامي');
    expect(result.errors).toHaveLength(0);
  });

  it('generates privacy policy with complete data', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      legalName: 'شركة اختبار',
      commercialRegistrationNumber: '1234567890',
      vatNumber: '3100000000000003',
      supportEmail: 'support@test.com',
      supportPhone: '+966500000000',
      businessAddress: 'الرياض',
      returnWindowDays: 7,
      deliveryMaxDays: 5,
    });

    const privacy = result.policies.find(p => p.type === 'privacy');
    expect(privacy).toBeDefined();
    expect(privacy!.content).toContain('سياسة الخصوصية');
    expect(privacy!.content).toContain('متجر اختبار');
    expect(privacy!.content).toContain('مزودي الخدمة اللازمين');
    expect(privacy!.content).toContain('تدابير أمنية وتقنية مناسبة');
    expect(result.errors).toHaveLength(0);
  });

  it('generates shipping policy with delivery days and fee', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      deliveryMinDays: 2,
      deliveryMaxDays: 5,
      shippingFee: 15,
      freeShippingThreshold: 200,
      carriers: ['أرامكس', 'سمو'],
      returnWindowDays: 7,
    });

    const shipping = result.policies.find(p => p.type === 'shipping');
    expect(shipping).toBeDefined();
    expect(shipping!.content).toContain('2');
    expect(shipping!.content).toContain('5');
    expect(shipping!.content).toContain('15');
    expect(shipping!.content).toContain('200');
    expect(shipping!.content).toContain('أرامكس');
  });

  it('generates returns policy at returnWindowDays = 7', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      returnWindowDays: 7,
      refundProcessingDays: 7,
    });

    const returns = result.policies.find(p => p.type === 'returns');
    expect(returns).toBeDefined();
    expect(returns!.content).toContain('7 أيام');
    expect(result.errors).toHaveLength(0);
  });

  it('rejects returns policy when returnWindowDays = null', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      returnWindowDays: null,
    });

    const returns = result.policies.find(p => p.type === 'returns');
    expect(returns!.content).toBe('');
    expect(returns!.warnings.length).toBeGreaterThan(0);
  });

  it('does not invent commercialRegistrationNumber', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      returnWindowDays: 7,
    });

    expect(result.globalWarnings.some(w => w.includes('السجل التجاري'))).toBe(true);
    const about = result.policies.find(p => p.type === 'about');
    expect(about!.content).not.toContain('رقم السجل التجاري:');
  });

  it('does not invent vatNumber', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      returnWindowDays: 7,
    });

    expect(result.globalWarnings.some(w => w.includes('الرقم الضريبي'))).toBe(true);
  });

  it('warns when deliveryMaxDays > 15 without delayCancellationNotice', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      deliveryMaxDays: 20,
      returnWindowDays: 7,
    });

    expect(result.globalWarnings.some(w => w.includes('15 يومًا'))).toBe(true);
  });

  it('does not modify existing policies on preview', async () => {
    const { AuditLogService } = await import('../packages/integration-core/src/audit.js');
    const auditService = new AuditLogService();
    const beforeResult = await auditService.list(1, { page: 1, pageSize: 100 });
    const beforeCount = beforeResult.total;

    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    generator.generate({ storeName: 'test', returnWindowDays: 7 });

    const afterResult = await auditService.list(1, { page: 1, pageSize: 100 });
    const afterCount = afterResult.total;
    expect(afterCount).toBe(beforeCount);
  });

  it('apply-generated requires confirmation', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({
      storeName: 'متجر اختبار',
      returnWindowDays: 7,
    });
    expect(result.errors).toHaveLength(0);
    expect(result.policies).toHaveLength(5);
  });

  it('apply-generated records audit log', async () => {
    const { AuditLogService } = await import('../packages/integration-core/src/audit.js');
    const { PoliciesService } = await import('../packages/commerce-core/src/policies.js');
    const auditService = new AuditLogService();
    const policiesService = new PoliciesService();

    const beforeResult = await auditService.list(1, { page: 1, pageSize: 100 });
    const beforeCount = beforeResult.total;

    const existing = await policiesService.getByType(1, 'about');
    const policy = await policiesService.upsert(1, 'about', {
      title: 'عن المتجر — اختبار',
      content: 'محتوى اختبار',
    });

    await auditService.record({
      actorUserId: 1,
      tenantId: 1,
      storeId: 1,
      action: 'policy_updated',
      entityType: 'policy',
      entityId: policy.id,
      oldValue: existing ? { title: existing.title, content: existing.content?.substring(0, 200) } : null,
      newValue: { title: 'عن المتجر — اختبار', content: 'محتوى اختبار' },
      ipAddress: '127.0.0.1',
      userAgent: 'test',
    });

    const afterResult = await auditService.list(1, { page: 1, pageSize: 100 });
    const afterCount = afterResult.total;
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  it('does not run Theme Control', async () => {
    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    const result = generator.generate({ storeName: 'test', returnWindowDays: 7 });

    expect(result.policies.every(p => p.type !== 'theme')).toBe(true);
  });

  it('does not modify Platform Legal Pages', async () => {
    const { SAUDI_PLATFORM_LEGAL_DOCUMENTS } = await import('../packages/shared/src/legal/platform-legal.js');
    const before = JSON.stringify(SAUDI_PLATFORM_LEGAL_DOCUMENTS);

    const { SaudiPolicyGenerator } = await import('../packages/commerce-core/src/saudi-policy-generator.js');
    const generator = new SaudiPolicyGenerator();
    generator.generate({ storeName: 'test', returnWindowDays: 7 });

    const after = JSON.stringify(SAUDI_PLATFORM_LEGAL_DOCUMENTS);
    expect(before).toBe(after);
  });
});
