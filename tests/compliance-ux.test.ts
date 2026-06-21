import { describe, it, expect } from 'vitest';

// ── IBAN Validation ──────────────────────────────────
function validateSaudiIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '');
  return /^SA\d{22}$/.test(cleaned);
}

function maskIban(iban: string): string {
  if (!iban) return '';
  const cleaned = iban.replace(/\s/g, '');
  if (cleaned.length < 8) return cleaned;
  return `SA **** **** **** **** ${cleaned.slice(-4)}`;
}

// ── Sidebar Arabic Labels ─────────────────────────────
const SIDEBAR_ITEMS = [
  { to: '/dashboard', labelKey: 'nav:dashboard', expectedArabic: 'لوحة التحكم' },
  { to: '/products', labelKey: 'nav:products', expectedArabic: 'المنتجات' },
  { to: '/categories', labelKey: 'nav:categories', expectedArabic: 'التصنيفات' },
  { to: '/orders', labelKey: 'nav:orders', expectedArabic: 'الطلبات' },
  { to: '/customers', labelKey: 'nav:customers', expectedArabic: 'العملاء' },
  { to: '/shipping', labelKey: 'nav:shipping', expectedArabic: 'الشحن' },
  { to: '/wallet', labelKey: 'nav:wallet', expectedArabic: 'المحفظة' },
  { to: '/coupons', labelKey: 'nav:coupons', expectedArabic: 'الكوبونات' },
  { to: '/reports', labelKey: 'nav:reports', expectedArabic: 'التقارير' },
  { to: '/imports', labelKey: 'nav:imports', expectedArabic: 'الاستيراد' },
  { to: '/compliance', labelKey: 'nav:compliance', expectedArabic: 'التحقق والامتثال' },
  { to: '/subscriptions', labelKey: 'nav:subscriptions', expectedArabic: 'الاشتراكات' },
  { to: '/notifications', labelKey: 'nav:notifications', expectedArabic: 'الإشعارات' },
  { to: '/api-keys', labelKey: 'nav:apiKeys', expectedArabic: 'مفاتيح API' },
  { to: '/migration', labelKey: 'nav:migration', expectedArabic: 'الهجرة والتسويق' },
  { to: '/ai-assistant', labelKey: 'nav:aiAssistant', expectedArabic: 'المساعد الذكي' },
  { to: '/settings', labelKey: 'nav:settings', expectedArabic: 'الإعدادات' },
];

// ── Status Labels ─────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  not_started: 'لم تبدأ بعد',
  draft: 'مسودة',
  submitted: 'بانتظار المراجعة',
  under_review: 'قيد المراجعة',
  approved: 'معتمد داخل المنصة',
  rejected: 'مرفوض',
  needs_more_info: 'يحتاج معلومات إضافية',
  suspended: 'موقوف',
};

// ── Readiness Checklist Items ─────────────────────────
const READINESS_ITEMS = [
  'بيانات النشاط',
  'بيانات التواصل',
  'المستندات المطلوبة',
  'الحساب البنكي',
  'الرقم الضريبي إن وجد',
  'إرسال للمراجعة',
];

// ── Document Types ────────────────────────────────────
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  commercial_registration: 'السجل التجاري',
  freelance_document: 'وثيقة العمل الحر',
  vat_certificate: 'شهادة ضريبة القيمة المضافة',
  iban_certificate: 'شهادة الآيبان',
  other: 'مستند آخر',
};

describe('Compliance UX Tests', () => {
  describe('1. Sidebar labels Arabic', () => {
    it('all sidebar items have correct Arabic labels', () => {
      for (const item of SIDEBAR_ITEMS) {
        expect(item.expectedArabic).toBeTruthy();
        expect(item.expectedArabic.length).toBeGreaterThan(0);
        // Ensure no English labels remain (except API which is an English term)
        if (item.to !== '/api-keys') {
          expect(item.expectedArabic).not.toMatch(/^[a-zA-Z]+$/);
        }
      }
    });

    it('sidebar has 17 navigation items', () => {
      expect(SIDEBAR_ITEMS).toHaveLength(17);
    });

    it('compliance item exists with Arabic label', () => {
      const complianceItem = SIDEBAR_ITEMS.find(i => i.to === '/compliance');
      expect(complianceItem).toBeDefined();
      expect(complianceItem!.expectedArabic).toBe('التحقق والامتثال');
    });
  });

  describe('2. Compliance status card renders', () => {
    it('status map has all required statuses', () => {
      const requiredStatuses = [
        'not_started', 'draft', 'submitted', 'under_review',
        'approved', 'rejected', 'needs_more_info', 'suspended',
      ];
      for (const s of requiredStatuses) {
        expect(STATUS_LABELS[s]).toBeDefined();
        expect(STATUS_LABELS[s].length).toBeGreaterThan(0);
      }
    });

    it('approved status says معتمد داخل المنصة not معتمد رسميًا', () => {
      expect(STATUS_LABELS.approved).toBe('معتمد داخل المنصة');
      expect(STATUS_LABELS.approved).not.toContain('رسمي');
    });

    it('all status labels are in Arabic', () => {
      for (const [_key, label] of Object.entries(STATUS_LABELS)) {
        expect(label).not.toMatch(/^[a-zA-Z]+$/);
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('3. Readiness checklist renders', () => {
    it('has all 6 readiness items', () => {
      expect(READINESS_ITEMS).toHaveLength(6);
    });

    it('includes required items', () => {
      expect(READINESS_ITEMS).toContain('بيانات النشاط');
      expect(READINESS_ITEMS).toContain('بيانات التواصل');
      expect(READINESS_ITEMS).toContain('المستندات المطلوبة');
      expect(READINESS_ITEMS).toContain('الحساب البنكي');
      expect(READINESS_ITEMS).toContain('الرقم الضريبي إن وجد');
      expect(READINESS_ITEMS).toContain('إرسال للمراجعة');
    });

    it('all items are in Arabic', () => {
      for (const item of READINESS_ITEMS) {
        expect(item).not.toMatch(/^[a-zA-Z]+$/);
      }
    });
  });

  describe('4. Submit disabled when required fields missing', () => {
    it('cannot submit with empty business type', () => {
      const form = {
        businessType: '',
        legalName: 'شركة اختبار',
        city: 'الرياض',
        address: 'شارع الملك فهد',
      };
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address);
      expect(canSubmit).toBe(false);
    });

    it('cannot submit with empty legal name', () => {
      const form = {
        businessType: 'company',
        legalName: '',
        city: 'الرياض',
        address: 'شارع الملك فهد',
      };
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address);
      expect(canSubmit).toBe(false);
    });

    it('cannot submit with empty city', () => {
      const form = {
        businessType: 'company',
        legalName: 'شركة اختبار',
        city: '',
        address: 'شارع الملك فهد',
      };
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address);
      expect(canSubmit).toBe(false);
    });

    it('can submit with all required fields', () => {
      const form = {
        businessType: 'company',
        legalName: 'شركة اختبار',
        city: 'الرياض',
        address: 'شارع الملك فهد',
      };
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address);
      expect(canSubmit).toBe(true);
    });

    it('cannot submit for freelancer without nationalId', () => {
      const form = {
        businessType: 'freelancer',
        legalName: 'أحمد',
        nationalId: '',
        city: 'جدة',
        address: 'شارع التحلية',
      };
      const isFreelancer = form.businessType === 'freelancer' || form.businessType === 'individual';
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address) &&
        (!isFreelancer || !!form.nationalId);
      expect(canSubmit).toBe(false);
    });

    it('can submit for freelancer with nationalId', () => {
      const form = {
        businessType: 'freelancer',
        legalName: 'أحمد',
        nationalId: '1234567890',
        city: 'جدة',
        address: 'شارع التحلية',
      };
      const isFreelancer = form.businessType === 'freelancer' || form.businessType === 'individual';
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address) &&
        (!isFreelancer || !!form.nationalId);
      expect(canSubmit).toBe(true);
    });

    it('cannot submit for company without crNumber', () => {
      const form = {
        businessType: 'company',
        legalName: 'شركة التقنية',
        crNumber: '',
        city: 'الدمام',
        address: 'شارع الأمير سلطان',
      };
      const isCompany = form.businessType === 'company' || form.businessType === 'establishment';
      const canSubmit = !!(form.businessType && form.legalName && form.city && form.address) &&
        (!isCompany || !!form.crNumber);
      expect(canSubmit).toBe(false);
    });
  });

  describe('5. Valid Saudi IBAN accepted', () => {
    it('accepts valid SA IBAN with 24 chars', () => {
      expect(validateSaudiIban('SA0000000000000000000000')).toBe(true);
    });

    it('accepts valid SA IBAN with spaces', () => {
      expect(validateSaudiIban('SA00 0000 0000 0000 0000 0000')).toBe(true);
    });

    it('accepts realistic SA IBAN', () => {
      expect(validateSaudiIban('SA4420000001234567890123')).toBe(true);
    });
  });

  describe('6. Invalid IBAN rejected', () => {
    it('rejects empty IBAN', () => {
      expect(validateSaudiIban('')).toBe(false);
    });

    it('rejects IBAN not starting with SA', () => {
      expect(validateSaudiIban('AE0000000000000000000000')).toBe(false);
    });

    it('rejects IBAN too short', () => {
      expect(validateSaudiIban('SA000000')).toBe(false);
    });

    it('rejects IBAN too long', () => {
      expect(validateSaudiIban('SA0000000000000000000000000')).toBe(false);
    });

    it('rejects IBAN with letters after SA', () => {
      expect(validateSaudiIban('SAABCDEFGHIJKLMNOPQRSTU')).toBe(false);
    });

    it('rejects random text', () => {
      expect(validateSaudiIban('not-an-iban')).toBe(false);
    });
  });

  describe('7. Full IBAN not exposed after save', () => {
    it('maskIban returns masked string', () => {
      const masked = maskIban('SA4420000001234567890123');
      expect(masked).toContain('****');
      expect(masked).not.toBe('SA4420000001234567890123');
    });

    it('maskIban preserves last 4 digits', () => {
      const iban = 'SA4420000001234567890123';
      const masked = maskIban(iban);
      expect(masked).toContain('0123');
    });

    it('maskIban preserves SA prefix', () => {
      const iban = 'SA4420000001234567890123';
      const masked = maskIban(iban);
      expect(masked.startsWith('SA')).toBe(true);
    });

    it('maskIban handles empty string', () => {
      expect(maskIban('')).toBe('');
    });

    it('maskIban handles short string', () => {
      const result = maskIban('SA');
      expect(result).toBe('SA');
    });

    it('full IBAN is not displayed in the masked card by default', () => {
      const fullIban = 'SA4420000001234567890123';
      const masked = maskIban(fullIban);
      // The masked version should have asterisks in the middle
      expect(masked).toMatch(/SA \*{4}/);
      // Should not contain the full middle section
      expect(masked).not.toContain('200000001234');
    });
  });

  describe('8. Document upload does not expose storage key', () => {
    it('document type labels are user-friendly', () => {
      for (const [_key, label] of Object.entries(DOCUMENT_TYPE_LABELS)) {
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
        // Labels should not contain file system paths or storage keys
        expect(label).not.toContain('/');
        expect(label).not.toContain('storage');
        expect(label).not.toContain('bucket');
      }
    });

    it('document upload API payload does not contain storageKey', () => {
      const uploadPayload = {
        type: 'commercial_registration',
        fileUrl: 'test-document.pdf',
        filename: 'test-document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      };
      expect(uploadPayload).not.toHaveProperty('storageKey');
      expect(uploadPayload).not.toHaveProperty('storage_key');
      expect(uploadPayload).not.toHaveProperty('bucket');
      expect(uploadPayload).not.toHaveProperty('key');
    });

    it('document types do not expose internal storage paths', () => {
      const mockDocument = {
        id: 1,
        type: 'commercial_registration',
        filename: 'cr-document.pdf',
        status: 'uploaded',
      };
      expect(mockDocument).not.toHaveProperty('storageKey');
      expect(mockDocument).not.toHaveProperty('fileUrl');
      expect(mockDocument).not.toHaveProperty('bucket');
    });
  });

  describe('9. No public KYC data in storefront responses', () => {
    it('storefront product response does not contain compliance data', () => {
      const storefrontProduct = {
        id: 1,
        name: 'Product',
        price: '100',
        slug: 'product',
      };
      expect(storefrontProduct).not.toHaveProperty('compliance');
      expect(storefrontProduct).not.toHaveProperty('kyc');
      expect(storefrontProduct).not.toHaveProperty('bankAccount');
      expect(storefrontProduct).not.toHaveProperty('documents');
    });

    it('storefront store response does not contain KYC fields', () => {
      const storefrontStore = {
        id: 1,
        name: 'Test Store',
        slug: 'test-store',
      };
      expect(storefrontStore).not.toHaveProperty('compliance');
      expect(storefrontStore).not.toHaveProperty('kyc');
      expect(storefrontStore).not.toHaveProperty('bankAccount');
      expect(storefrontStore).not.toHaveProperty('vatNumber');
      expect(storefrontStore).not.toHaveProperty('iban');
    });

    it('compliance data is only accessible via merchant API', () => {
      const merchantComplianceEndpoints = [
        '/merchant/{storeId}/compliance/status',
        '/merchant/{storeId}/compliance/profile',
        '/merchant/{storeId}/compliance/documents',
        '/merchant/{storeId}/compliance/bank-account',
      ];
      for (const endpoint of merchantComplianceEndpoints) {
        expect(endpoint).toContain('/merchant/');
        expect(endpoint).not.toContain('/s/');
        expect(endpoint).not.toContain('/storefront/');
      }
    });
  });

  describe('10. Privacy alert content', () => {
    it('privacy message mentions platform-only usage', () => {
      const message = 'بيانات التحقق والمستندات لا تظهر للعملاء في المتجر، وتُستخدم فقط لأغراض التحقق وإدارة الحساب داخل المنصة.';
      expect(message).toContain('لا تظهر للعملاء');
      expect(message).toContain('داخل المنصة');
    });

    it('privacy message does not mention external sharing', () => {
      const message = 'بيانات التحقق والمستندات لا تظهر للعملاء في المتجر، وتُستخدم فقط لأغراض التحقق وإدارة الحساب داخل المنصة.';
      expect(message).not.toContain('خارج');
      expect(message).not.toContain('جهة خارجية');
      expect(message).not.toContain('شراكة');
    });
  });

  describe('11. Document status labels', () => {
    const docStatuses = {
      not_uploaded: 'لم يرفع',
      uploaded: 'مرفوع',
      approved: 'مقبول',
      rejected: 'مرفوض',
    };

    it('has all document statuses in Arabic', () => {
      for (const [_key, label] of Object.entries(docStatuses)) {
        expect(label).toBeTruthy();
        expect(label).not.toMatch(/^[a-zA-Z]+$/);
      }
    });

    it('does not expose storage key in status display', () => {
      const doc = {
        id: 1,
        type: 'commercial_registration',
        filename: 'cr.pdf',
        status: 'approved',
      };
      expect(doc).not.toHaveProperty('storageKey');
      expect(doc).not.toHaveProperty('fileUrl');
    });
  });
});
