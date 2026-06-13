import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomersService } from '@haa/commerce-core';

const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
};

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomersService(mockDb as any);
  });

  describe('findByPhone', () => {
    it('finds customer by phone', async () => {
      const mockSelect: any = vi.fn();
      mockSelect.from = vi.fn().mockReturnThis();
      mockSelect.where = vi.fn().mockReturnThis();
      mockSelect.limit = vi.fn().mockResolvedValue([{ id: 1, name: 'Ahmed', phone: '966500000001' }]);
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.findByPhone(1, '966500000001');
      expect(result).toBeTruthy();
      expect(result!.phone).toBe('966500000001');
    });

    it('returns null when not found', async () => {
      const mockSelect: any = vi.fn();
      mockSelect.from = vi.fn().mockReturnThis();
      mockSelect.where = vi.fn().mockReturnThis();
      mockSelect.limit = vi.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.findByPhone(1, '966500000000');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a customer and returns it', async () => {
      const mockInsert: any = vi.fn();
      mockInsert.values = vi.fn().mockReturnThis();
      mockInsert.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'Ahmed', phone: '966500000001', storeId: 1 }]);
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.create(1, { name: 'Ahmed', phone: '966500000001' });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Ahmed');
    });
  });

  describe('update', () => {
    it('updates customer name', async () => {
      const mockUpdate: any = vi.fn();
      mockUpdate.set = vi.fn().mockReturnThis();
      mockUpdate.where = vi.fn().mockReturnThis();
      mockUpdate.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'New Name' }]);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.update(1, 1, { name: 'New Name' });
      expect(result).toBeTruthy();
      expect(result!.name).toBe('New Name');
    });

    it('returns null for non-existent customer', async () => {
      const mockUpdate: any = vi.fn();
      mockUpdate.set = vi.fn().mockReturnThis();
      mockUpdate.where = vi.fn().mockReturnThis();
      mockUpdate.returning = vi.fn().mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.update(1, 999, { name: 'Ghost' });
      expect(result).toBeNull();
    });
  });
});
