/**
 * Store Identity Resolvers
 *
 * Centralised, pure resolver functions for store and platform identity.
 * Every fallback lives here — components must NOT inline fallback logic.
 */

export const FALLBACK_PRIMARY = '#56a1e3';

/**
 * Resolve the effective store theme primary colour.
 *
 * Precedence:
 *   1. stores.primaryColor        (single source of truth)
 *   2. themeConfig.colors.primary (legacy fallback for backward compatibility)
 *   3. FALLBACK_PRIMARY           (#56a1e3 — platform default)
 *
 * Architectural decision: stores.primaryColor is the authoritative field.
 * themeConfig.colors.primary must NEVER override it.
 */
export function resolveStoreThemePrimaryColor(
  storePrimaryColor: string | undefined | null,
  themeConfigPrimary: string | undefined | null,
): string {
  return storePrimaryColor ?? themeConfigPrimary ?? FALLBACK_PRIMARY;
}

/**
 * Resolve the store logo URL.
 * Pure function — centralises the null-coalescing so components don't inline
 * `store.logoUrl ?? null` patterns.
 */
export function resolveStoreLogoUrl(
  logoUrl: string | undefined | null,
): string | null {
  return logoUrl ?? null;
}

/**
 * Resolve the platform (tenant) logo URL.
 */
export function resolvePlatformLogoUrl(
  logoUrl: string | undefined | null,
): string | null {
  return logoUrl ?? null;
}
