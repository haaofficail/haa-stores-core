/**
 * Theme Contract (the public-facing theme descriptor)
 */

import type { FontPair, HeroVariant, CardStyle, Density } from './tokens'
import type { SupportedPage } from './page'

export type ThemeCategory =
  | 'minimal'
  | 'luxury'
  | 'marketplace'
  | 'restaurant'
  | 'perfume'
  | 'events'
  | 'custom'

export type ThemePriceType = 'free' | 'premium' | 'one-time'

export type ThemeCustomization = {
  accentColor: boolean
  backgroundColor: boolean
  fontPair: boolean
  heroVariant: boolean
  density: boolean
  cardStyle: boolean
}

export interface ThemeAuthor {
  name: string
  url?: string
}

export interface ThemePreviewImages {
  home: string
  product: string
  cart: string
  checkout: string
}

export interface ThemeExperienceContract {
  /** Unique theme key (slug, kebab-case) */
  key: string
  /** Display name (English) */
  name: string
  /** Display name (Arabic) */
  nameAr: string
  /** Category */
  category: ThemeCategory
  /** Pricing type */
  priceType: ThemePriceType
  /** Price in halalas (e.g., 9900 = 99 SAR). null = free */
  price: number | null
  /** Currency */
  currency: string
  /** Description (English) */
  description: string
  /** Description (Arabic) */
  descriptionAr: string
  /** Pages the theme supports */
  supportedPages: SupportedPage[]
  /** Supports RTL */
  supportsRTL: boolean
  /** Supports dark mode */
  supportsDarkMode: boolean
  /** Supports i18n (ar/en) */
  supportsI18n: boolean
  /** Preview image paths (relative to /public) */
  previewImages: ThemePreviewImages
  /** Which customizations are allowed (Tweaks Panel) */
  customization: ThemeCustomization
  /** Default values for customizations */
  defaults: {
    accentColor: string
    backgroundColor: string
    fontPair: FontPair
    heroVariant: HeroVariant
    density: Density
    cardStyle: CardStyle
  }
  /** Tags for filtering */
  tags: string[]
  /** Theme version (semver) */
  version: string
  /** Theme author */
  author: ThemeAuthor
  /** Last updated ISO date */
  updatedAt: string
}
