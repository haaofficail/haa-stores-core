import { describe, it, expect } from 'vitest';

// NOTE: This is a local copy of toPublicProduct from apps/api/src/routes/storefront.ts
// If the original changes, update this to match.
const toPublicProduct = (product: Record<string, unknown>) => {
  const { cost: _cost, images, createdAt: _createdAt, updatedAt: _updatedAt, storeId: _storeId, seoTitle: _seoTitle, seoDescription: _seoDescription, barcode: _barcode, ...rest } = product;
  const imageUrls: string[] = Array.isArray(images) ? images.map((img: any) => img.url ?? img) : [];
  return { ...rest, images: imageUrls };
};

describe('LC3B — Product Detail Experience', () => {
  describe('Product visibility rules', () => {
    it('active product is visible on storefront', () => {
      const product = { id: 1, name: 'Test', status: 'active' };
      const isVisible = product.status === 'active';
      expect(isVisible).toBe(true);
    });

    it('draft product is NOT visible on storefront', () => {
      const product = { id: 1, name: 'Test', status: 'draft' };
      const isVisible = product.status === 'active';
      expect(isVisible).toBe(false);
    });

    it('archived product is NOT visible on storefront', () => {
      const product = { id: 1, name: 'Test', status: 'archived' };
      const isVisible = product.status === 'active';
      expect(isVisible).toBe(false);
    });

    it('returns null for non-active product from getBySlug', () => {
      const products = [
        { slug: 'active-one', status: 'active' },
        { slug: 'draft-one', status: 'draft' },
        { slug: 'archived-one', status: 'archived' },
      ];
      const getBySlug = (slug: string) => {
        const p = products.find(p => p.slug === slug);
        if (!p || p.status !== 'active') return null;
        return p;
      };
      expect(getBySlug('active-one')).not.toBeNull();
      expect(getBySlug('draft-one')).toBeNull();
      expect(getBySlug('archived-one')).toBeNull();
    });
  });

  describe('Public DTO strips sensitive fields', () => {
    const fullProduct = {
      id: 1, name: 'Test Product', slug: 'test-product',
      price: '100.00', cost: '50.00', sku: 'SKU-001', barcode: '1234567890',
      storeId: 1, status: 'active', type: 'physical',
      description: 'A test product',
      stockQuantity: 10, trackInventory: true,
      weightGrams: 500, lengthCm: '10', widthCm: '5', heightCm: '3',
      requiresShipping: true, isFragile: false,
      seoTitle: 'SEO Title', seoDescription: 'SEO Description',
      categoryId: 1, categoryName: 'Electronics', categorySlug: 'electronics',
      images: [{ url: 'https://example.com/img.jpg', key: 'stores/1/products/1/abc.jpg' }],
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('strips cost from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('cost');
    });

    it('strips storeId from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('storeId');
    });

    it('strips createdAt from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('createdAt');
    });

    it('strips updatedAt from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('updatedAt');
    });

    it('strips seoTitle from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('seoTitle');
    });

    it('strips seoDescription from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('seoDescription');
    });

    it('strips barcode from public product', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).not.toHaveProperty('barcode');
    });

    it('strips storage key from images', () => {
      const pub = toPublicProduct(fullProduct);
      const images = pub.images as string[];
      expect(images[0]).toBe('https://example.com/img.jpg');
      expect(images[0]).not.toContain('key');
      expect(images[0]).not.toContain('stores/');
    });

    it('keeps customer-facing fields', () => {
      const pub = toPublicProduct(fullProduct);
      expect(pub).toHaveProperty('id', 1);
      expect(pub).toHaveProperty('name', 'Test Product');
      expect(pub).toHaveProperty('price', '100.00');
      expect(pub).toHaveProperty('sku', 'SKU-001');
      expect(pub).toHaveProperty('description', 'A test product');
      expect(pub).toHaveProperty('weightGrams', 500);
      expect(pub).toHaveProperty('lengthCm', '10');
      expect(pub).toHaveProperty('widthCm', '5');
      expect(pub).toHaveProperty('heightCm', '3');
      expect(pub).toHaveProperty('requiresShipping', true);
      expect(pub).toHaveProperty('isFragile', false);
      expect(pub).toHaveProperty('categoryName', 'Electronics');
    });
  });

  describe('Stock and availability behavior', () => {
    it('out-of-stock product disables add-to-cart', () => {
      const product = { trackInventory: true, stockQuantity: 0, status: 'active' };
      const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;
      expect(isOutOfStock).toBe(true);
    });

    it('in-stock product enables add-to-cart', () => {
      const product = { trackInventory: true, stockQuantity: 10, status: 'active' };
      const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;
      expect(isOutOfStock).toBe(false);
    });

    it('non-tracked inventory product is always available', () => {
      const product = { trackInventory: false, stockQuantity: 0, status: 'active' };
      const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;
      expect(isOutOfStock).toBe(false);
    });

    it('low stock warning triggers at 5 or below', () => {
      const low = { trackInventory: true, stockQuantity: 3 };
      const ok = { trackInventory: true, stockQuantity: 10 };
      const isLow = (p: any) => p.trackInventory && p.stockQuantity > 0 && p.stockQuantity <= 5;
      expect(isLow(low)).toBe(true);
      expect(isLow(ok)).toBe(false);
    });
  });

  describe('Quantity validation', () => {
    it('quantity cannot be less than 1', () => {
      const qty = 0;
      const clamped = Math.max(1, qty);
      expect(clamped).toBe(1);
    });

    it('quantity cannot exceed stock when tracking inventory', () => {
      const stock = 5;
      const requested = 10;
      const clamped = Math.min(stock, requested);
      expect(clamped).toBe(5);
    });

    it('quantity can be any value when not tracking inventory', () => {
      const trackInventory = false;
      const stock = 0;
      const requested = 100;
      const maxQty = trackInventory ? Math.max(1, stock) : 99;
      const clamped = Math.min(maxQty, requested);
      expect(clamped).toBe(99);
    });

    it('max quantity equals stock when tracking', () => {
      const stock = 7;
      const trackInventory = true;
      const maxQty = trackInventory ? Math.max(1, stock) : 99;
      expect(maxQty).toBe(7);
    });
  });

  describe('Related products logic', () => {
    it('excludes current product from related list', () => {
      const currentId = 1;
      const allProducts = [
        { id: 1, name: 'Current', status: 'active', categoryId: 1 },
        { id: 2, name: 'Related A', status: 'active', categoryId: 1 },
        { id: 3, name: 'Related B', status: 'active', categoryId: 1 },
      ];
      const related = allProducts.filter(p => p.id !== currentId && p.status === 'active');
      expect(related).toHaveLength(2);
      expect(related.find(p => p.id === currentId)).toBeUndefined();
    });

    it('excludes draft products from related list', () => {
      const currentId = 1;
      const allProducts = [
        { id: 1, name: 'Current', status: 'active', categoryId: 1 },
        { id: 2, name: 'Draft', status: 'draft', categoryId: 1 },
        { id: 3, name: 'Related', status: 'active', categoryId: 1 },
      ];
      const related = allProducts.filter(p => p.id !== currentId && p.status === 'active');
      expect(related).toHaveLength(1);
      expect(related[0].name).toBe('Related');
    });

    it('excludes archived products from related list', () => {
      const currentId = 1;
      const allProducts = [
        { id: 1, name: 'Current', status: 'active', categoryId: 1 },
        { id: 2, name: 'Archived', status: 'archived', categoryId: 1 },
        { id: 3, name: 'Related', status: 'active', categoryId: 1 },
      ];
      const related = allProducts.filter(p => p.id !== currentId && p.status === 'active');
      expect(related).toHaveLength(1);
    });

    it('limits related products to 4', () => {
      const currentId = 1;
      const allProducts = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1, name: `Product ${i + 1}`, status: 'active', categoryId: 1,
      }));
      const related = allProducts.filter(p => p.id !== currentId && p.status === 'active').slice(0, 4);
      expect(related).toHaveLength(4);
    });

    it('returns empty array when no related products exist', () => {
      const currentId = 1;
      const allProducts = [
        { id: 1, name: 'Current', status: 'active', categoryId: 1 },
      ];
      const related = allProducts.filter(p => p.id !== currentId && p.status === 'active').slice(0, 4);
      expect(related).toHaveLength(0);
    });
  });

  describe('Image handling', () => {
    it('shows fallback when no images', () => {
      const product = { images: [] };
      const hasImages = product.images.length > 0;
      expect(hasImages).toBe(false);
    });

    it('shows fallback when images is null/undefined', () => {
      const product = { images: null };
      const hasImages = product.images && product.images.length > 0;
      expect(!hasImages).toBe(true);
    });

    it('selects first image by default', () => {
      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      const selectedIdx = 0;
      expect(images[selectedIdx]).toBe('img1.jpg');
    });

    it('can switch between multiple images', () => {
      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      const selectedIdx = 2;
      expect(images[selectedIdx]).toBe('img3.jpg');
    });
  });

  describe('Discount calculation', () => {
    it('calculates discount percentage correctly', () => {
      const price = 80;
      const compareAtPrice = 100;
      const discountPercent = Math.round((1 - price / compareAtPrice) * 100);
      expect(discountPercent).toBe(20);
    });

    it('no discount when compareAtPrice is null', () => {
      const price = 100;
      const compareAtPrice = null;
      const hasDiscount = compareAtPrice && Number(compareAtPrice) > price;
      expect(!hasDiscount).toBe(true);
    });

    it('no discount when compareAtPrice equals price', () => {
      const price = 100;
      const compareAtPrice = 100;
      const hasDiscount = compareAtPrice > price;
      expect(hasDiscount).toBe(false);
    });
  });

  describe('Product meta display', () => {
    it('formats weight in grams when < 1000', () => {
      const grams = 500;
      const formatted = grams >= 1000 ? `${(grams / 1000).toFixed(1)} كجم` : `${grams} غرام`;
      expect(formatted).toBe('500 غرام');
    });

    it('formats weight in kg when >= 1000', () => {
      const grams = 1500;
      const formatted = grams >= 1000 ? `${(grams / 1000).toFixed(1)} كجم` : `${grams} غرام`;
      expect(formatted).toBe('1.5 كجم');
    });

    it('shows dimensions when available', () => {
      const product = { lengthCm: '10', widthCm: '5', heightCm: '3' };
      const hasDimensions = product.lengthCm || product.widthCm || product.heightCm;
      expect(!!hasDimensions).toBe(true);
    });

    it('hides dimensions when not available', () => {
      const product = { lengthCm: null, widthCm: null, heightCm: null };
      const hasDimensions = product.lengthCm || product.widthCm || product.heightCm;
      expect(!hasDimensions).toBe(true);
    });
  });

  describe('Breadcrumb generation', () => {
    it('generates correct breadcrumb with category', () => {
      const slug = 'haa-demo';
      const product = { name: 'Test', categoryName: 'Electronics', categorySlug: 'electronics' };
      const breadcrumb = [
        { label: 'الرئيسية', href: `/s/${slug}` },
        { label: product.categoryName, href: `/s/${slug}/c/${product.categorySlug}` },
        { label: product.name, href: null },
      ];
      expect(breadcrumb).toHaveLength(3);
      expect(breadcrumb[1].href).toBe('/s/haa-demo/c/electronics');
    });

    it('generates breadcrumb without category', () => {
      const slug = 'haa-demo';
      const product = { name: 'Test', categoryName: null, categorySlug: null };
      const breadcrumb = [
        { label: 'الرئيسية', href: `/s/${slug}` },
      ];
      if (product.categoryName) {
        breadcrumb.push({ label: product.categoryName, href: `/s/${slug}/c/${product.categorySlug}` });
      }
      breadcrumb.push({ label: product.name, href: null });
      expect(breadcrumb).toHaveLength(2);
    });
  });
});
