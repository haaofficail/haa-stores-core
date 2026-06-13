import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  logo: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

type CreateBrandInput = z.infer<typeof createBrandSchema>;

export class BrandsService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number) {
    const items = await this.db.select()
      .from(s.brands)
      .where(eq(s.brands.storeId, storeId))
      .orderBy(s.brands.sortOrder);
    return items;
  }

  async getById(storeId: number, id: number) {
    const [item] = await this.db.select()
      .from(s.brands)
      .where(and(eq(s.brands.id, id), eq(s.brands.storeId, storeId)))
      .limit(1);
    return item ?? null;
  }

  async create(storeId: number, input: CreateBrandInput) {
    const [brand] = await this.db.insert(s.brands).values({
      storeId,
      name: input.name,
      slug: input.slug,
      logo: input.logo ?? null,
      description: input.description ?? null,
      website: input.website ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    }).returning();
    return brand;
  }

  async update(storeId: number, id: number, input: Partial<CreateBrandInput>) {
    const existing = await this.getById(storeId, id);
    if (!existing) return null;
    const [updated] = await this.db.update(s.brands).set({
      name: input.name,
      slug: input.slug,
      logo: input.logo,
      description: input.description,
      website: input.website,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      updatedAt: new Date(),
    }).where(and(eq(s.brands.id, id), eq(s.brands.storeId, storeId))).returning();
    return updated;
  }

  async delete(storeId: number, id: number) {
    const existing = await this.getById(storeId, id);
    if (!existing) return null;
    await this.db.delete(s.brands).where(and(eq(s.brands.id, id), eq(s.brands.storeId, storeId)));
    return existing;
  }

  async reorder(storeId: number, items: { id: number; sortOrder: number }[]) {
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(s.brands).set({
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        }).where(and(eq(s.brands.id, item.id), eq(s.brands.storeId, storeId)));
      }
    });
  }
}
