import { z } from 'zod'

/**
 * Section component IDs the theme engine recognizes.
 * Adding a new component requires updating this enum AND the section registry.
 */
export const SectionComponentIdSchema = z.enum([
  'Hero',
  'CategoryRail',
  'FeaturedGrid',
  'EditorialStrip',
  'TrustBand',
  'Newsletter',
  'ProductGallery',
  'ProductInfo',
  'ColorPicker',
  'QuantityStepper',
  'AddToCart',
  'TrustInline',
  'Tabs',
  'RelatedProducts',
  'Breadcrumbs',
  'CartSummary',
  'CheckoutSteps',
  'AccountSidebar',
  'OrderCard',
  'OrderTimeline',
  'CouponInput',
  'AddressForm',
  'PaymentForm',
])

/**
 * Primitive prop value types a section can receive.
 * STRICT: no callbacks, no refs, no events.
 */
const SectionPropValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
])

export const SectionPropsSchema = z.record(z.string(), SectionPropValueSchema)

export const SectionInstanceSchema = z.object({
  component: SectionComponentIdSchema,
  props: SectionPropsSchema,
  visible: z.boolean(),
  order: z.number().int().nonnegative().optional(),
})
