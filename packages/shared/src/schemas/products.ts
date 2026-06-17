import { z } from 'zod';

const optionValueSchema = z.string().min(1).max(100);
const optionSchema = z.object({
  name: z.string().min(1).max(100),
  values: z.array(optionValueSchema).min(1),
});

const variantSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().optional(),
  price: z.number().positive().optional(),
  stockQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  options: z.record(z.string(), z.string()),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  type: z.enum(['physical', 'digital', 'service']).default('physical'),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
  trackInventory: z.boolean().default(true),
  weightGrams: z.coerce.number().positive().optional(),
  lengthCm: z.coerce.number().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  requiresShipping: z.boolean().default(true),
  isFragile: z.boolean().default(false),
  giftWrapAvailable: z.boolean().default(false),
  giftWrapPriceOverride: z.coerce.number().positive().optional(),
  haaMarketplaceEnabled: z.boolean().default(false),
  haaMarketplaceCommissionRate: z.coerce.number().min(0).max(1).default(0.05),
  brandId: z.coerce.number().optional(),
  categoryIds: z.array(z.coerce.number()).optional(),
  tagIds: z.array(z.coerce.number()).optional(),
  salesCount: z.coerce.number().int().nonnegative().default(0).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  options: z.array(optionSchema).optional(),
  variants: z.array(variantSchema).optional(),
  // TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA workflow.
  // Format validation only — matches SFDA registration number format.
  // Live SFDA API integration deferred to Phase 7+.
  sfdaNumber: z.string().regex(/^[A-Z0-9-]{5,50}$/).optional().or(z.literal('')),
  sfdaLicenseType: z.string().max(30).optional(),
  sfdaExpiryDate: z.coerce.date().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  parentId: z.coerce.number().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  showInHome: z.boolean().default(false),
  showInMenu: z.boolean().default(true),
});
