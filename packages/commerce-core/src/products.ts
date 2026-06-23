import { eq, and, like, count, inArray, sql, or } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createProductSchema, updateProductSchema, ValidationError } from '@haa/shared';
import { createMediaAdapter, type MediaAdapter, type UploadResult } from '@haa/shared/media';
import { AuditLogService } from '@haa/integration-core';
import { z } from 'zod';
import { cacheBumpNamespace, cacheGetVersioned, cacheSetVersioned } from './redis.js';

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Audit context passed to mutating methods. The route populates
 * this from the request (getAuth(c), c.req.header('x-forwarded-for'),
 * etc.) and the service uses it to record the audit log entry.
 *
 * Same shape as the AuditLogService.record() options the route
 * used to pass directly. Kept narrow to avoid leaking transport
 * details into the service.
 */
export interface AuditContext {
  actorUserId?: number | null;
  ipAddress?: string;
  userAgent?: string;
}

export class ProductsService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
  ) {}

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
    sfdaNumber?: string | null;
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
        const categories = await tx.select({
          id: s.categories.id,
          requiresSfda: s.categories.requiresSfda,
        })
          .from(s.categories)
          .where(and(inArray(s.categories.id, categoryIds), eq(s.categories.storeId, storeId)));
        if (categories.length !== categoryIds.length) {
          throw new ValidationError('One or more categories do not belong to this store');
        }
        // TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA workflow.
        // If ANY linked category requires SFDA, product must have a
        // valid sfdaNumber. Format validation happens in the Zod schema;
        // this is the per-product merchant-side gate.
        const needsSfda = categories.some((c: { requiresSfda: boolean }) => c.requiresSfda);
        if (needsSfda && (!input.sfdaNumber || !input.sfdaNumber.trim())) {
          throw new ValidationError(
            'SFDA registration number required for this product (category requires SFDA). ' +
            'Provide a valid sfdaNumber matching [A-Z0-9-]{5,50}.'
          );
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

  async create(storeId: number, input: CreateProductInput, auditCtx?: AuditContext) {
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
        haaMarketplaceEnabled: input.haaMarketplaceEnabled ?? false,
        haaMarketplaceCommissionRate: input.haaMarketplaceCommissionRate?.toString() ?? '0.05',
        brandId: input.brandId ?? null,
        // TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA workflow.
        // Pass through to products row. requiresSfdaNumber is
        // auto-derived from category.requiresSfda (set when admin
        // marks the category as regulated). sfdaNumber is the
        // format-validated [A-Z0-9-]{5,50} string from the merchant.
        sfdaNumber: input.sfdaNumber && input.sfdaNumber !== '' ? input.sfdaNumber : null,
        sfdaLicenseType: input.sfdaLicenseType ?? null,
        sfdaExpiryDate: input.sfdaExpiryDate ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        salesCount: input.salesCount ?? 0,
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

      // Audit (fire-and-forget — failure here doesn't fail the
      // create; the audit is for observability, not a constraint).
      if (auditCtx) {
        await this.audit.record({
          actorUserId: auditCtx.actorUserId ?? null,
          storeId,
          action: 'product_created',
          entityType: 'product',
          entityId: product.id,
          newValue: { id: product.id, name: product.name, status: product.status },
          ipAddress: auditCtx.ipAddress,
          userAgent: auditCtx.userAgent,
        });
      }

      return product;
    });
  }

  /**
   * Batch create — onboarding wizard P1 fix.
   *
   * Inserts N products in ONE Drizzle transaction (atomic). If any
   * single insert throws, the whole batch rolls back, leaving the
   * store consistent (no half-created onboarding). Used by the
   * batch route `POST /merchant/:storeId/products/batch`.
   *
   * Each item is validated against createProductSchema *before* the
   * transaction opens, so a malformed item never holds an open
   * transaction (Postgres locks). Audit record is a single
   * batch entry, not N entries.
   */
  async createBatch(storeId: number, inputs: CreateProductInput[], auditCtx?: AuditContext) {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new ValidationError('Batch must contain at least one product');
    }
    if (inputs.length > 100) {
      throw new ValidationError('Batch size cannot exceed 100 products');
    }

    const created = await this.db.transaction(async (tx) => {
      const results: any[] = [];
      for (const input of inputs) {
        // Re-validate relations inside the transaction so a stale
        // brand/category id from the wizard rolls back the whole batch.
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
          haaMarketplaceEnabled: input.haaMarketplaceEnabled ?? false,
          haaMarketplaceCommissionRate: input.haaMarketplaceCommissionRate?.toString() ?? '0.05',
          brandId: input.brandId ?? null,
          sfdaNumber: input.sfdaNumber && input.sfdaNumber !== '' ? input.sfdaNumber : null,
          sfdaLicenseType: input.sfdaLicenseType ?? null,
          sfdaExpiryDate: input.sfdaExpiryDate ?? null,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          salesCount: input.salesCount ?? 0,
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

        results.push(product);
      }
      return results;
    });

    await cacheBumpNamespace(this.cacheNamespace(storeId));

    if (auditCtx) {
      // Reuses the existing product_bulk_updated action (the
      // taxonomy's bulk-mutation entry — same shape with entityId: null
      // + count). A dedicated product_batch_created enum value would
      // be cleaner but adding it touches @haa/shared and the audit
      // dashboard label map; defer to a follow-up.
      await this.audit.record({
        actorUserId: auditCtx.actorUserId ?? null,
        storeId,
        action: 'product_bulk_updated',
        entityType: 'product',
        entityId: null,
        newValue: {
          op: 'batch_create',
          count: created.length,
          ids: created.map(p => p.id),
        },
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
    }

    return created;
  }

  async update(storeId: number, productId: number, input: UpdateProductInput, auditCtx?: AuditContext) {
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
        haaMarketplaceEnabled: input.haaMarketplaceEnabled,
        haaMarketplaceCommissionRate: input.haaMarketplaceCommissionRate?.toString(),
        brandId: input.brandId,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        salesCount: input.salesCount,
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

      // Audit (mirrors the original route's audit call: old vs
      // new for the auditable fields, no oldValue if the product
      // didn't exist before the call).
      if (auditCtx) {
        await this.audit.record({
          actorUserId: auditCtx.actorUserId ?? null,
          storeId,
          action: 'product_updated',
          entityType: 'product',
          entityId: productId,
          oldValue: existing ? { name: existing.name, status: existing.status, price: existing.price } : null,
          newValue: { id: updated[0].id, name: updated[0].name, status: updated[0].status, price: updated[0].price },
          ipAddress: auditCtx.ipAddress,
          userAgent: auditCtx.userAgent,
        });
      }

      return updated[0];
    });
  }

  async bulkAction(storeId: number, productIds: number[], action: 'activate' | 'deactivate', auditCtx?: AuditContext) {
    const status = action === 'activate' ? 'active' : 'draft';
    const result = await this.db.update(s.products)
      .set({ status, updatedAt: new Date() })
      .where(and(inArray(s.products.id, productIds), eq(s.products.storeId, storeId)))
      .returning({ id: s.products.id });

    await cacheBumpNamespace(this.cacheNamespace(storeId));

    const succeeded = result.map(r => r.id);
    const failed = productIds.filter(id => !succeeded.includes(id));

    if (auditCtx) {
      await this.audit.record({
        actorUserId: auditCtx.actorUserId ?? null,
        storeId,
        action: 'product_bulk_updated',
        entityType: 'product',
        entityId: null,
        newValue: { action, productIds, result: { total: productIds.length, succeeded: succeeded.length, failed: failed.length } },
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
    }

    return { total: productIds.length, succeeded: succeeded.length, failed: failed.length, failedIds: failed };
  }

  async archive(storeId: number, productId: number, auditCtx?: AuditContext) {
    const existing = await this.getById(storeId, productId);
    if (!existing) return null;
    const [updated] = await this.db.update(s.products).set({
      status: 'archived', updatedAt: new Date(),
    }).where(and(eq(s.products.id, productId), eq(s.products.storeId, storeId))).returning();

    await cacheBumpNamespace(this.cacheNamespace(storeId));

    if (auditCtx) {
      await this.audit.record({
        actorUserId: auditCtx.actorUserId ?? null,
        storeId,
        action: 'product_archived',
        entityType: 'product',
        entityId: productId,
        newValue: { id: updated.id, name: updated.name, status: updated.status },
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
    }

    return updated;
  }

  async delete(storeId: number, productId: number) {
    return this.archive(storeId, productId);
  }

  async addImage(storeId: number, productId: number, buffer: Buffer, mimetype: string, alt?: string, auditCtx?: AuditContext) {
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

    if (auditCtx) {
      await this.audit.record({
        actorUserId: auditCtx.actorUserId ?? null,
        storeId,
        action: 'product_image_uploaded',
        entityType: 'product_image',
        entityId: image.id,
        newValue: { productId, url: image.url },
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
    }

    return image;
  }

  async deleteImage(storeId: number, productId: number, imageId: number, auditCtx?: AuditContext) {
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

    if (auditCtx) {
      await this.audit.record({
        actorUserId: auditCtx.actorUserId ?? null,
        storeId,
        action: 'product_image_deleted',
        entityType: 'product_image',
        entityId: imageId,
        oldValue: { productId, url: image.url },
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
    }

    return image;
  }
}
