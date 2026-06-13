import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  sortOrder: z.coerce.number().int().default(0),
});

type CreateTagInput = z.infer<typeof createTagSchema>;

export class TagsService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number) {
    const items = await this.db.select()
      .from(s.tags)
      .where(eq(s.tags.storeId, storeId))
      .orderBy(s.tags.sortOrder);
    return items;
  }

  async getById(storeId: number, id: number) {
    const [item] = await this.db.select()
      .from(s.tags)
      .where(and(eq(s.tags.id, id), eq(s.tags.storeId, storeId)))
      .limit(1);
    return item ?? null;
  }

  async create(storeId: number, input: CreateTagInput) {
    const [tag] = await this.db.insert(s.tags).values({
      storeId,
      name: input.name,
      slug: input.slug,
      color: input.color,
      sortOrder: input.sortOrder,
    }).returning();
    return tag;
  }

  async update(storeId: number, id: number, input: Partial<CreateTagInput>) {
    const existing = await this.getById(storeId, id);
    if (!existing) return null;
    const [updated] = await this.db.update(s.tags).set({
      name: input.name,
      slug: input.slug,
      color: input.color,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    }).where(and(eq(s.tags.id, id), eq(s.tags.storeId, storeId))).returning();
    return updated;
  }

  async delete(storeId: number, id: number) {
    const existing = await this.getById(storeId, id);
    if (!existing) return null;
    await this.db.delete(s.productTags).where(eq(s.productTags.tagId, id));
    await this.db.delete(s.tags).where(and(eq(s.tags.id, id), eq(s.tags.storeId, storeId)));
    return existing;
  }

  async reorder(storeId: number, items: { id: number; sortOrder: number }[]) {
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(s.tags).set({
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        }).where(and(eq(s.tags.id, item.id), eq(s.tags.storeId, storeId)));
      }
    });
  }
}
