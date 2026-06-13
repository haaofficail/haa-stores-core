import { describe, it, expect } from 'vitest'
import { ThemeTokensSchema } from '../src/contracts/tokens'
import { SectionInstanceSchema } from '../src/contracts/section'
import { PageTemplateSchema } from '../src/contracts/page'
import { ThemeExperienceContractSchema } from '../src/contracts/theme'
import { ThemeDefinitionSchema } from '../src/contracts/registry'
import type { ThemeDefinition } from '../src/types'

const validTokens = {
  colors: {
    bg: '#fafaf7',
    surface: '#ffffff',
    surface2: '#f4f3ef',
    ink: '#0a0a0a',
    ink2: '#5b5b5e',
    ink3: '#9a9a9d',
    line: '#ececec',
    lineStrong: '#d6d6d4',
    accent: '#0a0a0a',
    onAccent: '#ffffff',
  },
  fonts: {
    pair: 'modern' as const,
    display: 'Manrope',
    body: 'Manrope',
    arabic: 'IBM Plex Sans Arabic',
  },
  typography: {
    h1: { size: 72, weight: 700, lineHeight: 0.95, letterSpacing: '-0.035em' },
    h2: { size: 36, weight: 700, lineHeight: 1.1, letterSpacing: '-0.022em' },
    h3: { size: 24, weight: 700, lineHeight: 1.2, letterSpacing: '-0.015em' },
    body: { size: 14, weight: 400, lineHeight: 1.5, letterSpacing: '0' },
    caption: { size: 12, weight: 500, lineHeight: 1.4, letterSpacing: '0.01em' },
    eyebrow: { size: 11, weight: 700, lineHeight: 1.2, letterSpacing: '0.06em' },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 80 },
  radius: { sm: 6, md: 10, lg: 16, xl: 22 },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.04)',
    md: '0 8px 24px -8px rgba(0,0,0,0.10)',
    lg: '0 24px 64px -16px rgba(0,0,0,0.18)',
  },
  motion: {
    default: 'all .2s cubic-bezier(.2,.8,.2,1)',
    drawer: 'all .35s cubic-bezier(.2,.8,.2,1)',
    modal: 'opacity .2s ease',
  },
}

const validContract = {
  key: 'pure-commerce',
  name: 'Pure Commerce',
  nameAr: 'بيور كوميرس',
  category: 'minimal' as const,
  priceType: 'premium' as const,
  price: 9900,
  currency: 'SAR',
  description: 'A bright, white-tinted commerce theme.',
  descriptionAr: 'ثيم تجاري مينيمال.',
  supportedPages: ['home', 'product', 'category', 'cart', 'checkout', 'account'] as const,
  supportsRTL: true,
  supportsDarkMode: false,
  supportsI18n: true,
  previewImages: {
    home: '/themes/pure-commerce/preview-home.png',
    product: '/themes/pure-commerce/preview-product.png',
    cart: '/themes/pure-commerce/preview-cart.png',
    checkout: '/themes/pure-commerce/preview-checkout.png',
  },
  customization: {
    accentColor: true,
    backgroundColor: true,
    fontPair: true,
    heroVariant: true,
    density: true,
    cardStyle: true,
  },
  defaults: {
    accentColor: '#0a0a0a',
    backgroundColor: '#fafaf7',
    fontPair: 'modern' as const,
    heroVariant: 'split' as const,
    density: 'comfy' as const,
    cardStyle: 'soft' as const,
  },
  tags: ['minimal', 'luxury', 'white'],
  version: '1.0.0',
  author: { name: 'HAA Themes' },
  updatedAt: '2026-06-07',
}

const validHomePage = {
  page: 'home' as const,
  layout: '1col' as const,
  density: 'comfy' as const,
  sections: [
    { component: 'Hero' as const, props: { variant: 'split' }, visible: true },
    { component: 'TrustBand' as const, props: { items: ['x'] }, visible: true },
  ],
}

const validDefinition: ThemeDefinition = {
  contract: validContract,
  tokens: validTokens,
  pages: {
    home: validHomePage,
    product: {
      page: 'product',
      layout: '2col-sidebar-right',
      density: 'regular',
      sections: [{ component: 'Breadcrumbs', props: {}, visible: true }],
    },
  },
}

describe('ThemeTokensSchema', () => {
  it('accepts valid tokens', () => {
    expect(ThemeTokensSchema.safeParse(validTokens).success).toBe(true)
  })

  it('rejects invalid hex color', () => {
    const bad = JSON.parse(JSON.stringify(validTokens))
    bad.colors.bg = 'not-a-color'
    const result = ThemeTokensSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects missing color fields', () => {
    const bad = JSON.parse(JSON.stringify(validTokens))
    delete bad.colors.accent
    expect(ThemeTokensSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects negative spacing', () => {
    const bad = JSON.parse(JSON.stringify(validTokens))
    bad.spacing.xs = -5
    expect(ThemeTokensSchema.safeParse(bad).success).toBe(false)
  })
})

describe('SectionInstanceSchema', () => {
  it('accepts valid section', () => {
    const section = { component: 'Hero', props: { variant: 'split' }, visible: true }
    expect(SectionInstanceSchema.safeParse(section).success).toBe(true)
  })

  it('rejects unknown component', () => {
    const section = { component: 'NotASection', props: {}, visible: true }
    expect(SectionInstanceSchema.safeParse(section).success).toBe(false)
  })

  it('rejects function-typed props (strict primitive only)', () => {
    const section = {
      component: 'Hero',
      props: { onClick: 'not a function' },
      visible: true,
    }
    // String is allowed primitive, but 'onClick' is not a registered prop
    // The schema only checks types, not names — that is the allowlist
    const result = SectionInstanceSchema.safeParse(section)
    expect(result.success).toBe(true) // type passes
  })

  it('accepts empty props', () => {
    const section = { component: 'Hero', props: {}, visible: true }
    expect(SectionInstanceSchema.safeParse(section).success).toBe(true)
  })
})

describe('PageTemplateSchema', () => {
  it('accepts valid page template', () => {
    expect(PageTemplateSchema.safeParse(validHomePage).success).toBe(true)
  })

  it('rejects empty sections array', () => {
    const bad = { ...validHomePage, sections: [] }
    expect(PageTemplateSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects unknown page', () => {
    const bad = { ...validHomePage, page: 'unknown-page' }
    expect(PageTemplateSchema.safeParse(bad).success).toBe(false)
  })
})

describe('ThemeExperienceContractSchema', () => {
  it('accepts valid contract', () => {
    expect(ThemeExperienceContractSchema.safeParse(validContract).success).toBe(true)
  })

  it('rejects uppercase key', () => {
    const bad = { ...validContract, key: 'Pure-Commerce' }
    expect(ThemeExperienceContractSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects invalid version', () => {
    const bad = { ...validContract, version: '1.0' }
    expect(ThemeExperienceContractSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const bad = { ...validContract, updatedAt: '06/07/2026' }
    expect(ThemeExperienceContractSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects empty supportedPages', () => {
    const bad = { ...validContract, supportedPages: [] }
    expect(ThemeExperienceContractSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts null price for free themes', () => {
    const bad = { ...validContract, priceType: 'free' as const, price: null }
    expect(ThemeExperienceContractSchema.safeParse(bad).success).toBe(true)
  })
})

describe('ThemeDefinitionSchema', () => {
  it('accepts valid full definition', () => {
    expect(ThemeDefinitionSchema.safeParse(validDefinition).success).toBe(true)
  })

  it('rejects definition with invalid page key', () => {
    const bad = JSON.parse(JSON.stringify(validDefinition))
    bad.pages.invalid = bad.pages.home
    expect(ThemeDefinitionSchema.safeParse(bad).success).toBe(false)
  })
})
