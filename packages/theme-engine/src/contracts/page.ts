import { z } from 'zod'
import { SectionInstanceSchema } from './section'

export const SupportedPageSchema = z.enum([
  'home',
  'product',
  'category',
  'cart',
  'checkout',
  'account',
  'track',
  'about',
  'contact',
])

export const PageLayoutSchema = z.enum([
  '1col',
  '2col-sidebar-left',
  '2col-sidebar-right',
  'split-50-50',
])

export const PageDensitySchema = z.enum(['compact', 'regular', 'comfy'])

export const PageTemplateSchema = z.object({
  page: SupportedPageSchema,
  layout: PageLayoutSchema,
  density: PageDensitySchema,
  sections: z.array(SectionInstanceSchema).min(1, 'Page must have at least one section'),
})
