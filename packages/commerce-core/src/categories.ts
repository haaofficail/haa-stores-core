import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createCategorySchema } from '@haa/shared';
import { z } from 'zod';

type CreateCategoryInput = z.infer<typeof createCategorySchema>;

interface CategoryNode extends Record<string, unknown> {
  id: number;
  storeId: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  showInHome: boolean;
  showInMenu: boolean;
  children: CategoryNode[];
}

export class CategoriesService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number) {
    const items = await this.db.select()
      .from(s.categories)
      .where(eq(s.categories.storeId, storeId))
      .orderBy(s.categories.sortOrder);
    return items;
  }

  async getTree(storeId: number): Promise<CategoryNode[]> {
    const all = await this.list(storeId);
    return this.buildTree(all, null);
  }

  private buildTree(items: typeof s.categories.$inferSelect[], parentId: number | null): CategoryNode[] {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(item => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }

  async getById(storeId: number, id: number) {
    const [item] = await this.db.select()
      .from(s.categories)
      .where(and(eq(s.categories.id, id), eq(s.categories.storeId, storeId)))
      .limit(1);
    return item ?? null;
  }

  async getBySlug(storeId: number, slug: string) {
    const [item] = await this.db.select()
      .from(s.categories)
      .where(and(eq(s.categories.slug, slug), eq(s.categories.storeId, storeId)))
      .limit(1);
    return item ?? null;
  }

  async create(storeId: number, input: CreateCategoryInput) {
    if (input.parentId) {
      await this.assertNoCircularRef(storeId, 0, input.parentId);
    }
    const [category] = await this.db.insert(s.categories).values({
      storeId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
      imageUrl: input.imageUrl ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      showInHome: input.showInHome,
      showInMenu: input.showInMenu,
    }).returning();
    return category;
  }

  async update(storeId: number, id: number, input: Partial<CreateCategoryInput>) {
    const existing = await this.getById(storeId, id);
    if (!existing) return null;

    if (input.parentId !== undefined && input.parentId !== null) {
      await this.assertNoCircularRef(storeId, id, input.parentId);
    }

    const [updated] = await this.db.update(s.categories).set({
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      showInHome: input.showInHome,
      showInMenu: input.showInMenu,
      updatedAt: new Date(),
    }).where(and(eq(s.categories.id, id), eq(s.categories.storeId, storeId))).returning();
    return updated;
  }

  async delete(storeId: number, id: number) {
    const existing = await this.getById(storeId, id);
    if (!existing) return null;

    const children = await this.db.select({ id: s.categories.id })
      .from(s.categories)
      .where(and(eq(s.categories.parentId, id), eq(s.categories.storeId, storeId)))
      .limit(1);

    if (children.length > 0) {
      throw new Error('Cannot delete category with children. Remove or reassign child categories first.');
    }

    await this.db.delete(s.productCategories).where(eq(s.productCategories.categoryId, id));
    await this.db.delete(s.categories).where(and(eq(s.categories.id, id), eq(s.categories.storeId, storeId)));
    return existing;
  }

  async reorder(storeId: number, items: { id: number; parentId: number | null; sortOrder: number }[]) {
    const existing = await this.db.select({ id: s.categories.id })
      .from(s.categories)
      .where(eq(s.categories.storeId, storeId));

    const existingIds = new Set(existing.map(e => e.id));
    for (const item of items) {
      if (!existingIds.has(item.id)) {
        throw new Error(`Category ${item.id} not found`);
      }
    }

    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(s.categories).set({
          parentId: item.parentId,
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        }).where(and(eq(s.categories.id, item.id), eq(s.categories.storeId, storeId)));
      }
    });
  }

  private async assertNoCircularRef(storeId: number, categoryId: number, targetParentId: number) {
    if (categoryId === targetParentId) {
      throw new Error('A category cannot be its own parent');
    }

    let currentId = targetParentId;
    const visited = new Set<number>();
    visited.add(categoryId);

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error('Circular reference detected: a category cannot be a descendant of itself');
      }
      visited.add(currentId);

      const [parent] = await this.db.select({ parentId: s.categories.parentId })
        .from(s.categories)
        .where(and(eq(s.categories.id, currentId), eq(s.categories.storeId, storeId)))
        .limit(1);

      if (!parent) break;
      currentId = parent.parentId ?? 0;
    }
  }
}
