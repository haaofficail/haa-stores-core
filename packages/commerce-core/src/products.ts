import { eq, and, like, count, inArray, sql, or } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createProductSchema, updateProductSchema, createMediaAdapter, ValidationError, type MediaAdapter, type UploadResult } from '@haa/shared';
import { z } from 'zod';
import { cacheBumpNamespace, cacheGetVersioned, cacheSetVersioned } from './redis';

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

export class ProductsService {
  constructor(private db: DbClient = createDbClient()) {}

  private cacheNamespace(storeId: number): string {
    return `prod:${storeId}`;
  }

  async list(storeId: number, opts?: {
    page?: number; limit?: number; status?: string;
    categoryId?: number; brandId?: number; tagId?: number;
    search?: string; minPrice?: number; maxPrice?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'name';
    stockFilter?: 'in_stock' | 'low_stock' | 'out_of_stock';
    typeFilter?: 'simple' | 'variants';
  }) {
    const cacheKey = `list:${JSON.stringify(opts || {})}`;
    const cached = await cacheGetVersioned<any>(this.cacheNamespace(storeId), cacheKey);
    if (cached) return cached;

    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const conditions = [eq(s.products.storeId, storeId)];
    if (opts?.status) conditions.push(eq(s.products.status, opts.status));
    if (opts?.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(like(s.products.name, term), like(s.products.slug, term))!);
    }
    if (opts?.categoryId) {
      const catProducts = await this.db.select({ productId: s.productCategories.productId })
        .from(s.productCategories)
        .where(eq(s.productCategories.categoryId, opts.categoryId));
      const ids = catProducts.map(c => c.productId);
      if (ids.length) conditions.push(inArray(s.products.id, ids));
      else conditions.push(sql`1=0`);
    }
    if (opts?.brandId) {
      conditions.push(eq(s.products.brandId, opts.brandId));
    }
    if (opts?.tagId) {
      const tagProducts = await this.db.select({ productId: s.productTags.productId })
        .from(s.productTags)
        .where(eq(s.productTags.tagId, opts.tagId));
      const ids = tagProducts.map(t => t.productId);
      if (ids.length) conditions.push(inArray(s.products.id, ids));
      else conditions.push(sql`1=0`);
    }
    if (opts?.minPrice !== undefined) {
      conditions.push(sql`${s.products.price}::numeric >= ${opts.minPrice}`);
    }
    if (opts?.maxPrice !== undefined) {
      conditions.push(sql`${s.products.price}::numeric <= ${opts.maxPrice}`);
    }
    if (opts?.stockFilter === 'in_stock') {
      conditions.push(sql`(${s.products.trackInventory} = false OR (${s.products.trackInventory} = true AND ${s.products.stockQuantity} > 5))`);
    } else if (opts?.stockFilter === 'low_stock') {
      conditions.push(and(eq(s.products.trackInventory, true), sql`${s.products.stockQuantity} > 0`, sql`${s.products.stockQuantity} <= 5`)!);
    } else if (opts?.stockFilter === 'out_of_stock') {
      conditions.push(and(eq(s.products.trackInventory, true), eq(s.products.stockQuantity, 0))!);
    }
    if (opts?.typeFilter === 'simple') {
      conditions.push(sql`NOT EXISTS (SELECT 1 FROM ${s.productOptions} WHERE ${s.productOptions.productId} = ${s.products.id})`);
    } else if (opts?.typeFilter === 'variants') {
      conditions.push(sql`EXISTS (SELECT 1 FROM ${s.productOptions} WHERE ${s.productOptions.productId} = ${s.products.id})`);
    }

    const sortOrder = opts?.sort === 'price_asc'
      ? sql`${s.products.price}::numeric ASC`
      : opts?.sort === 'price_desc'
        ? sql`${s.products.price}::numeric DESC`
        : opts?.sort === 'name'
          ? s.products.name
          : s.products.createdAt;

    const [totalResult, items] = await Promise.all([
      this.db.select({ total: count() }).from(s.products).where(and(...conditions)),
      this.db.select()
        .from(s.products)
        .where(and(...conditions))
        .limit(limit).offset((page - 1) * limit)
        .orderBy(sortOrder)
    ]);
    
    const total = Number(totalResult[0].total);
    const productIds = items.map(p => p.id);
    
    if (productIds.length === 0) {
      const result = { data: [], total, page, limit, totalPages: 0 };
      await cacheSetVersioned(this.cacheNamespace(storeId), cacheKey, result, 300); // 5 mins for lists
      return result;
    }

    const [images, categories, allBrands, tags, optionCounts] = await Promise.all([
      this.db.select()
        .from(s.productImages)
        .where(inArray(s.productImages.productId, productIds)),
      this.db.select({
        productId: s.productCategories.productId,
        categoryId: s.productCategories.categoryId,
        name: s.categories.name,
        slug: s.categories.slug,
      }).from(s.productCategories)
        .innerJoin(s.categories, eq(s.productCategories.categoryId, s.categories.id))
        .where(inArray(s.productCategories.productId, productIds)),
      this.db.select().from(s.brands).where(eq(s.brands.storeId, storeId)),
      this.db.select({
        productId: s.productTags.productId,
        tagId: s.productTags.tagId,
        name: s.tags.name,
        slug: s.tags.slug,
        color: s.tags.color,
      }).from(s.productTags)
        .innerJoin(s.tags, eq(s.productTags.tagId, s.tags.id))
        .where(inArray(s.productTags.productId, productIds)),
      this.db.select({
        productId: s.productOptions.productId,
        count: count(),
      }).from(s.productOptions)
        .where(inArray(s.productOptions.productId, productIds))
        .groupBy(s.productOptions.productId),
    ]);

    const brandMap = new Map(allBrands.map(b => [b.id, { id: b.id, name: b.name, slug: b.slug, logo: b.logo }]));
    const optionCountMap = new Map(optionCounts.map(o => [o.productId, Number(o.count)]));

    const data = items.map(p => ({
      ...p,
      images: images.filter(i => i.productId === p.id),
      categories: categories.filter(c => c.productId === p.id),
      brand: p.brandId ? brandMap.get(p.brandId) ?? null : null,
      tags: tags.filter(t => t.productId === p.id),
      optionCount: optionCountMap.get(p.id) ?? 0,
    }));

    const result = { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    await cacheSetVersioned(this.cacheNamespace(storeId), cacheKey, result, 300);
    return result;
  }

  private async enrichProduct(product: any) {
    if (!product) return null;
    const [images, cats, brand, tagList, options, variants] = await Promise.all([
      this.db.select().from(s.productImages).where(eq(s.productImages.productId, product.id)),
      this.db.select({
        categoryId: s.productCategories.categoryId,
        name: s.categories.name,
        slug: s.categories.slug,
      }).from(s.productCategories)
        .innerJoin(s.categories, eq(s.productCategories.categoryId, s.categories.id))
        .where(eq(s.productCategories.productId, product.id)),
      product.brandId
        ? this.db.select().from(s.brands).where(eq(s.brands.id, product.brandId)).limit(1).then(r => r[0] ?? null)
        : Promise.resolve(null),
      this.db.select({
        tagId: s.productTags.tagId,
        name: s.tags.name,
        slug: s.tags.slug,
        color: s.tags.color,
      }).from(s.productTags)
        .innerJoin(s.tags, eq(s.productTags.tagId, s.tags.id))
        .where(eq(s.productTags.productId, product.id)),
      this.db.select({
        id: s.productOptions.id,
        name: s.productOptions.name,
        sortOrder: s.productOptions.sortOrder,
        values: sql<
          { id: number; value: string; sortOrder: number }[]
        >`COALESCE(
          jsonb_agg(
            jsonb_build_object('id', ${s.productOptionValues.id}, 'value', ${s.productOptionValues.value}, 'sortOrder', ${s.productOptionValues.sortOrder})
            ORDER BY ${s.productOptionValues.sortOrder}
          ) FILTER (WHERE ${s.productOptionValues.id} IS NOT NULL),
          '[]'::jsonb
        )`,
      })
        .from(s.productOptions)
        .leftJoin(s.productOptionValues, eq(s.productOptionValues.productOptionId, s.productOptions.id))
        .where(eq(s.productOptions.productId, product.id))
        .groupBy(s.productOptions.id, s.productOptions.name, s.productOptions.sortOrder)
        .orderBy(s.productOptions.sortOrder),
      this.db.select().from(s.productVariants)
        .where(eq(s.productVariants.productId, product.id))
        .orderBy(s.productVariants.sortOrder),
    ]);
    return { ...product, images, categories: cats, brand, tags: tagList, options, variants };
  }

  async getById(storeId: number, productId: number) {
    const cacheKey = `id:${productId}`;
    const cached = await cacheGetVersioned<any>(this.cacheNamespace(storeId), cacheKey);
    if (cached) return cached;

    const [product] = await this.db.select()
      .from(s.products)
      .where(and(eq(s.products.id, productId), eq(s.products.storeId, storeId)))
      .limit(1);
    if (!product) return null;

    const result = await this.enrichProduct(product);
    await cacheSetVersioned(this.cacheNamespace(storeId), cacheKey, result, 3600);
    return result;
  }

  async getBySlug(storeId: number, slug: string) {
    const cacheKey = `slug:${slug}`;
    const cached = await cacheGetVersioned<any>(this.cacheNamespace(storeId), cacheKey);
    if (cached) return cached;

    const [product] = await this.db.select()
      .from(s.products)
      .where(and(eq(s.products.slug, slug), eq(s.products.storeId, storeId)))
      .limit(1);
    if (!product) return null;

    const result = await this.enrichProduct(product);
    await cacheSetVersioned(this.cacheNamespace(storeId), cacheKey, result, 3600);
    return result;
  }

  private async saveOptionsAndVariants(
    tx: any, productId: number,
    options?: { name: string; values: string[] }[],
    variants?: { name: string; sku?: string; price?: number; stockQuantity?: number; isActive?: boolean; options: Record<string, string> }[],
  ) {
    if (options !== undefined) {
      const existingOptions = await tx.select({ id: s.productOptions.id })
        .from(s.productOptions)
        .where(eq(s.productOptions.productId, productId));
      const optionIds = existingOptions.map((o: any) => o.id);
      if (optionIds.length) {
        await tx.delete(s.productOptionValues)
          .where(inArray(s.productOptionValues.productOptionId, optionIds));
        await tx.delete(s.productOptions)
          .where(inArray(s.productOptions.id, optionIds));
      }

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const [inserted] = await tx.insert(s.productOptions).values({
          productId,
          name: opt.name,
          sortOrder: i,
        }).returning();
        if (opt.values.length) {
          await tx.insert(s.productOptionValues).values(
            opt.values.map((v, vi) => ({ productOptionId: inserted.id, value: v, sortOrder: vi }))
          );
        }
      }
    }

    if (variants !== undefined) {
      await tx.delete(s.productVariants).where(eq(s.productVariants.productId, productId));

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        await tx.insert(s.productVariants).values({
          productId,
          name: v.name,
          sku: v.sku ?? null,
          price: v.price !== undefined ? v.price.toString() : null,
          stockQuantity: v.stockQuantity ?? 0,
          isActive: v.isActive ?? true,
          options: v.options,
          sortOrder: i,
        });
      }
    }
  }

  private async validateProductRelations(tx: any, storeId: number, input: {
    brandId?: number | null;
    categoryIds?: number[];
    tagIds?: number[];
  }) {
    if (input.brandId != null) {
      const [brand] = await tx.select({ id: s.brands.id })
        .from(s.brands)
        .where(and(eq(s.brands.id, input.brandId), eq(s.brands.storeId, storeId)))
        .limit(1);
      if (!brand) throw new ValidationError('Brand does not belong to this store');
    }

    if (input.categoryIds !== undefined) {
      const categoryIds = [...new Set(input.categoryIds)];
      if (categoryIds.length) {
        const categories = await tx.select({ id: s.categories.id })
          .from(s.categories)
          .where(and(inArray(s.categories.id, categoryIds), eq(s.categories.storeId, storeId)));
        if (categories.length !== categoryIds.length) {
          throw new ValidationError('One or more categories do not belong to this store');
        }
      }
    }

    if (input.tagIds !== undefined) {
      const tagIds = [...new Set(input.tagIds)];
      if (tagIds.length) {
        const tags = await tx.select({ id: s.tags.id })
          .from(s.tags)
          .where(and(inArray(s.tags.id, tagIds), eq(s.tags.storeId, storeId)));
        if (tags.length !== tagIds.length) {
          throw new ValidationError('One or more tags do not belong to this store');
        }
      }
    }
  }

  async create(storeId: number, input: CreateProductInput) {
    return this.db.transaction(async (tx) => {
      await this.validateProductRelations(tx, storeId, input);

      const [product] = await tx.insert(s.products).values({
        storeId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        status: input.status,
        type: input.type,
        price: input.price.toString(),
        compareAtPrice: input.compareAtPrice?.toString() ?? null,
        cost: input.cost?.toString() ?? null,
        sku: input.sku ?? null,
        barcode: input.barcode ?? null,
        stockQuantity: input.stockQuantity,
        trackInventory: input.trackInventory,
        weightGrams: input.weightGrams ?? null,
        lengthCm: input.lengthCm?.toString() ?? null,
        widthCm: input.widthCm?.toString() ?? null,
        heightCm: input.heightCm?.toString() ?? null,
        requiresShipping: input.requiresShipping,
        isFragile: input.isFragile,
        giftWrapAvailable: input.giftWrapAvailable ?? false,
        giftWrapPriceOverride: input.giftWrapPriceOverride?.toString() ?? null,
        brandId: input.brandId ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
      }).returning();

      if (input.categoryIds?.length) {
        const categoryIds = [...new Set(input.categoryIds)];
        await tx.insert(s.productCategories).values(
          categoryIds.map(cid => ({ productId: product.id, categoryId: cid }))
        );
      }

      if (input.tagIds?.length) {
        const tagIds = [...new Set(input.tagIds)];
        await tx.insert(s.productTags).values(
          tagIds.map(tid => ({ productId: product.id, tagId: tid }))
        );
      }

      if (input.options || input.variants) {
        await this.saveOptionsAndVariants(tx, product.id, input.options, input.variants);
      }

      await cacheBumpNamespace(this.cacheNamespace(storeId));

      return product;
    });
  }

  async update(storeId: number, productId: number, input: UpdateProductInput) {
    const existing = await this.getById(storeId, productId);
    if (!existing) return null;

    return this.db.transaction(async (tx) => {
      await this.validateProductRelations(tx, storeId, input);

      const updated = await tx.update(s.products).set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: input.status,
        type: input.type,
        price: input.price?.toString(),
        compareAtPrice: input.compareAtPrice?.toString(),
        cost: input.cost?.toString(),
        sku: input.sku,
        barcode: input.barcode,
        stockQuantity: input.stockQuantity,
        trackInventory: input.trackInventory,
        weightGrams: input.weightGrams,
        lengthCm: input.lengthCm?.toString(),
        widthCm: input.widthCm?.toString(),
        heightCm: input.heightCm?.toString(),
        requiresShipping: input.requiresShipping,
        isFragile: input.isFragile,
        giftWrapAvailable: input.giftWrapAvailable,
        giftWrapPriceOverride: input.giftWrapPriceOverride?.toString(),
        brandId: input.brandId,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        updatedAt: new Date(),
      }).where(and(eq(s.products.id, productId), eq(s.products.storeId, storeId))).returning();

      if (input.categoryIds) {
        await tx.delete(s.productCategories).where(eq(s.productCategories.productId, productId));
        if (input.categoryIds.length) {
          const categoryIds = [...new Set(input.categoryIds)];
          await tx.insert(s.productCategories).values(
            categoryIds.map(cid => ({ productId, categoryId: cid }))
          );
        }
      }

      if (input.tagIds) {
        await tx.delete(s.productTags).where(eq(s.productTags.productId, productId));
        if (input.tagIds.length) {
          const tagIds = [...new Set(input.tagIds)];
          await tx.insert(s.productTags).values(
            tagIds.map(tid => ({ productId, tagId: tid }))
          );
        }
      }

      if (input.options !== undefined || input.variants !== undefined) {
        await this.saveOptionsAndVariants(tx, productId, input.options, input.variants);
      }

      await cacheBumpNamespace(this.cacheNamespace(storeId));

      return updated[0];
    });
  }

  async bulkAction(storeId: number, productIds: number[], action: 'activate' | 'deactivate') {
    const status = action === 'activate' ? 'active' : 'draft';
    const result = await this.db.update(s.products)
      .set({ status, updatedAt: new Date() })
      .where(and(inArray(s.products.id, productIds), eq(s.products.storeId, storeId)))
      .returning({ id: s.products.id });

    await cacheBumpNamespace(this.cacheNamespace(storeId));

    const succeeded = result.map(r => r.id);
    const failed = productIds.filter(id => !succeeded.includes(id));
    return { total: productIds.length, succeeded: succeeded.length, failed: failed.length, failedIds: failed };
  }

  async archive(storeId: number, productId: number) {
    const existing = await this.getById(storeId, productId);
    if (!existing) return null;
    const [updated] = await this.db.update(s.products).set({
      status: 'archived', updatedAt: new Date(),
    }).where(and(eq(s.products.id, productId), eq(s.products.storeId, storeId))).returning();
    
    await cacheBumpNamespace(this.cacheNamespace(storeId));
    
    return updated;
  }

  async delete(storeId: number, productId: number) {
    return this.archive(storeId, productId);
  }

  async addImage(storeId: number, productId: number, buffer: Buffer, mimetype: string, alt?: string) {
    const product = await this.getById(storeId, productId);
    if (!product) return null;

    // Check storage quota (graceful: allow upload if subscription/plan data unavailable)
    try {
      const subQuery = this.db.select({ storageLimitMb: s.subscriptionPlans.storageLimitMb })
        .from(s.merchantSubscriptions)
        .innerJoin(s.subscriptionPlans, eq(s.merchantSubscriptions.planId, s.subscriptionPlans.id))
        .where(eq(s.merchantSubscriptions.storeId, storeId))
        .limit(1);
      const [sub] = await subQuery;
      if (sub && sub.storageLimitMb !== -1 && sub.storageLimitMb !== null) {
        const maxBytes = Number(sub.storageLimitMb) * 1024 * 1024;
        const [usage] = await this.db.select({
          used: sql<number>`COALESCE(SUM(${s.productImages.sizeBytes}), 0)`
        })
          .from(s.productImages)
          .innerJoin(s.products, eq(s.productImages.productId, s.products.id))
          .where(eq(s.products.storeId, storeId));
        if (Number(usage.used) >= maxBytes) {
          throw new ValidationError('Storage quota exceeded');
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      // Graceful degradation: allow upload when subscription data unavailable
    }

    const adapter: MediaAdapter = createMediaAdapter();
    const validationError = adapter.validateFile(buffer, mimetype);
    if (validationError) throw new ValidationError(validationError);

    const result: UploadResult = await adapter.upload(buffer, mimetype, productId, storeId);

    const [image] = await this.db.insert(s.productImages).values({
      productId,
      url: result.url,
      key: result.key,
      thumbUrl: result.thumbUrl ?? null,
      thumbKey: result.thumbKey ?? null,
      sizeBytes: result.sizeBytes ?? null,
      alt: alt ?? null,
      sortOrder: 0,
    }).returning();

    await cacheBumpNamespace(this.cacheNamespace(storeId));

    return image;
  }

  async deleteImage(storeId: number, productId: number, imageId: number) {
    const [imageRow] = await this.db.select({ image: s.productImages })
      .from(s.productImages)
      .innerJoin(s.products, eq(s.productImages.productId, s.products.id))
      .where(and(
        eq(s.productImages.id, imageId),
        eq(s.productImages.productId, productId),
        eq(s.products.storeId, storeId),
      ))
      .limit(1);
    const image = imageRow ? ((imageRow as any).image ?? imageRow) : null;
    if (!image) return null;

    if (image.key) {
      const adapter: MediaAdapter = createMediaAdapter();
      await adapter.delete(image.key);
    }

    await this.db.delete(s.productImages)
      .where(and(eq(s.productImages.id, imageId), eq(s.productImages.productId, productId)));

    await cacheBumpNamespace(this.cacheNamespace(storeId));

    return image;
  }
}
