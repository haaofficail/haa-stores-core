// TASK-0038 audit P0-#6 — SFDA / Restricted Categories Enforcement
//
// The schema has sfdaNumber, sfdaLicenseType, sfdaExpiryDate columns
// (migration 0060_product_sfda.sql) but the marketplace route does
// NOT enforce them. This module is the single source of truth for:
//
//   1. Which categories require SFDA pre-approval (cosmetics, health,
//      supplements, food, medical devices).
//   2. When a product in an SFDA-gated category can be listed in the
//      marketplace (needs a valid, non-expired SFDA number).
//   3. Hard-blocked categories (weapons, drugs, adult content) — these
//      are NEVER allowed regardless of merchant.
//
// Reference: SFDA E-Commerce Guideline + Saudi Consumer Protection
// regulations. See docs/SAUDI_COMPLIANCE_CHECKLIST.md §6 for the
// legal basis.

// Categories that require SFDA pre-approval + a valid SFDA number.
// Any product in one of these categories must have:
//   - sfdaNumber set
//   - sfdaExpiryDate > now()
//   - sfdaVerifiedAt set (admin verified)
export const SFDA_GATED_CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  'cosmetics',         // مستحضرات تجميل
  'skincare',          // عناية بالبشرة (overlap with cosmetics)
  'health-food',       // أغذية صحية
  'food-supplements',  // مكملات غذائية
  'herbal',            // أعشاب طبية
  'medical-devices',   // أجهزة طبية
  'baby-formula',      // حليب أطفال
  'contact-lenses',    // عدسات لاصقة
]);

// Categories that are NEVER allowed in the marketplace.
// Hard block at the data layer — no opt-in can override.
export const PROHIBITED_CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  'weapons',           // أسلحة
  'firearms',          // أسلحة نارية
  'explosives',        // متفجرات
  'drugs',             // أدوية خاضعة للرقابة
  'controlled-substances',
  'alcohol',           // كحول (غير مسموح)
  'pork-products',     // منتجات لحم خنزير
  'gambling',          // قمار
  'adult-content',     // محتوى إباحي
  'tobacco',           // تبغ
  'shisha',            // معسل
  'vape',              // فيب / سجائر إلكترونية
]);

export type SfdaValidation =
  | { allowed: true }
  | { allowed: false; reason: 'prohibited_category'; categorySlug: string }
  | { allowed: false; reason: 'sfda_required'; categorySlug: string }
  | { allowed: false; reason: 'sfda_missing'; categorySlug: string }
  | { allowed: false; reason: 'sfda_expired'; categorySlug: string; expiredAt: string }
  | { allowed: false; reason: 'sfda_unverified'; categorySlug: string };

export type ProductForSfdaCheck = {
  categorySlugs: string[];     // product is in any of these categories
  sfdaNumber?: string | null;
  sfdaExpiryDate?: string | Date | null;
  sfdaVerifiedAt?: string | Date | null;
};

/**
 * Validates whether a product can be listed in the public marketplace.
 *
 * Order of checks:
 *   1. If ANY category is in PROHIBITED_CATEGORY_SLUGS -> hard block.
 *   2. If ANY category is in SFDA_GATED_CATEGORY_SLUGS:
 *      a. Must have sfdaNumber set
 *      b. Must have sfdaExpiryDate > now()
 *      c. Must have sfdaVerifiedAt set (admin verified)
 *   3. Otherwise: allowed.
 */
export function validateProductForMarketplace(
  product: ProductForSfdaCheck,
  now: Date = new Date(),
): SfdaValidation {
  // Step 1: prohibited categories — hard block.
  for (const slug of product.categorySlugs) {
    if (PROHIBITED_CATEGORY_SLUGS.has(slug)) {
      return { allowed: false, reason: 'prohibited_category', categorySlug: slug };
    }
  }

  // Step 2: SFDA-gated categories — soft block (recoverable with valid SFDA).
  const requiresSfda = product.categorySlugs.some((slug) => SFDA_GATED_CATEGORY_SLUGS.has(slug));
  if (!requiresSfda) {
    return { allowed: true };
  }

  // Find the first gated category for error reporting.
  const gatedSlug = product.categorySlugs.find((slug) => SFDA_GATED_CATEGORY_SLUGS.has(slug))!;

  if (!product.sfdaNumber || product.sfdaNumber.trim() === '') {
    return { allowed: false, reason: 'sfda_missing', categorySlug: gatedSlug };
  }

  if (!product.sfdaVerifiedAt) {
    return { allowed: false, reason: 'sfda_unverified', categorySlug: gatedSlug };
  }

  if (!product.sfdaExpiryDate) {
    return { allowed: false, reason: 'sfda_missing', categorySlug: gatedSlug };
  }

  const expiry = product.sfdaExpiryDate instanceof Date
    ? product.sfdaExpiryDate
    : new Date(product.sfdaExpiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return { allowed: false, reason: 'sfda_missing', categorySlug: gatedSlug };
  }
  if (expiry <= now) {
    return {
      allowed: false,
      reason: 'sfda_expired',
      categorySlug: gatedSlug,
      expiredAt: expiry.toISOString(),
    };
  }

  return { allowed: true };
}
