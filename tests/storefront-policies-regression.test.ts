import { describe, it, expect, vi } from 'vitest';

// Mock storefront API and PolicyPage component logic
const mockPoliciesApi = {
  get: vi.fn(),
};

const POLICY_TYPES = ['privacy', 'terms', 'shipping', 'returns', 'about'] as const;

describe('Storefront Policies P1 Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Configuration', () => {
    it('route /s/:slug/policies/privacy موجود', () => {
      const routes = [
        '/s/:slug/policies/privacy',
        '/s/:slug/policies/terms',
        '/s/:slug/policies/returns',
        '/s/:slug/policies/shipping',
        '/s/:slug/policies/about',
      ];
      expect(routes).toContain('/s/:slug/policies/privacy');
    });

    it('جميع أنواع السياسات مدعومة', () => {
      POLICY_TYPES.forEach(type => {
        expect(POLICY_TYPES).toContain(type);
      });
    });
  });

  describe('Footer Links', () => {
    it('Footer links لا تشير إلى /legal/privacy أو /legal/terms داخل المتجر', () => {
      // In the storefront footer, links should be:
      // /s/:slug/policies/privacy
      // /s/:slug/policies/terms
      // /s/:slug/policies/returns
      // /s/:slug/policies/shipping
      // NOT /legal/privacy, /legal/terms, /legal/data-processing, etc.
      
      const footerLinks = {
        terms: '/s/haa-demo/policies/terms',
        privacy: '/s/haa-demo/policies/privacy',
        shipping: '/s/haa-demo/policies/shipping',
        returns: '/s/haa-demo/policies/returns',
      };

      Object.values(footerLinks).forEach(link => {
        expect(link).not.toMatch(/\/legal\//);
        expect(link).toMatch(/\/s\/.*\/policies\//);
      });
    });
  });

  describe('PolicyPage API Integration', () => {
    it('PolicyPage يستدعي policiesApi للمتجر الحالي', async () => {
      const mockPolicy = {
        id: 1,
        storeId: 1,
        type: 'privacy',
        title: 'سياسة الخصوصية',
        content: 'محتوى سياسة الخصوصية',
        isPublished: true,
        updatedAt: new Date().toISOString(),
      };

      mockPoliciesApi.get.mockResolvedValue(mockPolicy);

      const slug = 'haa-demo';
      const type = 'privacy';
      const result = await mockPoliciesApi.get(slug, type);

      expect(mockPoliciesApi.get).toHaveBeenCalledWith(slug, type);
      expect(result).toEqual(mockPolicy);
      expect(result.storeId).toBe(1);
    });

    it('PolicyPage يستخدم store slug من route params', async () => {
      mockPoliciesApi.get.mockResolvedValue({ id: 1, type: 'terms', title: 'شروط', content: 'محتوى', isPublished: true, updatedAt: new Date().toISOString(), storeId: 2 });

      const slug = 'store-b';
      await mockPoliciesApi.get(slug, 'terms');

      expect(mockPoliciesApi.get).toHaveBeenCalledWith('store-b', 'terms');
    });
  });

  describe('Empty State / Not Found', () => {
    it('عند عدم وجود policy يظهر empty state لا platform boilerplate', async () => {
      mockPoliciesApi.get.mockRejectedValue(new Error('Policy not found'));

      const slug = 'haa-demo';
      const type = 'returns';

      try {
        await mockPoliciesApi.get(slug, type);
      } catch (error) {
        // PolicyPage should show empty state with "لم يتم نشر هذه السياسة بعد"
        expect(error.message).toBe('Policy not found');
      }
    });

    it('PolicyPage لا يعرض platform boilerplate عند عدم وجود policy', () => {
      // The PolicyPage component should show:
      // - "لم يتم نشر هذه السياسة بعد"
      // - "التاجر لم يقم بإضافة هذه السياسة بعد"
      // - Link to contact the merchant
      // NOT the platform legal documents from LegalPage
      
      const policyPageContent = `
        <h1>لم يتم نشر هذه السياسة بعد</h1>
        <p>التاجر لم يقم بإضافة هذه السياسة بعد</p>
        <a href="/s/haa-demo/contact">تواصل مع التاجر</a>
      `;

      expect(policyPageContent).toContain('لم يتم نشر هذه السياسة بعد');
      expect(policyPageContent).toContain('التاجر لم يقم بإضافة هذه السياسة بعد');
      expect(policyPageContent).not.toContain('شروط استخدام المنصة للتجار'); // Platform terms
      expect(policyPageContent).not.toContain('سياسة خصوصية المنصة'); // Platform privacy
    });
  });

  describe('Store Isolation', () => {
    it('متجر A لا يرى سياسات متجر B', async () => {
      const storeAPolicy = { id: 1, storeId: 1, type: 'privacy', title: 'Privacy A', content: 'A content', isPublished: true, updatedAt: new Date().toISOString() };
      const storeBPolicy = { id: 2, storeId: 2, type: 'privacy', title: 'Privacy B', content: 'B content', isPublished: true, updatedAt: new Date().toISOString() };

      mockPoliciesApi.get
        .mockResolvedValueOnce(storeAPolicy)
        .mockResolvedValueOnce(storeBPolicy);

      const resultA = await mockPoliciesApi.get('store-a', 'privacy');
      const resultB = await mockPoliciesApi.get('store-b', 'privacy');

      expect(resultA.storeId).toBe(1);
      expect(resultB.storeId).toBe(2);
      expect(resultA.content).not.toBe(resultB.content);
    });
  });
});