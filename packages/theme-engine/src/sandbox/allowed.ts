/**
 * Sandbox — Allowed section prop names
 *
 * Section props are STRICT. Only whitelisted names are allowed.
 * This prevents themes from passing arbitrary data or callbacks.
 *
 * PR 1: declaration only. Used as the canonical reference for
 * which prop names are safe to pass from the data layer to sections.
 */

export const ALLOWED_SECTION_PROPS: Readonly<Record<string, ReadonlyArray<string>>> = {
  Hero: [
    'title',
    'subtitle',
    'eyebrow',
    'ctaText',
    'ctaHref',
    'backgroundImage',
    'variant',
  ],
  CategoryRail: ['count', 'columns', 'showLabels'],
  FeaturedGrid: ['count', 'columns', 'showRating'],
  EditorialStrip: ['title', 'body', 'image', 'ctaText', 'ctaHref'],
  TrustBand: ['items'],
  Newsletter: ['title', 'placeholder', 'ctaText'],
  ProductGallery: ['images', 'aspect'],
  ProductInfo: ['product'],
  ColorPicker: ['colors', 'selectedId'],
  QuantityStepper: ['value', 'min', 'max'],
  AddToCart: ['product', 'sticky'],
  TrustInline: ['items'],
  Tabs: ['tabs', 'activeTab'],
  RelatedProducts: ['count', 'columns'],
  Breadcrumbs: ['items'],
  CartSummary: ['subtotal', 'shipping', 'total'],
  CheckoutSteps: ['steps', 'currentStep'],
  AccountSidebar: ['items'],
  OrderCard: ['order'],
  OrderTimeline: ['steps'],
  CouponInput: ['placeholder', 'ctaText'],
  AddressForm: ['fields'],
  PaymentForm: ['methods'],
} as const

export type AllowedSectionName = keyof typeof ALLOWED_SECTION_PROPS

/**
 * Check if a prop name is allowed for a given section.
 */
export function isAllowedSectionProp(
  section: string,
  propName: string
): boolean {
  const allowed = ALLOWED_SECTION_PROPS[section as AllowedSectionName]
  if (!allowed) return false
  return (allowed as readonly string[]).includes(propName)
}

/**
 * Validate all props on a section instance against the allowlist.
 */
export function validateSectionPropsAllowlist(
  section: string,
  props: Record<string, unknown>
): { ok: true } | { ok: false; reason: string; prop: string } {
  const allowed = ALLOWED_SECTION_PROPS[section as AllowedSectionName]
  if (!allowed) {
    return { ok: false, reason: `Unknown section "${section}"`, prop: '' }
  }
  for (const key of Object.keys(props)) {
    if (!(allowed as readonly string[]).includes(key)) {
      return {
        ok: false,
        reason: `Section "${section}" does not allow prop "${key}"`,
        prop: key,
      }
    }
  }
  return { ok: true }
}
