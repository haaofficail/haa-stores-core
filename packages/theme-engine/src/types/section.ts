/**
 * Section Contract
 *
 * A section is a visual block within a page (e.g., Hero, ProductGrid, TrustBand).
 * Theme authors declare which sections render on a page and in what order.
 * Sections receive data from the storefront renderer (not from theme).
 */

export type SectionComponentId =
  | 'Hero'
  | 'CategoryRail'
  | 'FeaturedGrid'
  | 'EditorialStrip'
  | 'TrustBand'
  | 'Newsletter'
  | 'ProductGallery'
  | 'ProductInfo'
  | 'ColorPicker'
  | 'QuantityStepper'
  | 'AddToCart'
  | 'TrustInline'
  | 'Tabs'
  | 'RelatedProducts'
  | 'Breadcrumbs'
  | 'CartSummary'
  | 'CheckoutSteps'
  | 'AccountSidebar'
  | 'OrderCard'
  | 'OrderTimeline'
  | 'CouponInput'
  | 'AddressForm'
  | 'PaymentForm'

/**
 * Props the section is allowed to receive.
 * Strict shape — no callbacks, no refs, no event handlers.
 * Data props (read-only) and configuration props only.
 */
export interface SectionProps {
  [key: string]: string | number | boolean | null | undefined
}

export interface SectionInstance {
  /** Type of section to render */
  component: SectionComponentId
  /** Configuration props for this instance */
  props: SectionProps
  /** Whether the section is visible on this page */
  visible: boolean
  /** Optional ordering hint (lower = earlier) */
  order?: number
}
