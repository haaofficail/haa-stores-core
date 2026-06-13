import { z } from 'zod'
import {
  FontPairSchema,
  HeroVariantSchema,
  CardStyleSchema,
  DensitySchema,
} from './tokens'
import { SupportedPageSchema } from './page'

export const ThemeCategorySchema = z.enum([
  'minimal',
  'luxury',
  'marketplace',
  'restaurant',
  'perfume',
  'events',
  'custom',
])

export const ThemePriceTypeSchema = z.enum(['free', 'premium', 'one-time'])

export const ThemeCustomizationSchema = z.object({
  accentColor: z.boolean(),
  backgroundColor: z.boolean(),
  fontPair: z.boolean(),
  heroVariant: z.boolean(),
  density: z.boolean(),
  cardStyle: z.boolean(),
})

export const ThemeAuthorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
})

export const ThemePreviewImagesSchema = z.object({
  home: z.string().min(1),
  product: z.string().min(1),
  cart: z.string().min(1),
  checkout: z.string().min(1),
})

export const ThemeDefaultsSchema = z.object({
  accentColor: z.string().regex(/^#/, 'Must be a hex color'),
  backgroundColor: z.string().regex(/^#/, 'Must be a hex color'),
  fontPair: FontPairSchema,
  heroVariant: HeroVariantSchema,
  density: DensitySchema,
  cardStyle: CardStyleSchema,
})

export const ThemeExperienceContractSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Key must be kebab-case (a-z, 0-9, -)'),
  name: z.string().min(1).max(120),
  nameAr: z.string().min(1).max(120),
  category: ThemeCategorySchema,
  priceType: ThemePriceTypeSchema,
  price: z.number().int().nonnegative().nullable(),
  currency: z.string().min(1).max(8),
  description: z.string().min(1).max(2000),
  descriptionAr: z.string().min(1).max(2000),
  supportedPages: z.array(SupportedPageSchema).min(1),
  supportsRTL: z.boolean(),
  supportsDarkMode: z.boolean(),
  supportsI18n: z.boolean(),
  previewImages: ThemePreviewImagesSchema,
  customization: ThemeCustomizationSchema,
  defaults: ThemeDefaultsSchema,
  tags: z.array(z.string().min(1).max(40)).max(20),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver (e.g., 1.0.0)'),
  author: ThemeAuthorSchema,
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
})
