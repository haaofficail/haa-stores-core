import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal valid image buffers
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

// A minimal valid 1x1 white JPEG that sharp can process
const TINY_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AoAD/2Q==', 'base64');

function mockDb(opts?: { hasImage?: boolean }) {
  const hasImage = opts?.hasImage ?? true;
  const returning = vi.fn().mockResolvedValue([{ id: 1, url: '/storage/test.jpg', key: 'test-key' }]);
  const insert = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });
  const limit = vi.fn().mockResolvedValue(hasImage ? [{ id: 1, url: '/storage/test.jpg', key: 'test-key' }] : []);
  const where = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi.fn().mockReturnValue({ where, limit });
  const from = vi.fn().mockReturnValue({ where, innerJoin });
  const select = vi.fn().mockReturnValue({ from });
  const del = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  return { insert, returning, select, from, where: vi.fn(), limit: vi.fn(), innerJoin, delete: del };
}

describe('Image Upload / Delete', () => {
  describe('MediaAdapter', () => {
    it('validates allowed mime types', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      const adapter = createMediaAdapter('local');
      expect(adapter.validateFile(JPEG_HEADER, 'image/jpeg')).toBeNull();
      expect(adapter.validateFile(PNG_HEADER, 'image/png')).toBeNull();
      expect(adapter.validateFile(WEBP_HEADER, 'image/webp')).toBeNull();
      expect(adapter.validateFile(Buffer.from(''), 'image/gif')).toBe('Unsupported file type: image/gif. Allowed: image/jpeg, image/png, image/webp');
      expect(adapter.validateFile(Buffer.from(''), 'application/pdf')).toContain('Unsupported file type');
      expect(adapter.validateFile(Buffer.from(''), 'text/html')).toContain('Unsupported file type');
    });

    it('rejects oversized files (>5MB)', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      const adapter = createMediaAdapter('local');
      const oversized = Buffer.concat([JPEG_HEADER, Buffer.alloc(6 * 1024 * 1024)]);
      const result = adapter.validateFile(oversized, 'image/jpeg');
      expect(result).toContain('File size');
      expect(result).toContain('exceeds maximum');
    });

    it('accepts files at exactly 5MB', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      const adapter = createMediaAdapter('local');
      const exactly5mb = Buffer.concat([JPEG_HEADER, Buffer.alloc(5 * 1024 * 1024 - JPEG_HEADER.length)]);
      expect(adapter.validateFile(exactly5mb, 'image/jpeg')).toBeNull();
    });

    it('rejects files with mismatched content type', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      const adapter = createMediaAdapter('local');
      const result = adapter.validateFile(JPEG_HEADER, 'image/png');
      expect(result).toContain('File content does not match declared type');
    });

    it('generates proper storage keys', async () => {
      const { generateStorageKey } = await import('@haa/shared');
      const key = generateStorageKey(1, 42, 'image/jpeg');
      expect(key).toMatch(/^stores\/1\/products\/42\/[\w-]+\.jpg$/);
      const key2 = generateStorageKey(1, 42, 'image/png');
      expect(key2).toMatch(/\.png$/);
      const key3 = generateStorageKey(1, 42, 'image/webp');
      expect(key3).toMatch(/\.webp$/);
    });

    it('storage key does not include original filename', async () => {
      const { generateStorageKey } = await import('@haa/shared');
      const key = generateStorageKey(1, 1, 'image/jpeg');
      expect(key).not.toContain('original');
      expect(key).not.toContain('filename');
      expect(key).toMatch(/[\w-]+\.[\w]+$/);
    });
  });

  describe('LocalStorageAdapter', () => {
    it('uploads and returns url with key', async () => {
      const { LocalStorageAdapter } = await import('@haa/shared');
      const adapter = new LocalStorageAdapter('/tmp/test-storage', 'http://localhost:3000/storage');
      const result = await adapter.upload(TINY_JPEG, 'image/jpeg', 1, 1);
      expect(result.url).toMatch(/^http:\/\/localhost:3000\/storage\/stores\/1\/products\/1\//);
      expect(result.key).toMatch(/^stores\/1\/products\/1\//);
      expect(result.thumbUrl).toMatch(/\.thumb\./);
      expect(result.thumbKey).toMatch(/\.thumb\./);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it('returns driver name as local', async () => {
      const { LocalStorageAdapter } = await import('@haa/shared');
      const adapter = new LocalStorageAdapter('/tmp/test-storage', 'http://localhost:3000/storage');
      expect(adapter.getDriverName()).toBe('local');
    });

    it('url does not expose filesystem path', async () => {
      const { LocalStorageAdapter } = await import('@haa/shared');
      const adapter = new LocalStorageAdapter('/tmp/test-storage', 'http://localhost:3000/storage');
      const result = await adapter.upload(TINY_JPEG, 'image/jpeg', 1, 1);
      expect(result.url).not.toContain('/tmp/');
      expect(result.url).not.toContain('test-storage');
    });
  });

  describe('S3StorageAdapter', () => {
    it('creates with required config', async () => {
      const { S3StorageAdapter } = await import('@haa/shared');
      const adapter = new S3StorageAdapter(
        'https://s3.example.com',
        'auto',
        'my-bucket',
        'access-key',
        'secret-key',
        'https://cdn.example.com',
      );
      expect(adapter.getDriverName()).toBe('s3');
    });

    it('generates public url from base url and key', async () => {
      const { S3StorageAdapter } = await import('@haa/shared');
      const adapter = new S3StorageAdapter(
        'https://s3.example.com',
        'auto',
        'my-bucket',
        'access-key',
        'secret-key',
        'https://cdn.example.com',
      );
      const url = adapter.getPublicUrl('stores/1/products/1/test.jpg');
      expect(url).toBe('https://cdn.example.com/stores/1/products/1/test.jpg');
    });

    it('validates mime types same as local', async () => {
      const { S3StorageAdapter } = await import('@haa/shared');
      const adapter = new S3StorageAdapter(
        'https://s3.example.com',
        'auto',
        'my-bucket',
        'access-key',
        'secret-key',
        'https://cdn.example.com',
      );
      expect(adapter.validateFile(JPEG_HEADER, 'image/jpeg')).toBeNull();
      expect(adapter.validateFile(Buffer.from(''), 'application/pdf')).toContain('Unsupported file type');
    });

    it('rejects content-type mismatch', async () => {
      const { S3StorageAdapter } = await import('@haa/shared');
      const adapter = new S3StorageAdapter(
        'https://s3.example.com',
        'auto',
        'my-bucket',
        'access-key',
        'secret-key',
        'https://cdn.example.com',
      );
      expect(adapter.validateFile(JPEG_HEADER, 'image/png')).toContain('File content does not match declared type');
    });

    it('validates file size', async () => {
      const { S3StorageAdapter } = await import('@haa/shared');
      const adapter = new S3StorageAdapter(
        'https://s3.example.com',
        'auto',
        'my-bucket',
        'access-key',
        'secret-key',
        'https://cdn.example.com',
      );
      const oversized = Buffer.concat([JPEG_HEADER, Buffer.alloc(6 * 1024 * 1024)]);
      expect(adapter.validateFile(oversized, 'image/jpeg')).toContain('exceeds maximum');
    });
  });

  describe('createMediaAdapter', () => {
    it('creates local adapter by default', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      const adapter = createMediaAdapter('local');
      expect(adapter.getDriverName()).toBe('local');
    });

    it('throws for unknown driver', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      expect(() => createMediaAdapter('unknown')).toThrow('Unknown storage driver');
    });

    it('throws for s3 driver without env vars', async () => {
      const { createMediaAdapter } = await import('@haa/shared');
      const originalEnv = process.env.STORAGE_DRIVER;
      delete process.env.STORAGE_DRIVER;
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_REGION;
      delete process.env.S3_BUCKET;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_PUBLIC_BASE_URL;
      
      expect(() => createMediaAdapter('s3')).toThrow('Missing required env var for S3 storage');
      
      if (originalEnv) process.env.STORAGE_DRIVER = originalEnv;
    });
  });

  describe('ProductsService addImage/deleteImage', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('adds product image successfully', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const db = mockDb();
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({ id: 1, name: 'Test' });
      Object.defineProperty(service, 'db', { value: db });

      const result = await service.addImage(1, 1, TINY_JPEG, 'image/jpeg');
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('returns null for non-existent product on addImage', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue(null);

      const result = await service.addImage(1, 999, TINY_JPEG, 'image/jpeg');
      expect(result).toBeNull();
    });

    it('rejects unsupported mime type on addImage', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({ id: 1, name: 'Test' });

      await expect(service.addImage(1, 1, TINY_JPEG, 'application/pdf')).rejects.toThrow('Unsupported file type');
    });

    it('rejects oversized file on addImage', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({ id: 1, name: 'Test' });

      const oversized = Buffer.concat([JPEG_HEADER, Buffer.alloc(6 * 1024 * 1024)]);
      await expect(service.addImage(1, 1, oversized, 'image/jpeg')).rejects.toThrow('exceeds maximum');
    });

    it('deletes product image successfully', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const db = mockDb({ hasImage: true });
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({ id: 1, name: 'Test' });
      Object.defineProperty(service, 'db', { value: db });

      const result = await service.deleteImage(1, 1, 1);
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('returns null for non-existent product on deleteImage', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue(null);

      const result = await service.deleteImage(1, 999, 1);
      expect(result).toBeNull();
    });

    it('returns null for non-existent image on deleteImage', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const db = mockDb({ hasImage: false });
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({ id: 1, name: 'Test' });
      Object.defineProperty(service, 'db', { value: db });

      const result = await service.deleteImage(1, 1, 999);
      expect(result).toBeNull();
    });

    it('ownership: addImage rejects cross-store product', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockImplementation((storeId, productId) => {
        if (storeId === 999) return null;
        return { id: productId, name: 'Test' };
      });

      const result = await service.addImage(999, 1, TINY_JPEG, 'image/jpeg');
      expect(result).toBeNull();
    });

    it('ownership: deleteImage rejects cross-store product', async () => {
      const { ProductsService } = await import('@haa/commerce-core');
      const service = new ProductsService();

      vi.spyOn(service as any, 'getById').mockImplementation((storeId, productId) => {
        if (storeId === 999) return null;
        return { id: productId, name: 'Test' };
      });

      const result = await service.deleteImage(999, 1, 1);
      expect(result).toBeNull();
    });
  });

  describe('Public DTO Safety', () => {
    it('toPublicProduct strips key from images', async () => {
      const product = {
        id: 1,
        name: 'Test',
        cost: '10.00',
        storeId: 1,
        images: [
          { id: 1, productId: 1, url: '/storage/test.jpg', key: 'stores/1/products/1/uuid.jpg', alt: null, sortOrder: 0 },
        ],
      };

      const { toPublicProduct } = await import('./helpers/dto-helper');
      const publicProduct = toPublicProduct(product);

      expect(publicProduct.cost).toBeUndefined();
      expect(publicProduct.images).toHaveLength(1);
      expect(publicProduct.images[0]).toBe('/storage/test.jpg');
      expect(publicProduct.images[0]).not.toContain('key');
    });

    it('toPublicProduct returns URL strings only', async () => {
      const product = {
        id: 1,
        name: 'Test',
        images: [
          { id: 1, url: '/storage/img1.jpg', key: 'key1' },
          { id: 2, url: '/storage/img2.png', key: 'key2' },
        ],
      };

      const { toPublicProduct } = await import('./helpers/dto-helper');
      const publicProduct = toPublicProduct(product);

      expect(Array.isArray(publicProduct.images)).toBe(true);
      expect(publicProduct.images[0]).toBe('/storage/img1.jpg');
      expect(publicProduct.images[1]).toBe('/storage/img2.png');
      expect(typeof publicProduct.images[0]).toBe('string');
    });
  });
});
