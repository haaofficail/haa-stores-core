import { describe, it, expect } from 'vitest'
import {
  validateTokens,
  validateSection,
  validatePageTemplate,
  validateThemeContract,
} from '../src/validation'

describe('validateTokens', () => {
  const valid = {
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
    fonts: { pair: 'modern', display: 'A', body: 'B', arabic: 'C' },
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
    shadows: { sm: '0', md: '0', lg: '0' },
    motion: { default: 'all .2s', drawer: 'all .3s', modal: 'opacity .2s' },
  }

  it('returns ok with data for valid input', () => {
    const result = validateTokens(valid)
    expect(result.ok).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('returns errors for invalid input', () => {
    const bad = { ...valid, colors: { ...valid.colors, bg: 'oops' } }
    const result = validateTokens(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
  })

  it('error paths are joined strings', () => {
    const bad = { ...valid, colors: { ...valid.colors, ink: 123 } }
    const result = validateTokens(bad)
    if (!result.ok) {
      expect(result.errors!.every((e) => typeof e.path === 'string')).toBe(true)
    }
  })
})

describe('validateSection', () => {
  it('validates a Hero section', () => {
    const result = validateSection({
      component: 'Hero',
      props: { variant: 'split' },
      visible: true,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects section with missing visible', () => {
    const result = validateSection({
      component: 'Hero',
      props: {},
    })
    expect(result.ok).toBe(false)
  })
})

describe('validatePageTemplate', () => {
  it('validates a home page template', () => {
    const result = validatePageTemplate({
      page: 'home',
      layout: '1col',
      density: 'comfy',
      sections: [
        { component: 'Hero', props: {}, visible: true },
        { component: 'TrustBand', props: { items: [] }, visible: true },
      ],
    })
    expect(result.ok).toBe(true)
  })
})

describe('validateThemeContract', () => {
  it('validates a minimal contract', () => {
    const result = validateThemeContract({
      key: 'pure-commerce',
      name: 'Pure Commerce',
      nameAr: 'بيور كوميرس',
      category: 'minimal',
      priceType: 'premium',
      price: 9900,
      currency: 'SAR',
      description: 'A theme.',
      descriptionAr: 'ثيم.',
      supportedPages: ['home'],
      supportsRTL: true,
      supportsDarkMode: false,
      supportsI18n: true,
      previewImages: {
        home: '/x.png',
        product: '/x.png',
        cart: '/x.png',
        checkout: '/x.png',
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
        fontPair: 'modern',
        heroVariant: 'split',
        density: 'comfy',
        cardStyle: 'soft',
      },
      tags: [],
      version: '1.0.0',
      author: { name: 'HAA' },
      updatedAt: '2026-06-07',
    })
    expect(result.ok).toBe(true)
  })
})
