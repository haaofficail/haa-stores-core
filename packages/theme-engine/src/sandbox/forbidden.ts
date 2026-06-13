/**
 * Sandbox — Forbidden APIs
 *
 * These names are FORBIDDEN inside theme code (sections, prop values,
 * style strings, etc.). A theme that references any of these in a string
 * should be rejected by the sandbox validator.
 *
 * PR 1: declaration only. Enforcement happens in PR 2+ when themes
 * actually carry executable code. For now, sections are pure data.
 */

export const THEME_FORBIDDEN_NAMES: readonly string[] = [
  // --- Browser APIs that can exfiltrate data ---
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'navigator.sendBeacon',
  'importScripts',

  // --- Storage that can persist data ---
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document.cookie',

  // --- DOM manipulation that can break the app shell ---
  'document.write',
  'document.writeln',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',

  // --- Navigation that can take the user away ---
  'window.location',
  'location.assign',
  'location.replace',

  // --- Window globals that can intercept user data ---
  'window.open',
  'window.opener',

  // --- Business logic (theme MUST NOT touch) ---
  'cartApi',
  'checkoutApi',
  'ordersApi',
  'walletApi',
  'shippingApi',
  'paymentsApi',
  'customersApi',
  'productsApi',
  'couponsApi',
  'applyDiscount',
  'applyCoupon',
  'redeemLoyalty',
  'redeemReward',
  'createOrder',
  'createCheckout',
  'processPayment',
] as const

export type ForbiddenName = (typeof THEME_FORBIDDEN_NAMES)[number]

/**
 * Check if a string contains any forbidden name.
 * Uses word-boundary matching to avoid false positives (e.g. "navigator"
 * shouldn't match "navigator" alone, but "navigator.sendBeacon" would
 * match the explicit entry).
 */
export function containsForbiddenName(value: string): ForbiddenName | null {
  for (const name of THEME_FORBIDDEN_NAMES) {
    // Match as a whole token: 'fetch(' or 'fetch ' or '.fetch' etc.
    const pattern = new RegExp(
      `(?:^|[^A-Za-z0-9_])${escapeRegex(name)}(?:$|[^A-Za-z0-9_])`
    )
    if (pattern.test(value)) {
      return name
    }
  }
  return null
}

/**
 * Validate a prop value (string) for forbidden references.
 */
export function validatePropValue(
  key: string,
  value: string
): { ok: true } | { ok: false; reason: string } {
  const found = containsForbiddenName(value)
  if (found) {
    return {
      ok: false,
      reason: `Prop "${key}" references forbidden name "${found}"`,
    }
  }
  return { ok: true }
}

/**
 * Validate all string props in a section instance.
 */
export function validateSectionProps(
  props: Record<string, unknown>
): { ok: true } | { ok: false; reason: string } {
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      const result = validatePropValue(key, value)
      if (!result.ok) {
        return result
      }
    }
  }
  return { ok: true }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
