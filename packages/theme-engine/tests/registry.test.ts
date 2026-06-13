import { describe, it, expect, beforeEach } from 'vitest'
import { ThemeRegistry } from '../src/registry'
import type { ThemeDefinition } from '../src/types'

const makeTheme = (key: string, overrides: Partial<ThemeDefinition['contract']> = {}): ThemeDefinition => ({
  contract: {
    key,
    name: `Theme ${key}`,
    nameAr: `ثيم ${key}`,
    category: 'minimal',
    priceType: 'free',
    price: null,
    currency: 'SAR',
    description: 'A theme.',
    descriptionAr: 'ثيم.',
    supportedPages: ['home'],
    supportsRTL: true,
    supportsDarkMode: false,
    supportsI18n: true,
    previewImages: { home: '/x.png', product: '/x.png', cart: '/x.png', checkout: '/x.png' },
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
    ...overrides,
  },
  tokens: {
    colors: {
      bg: '#fafaf7', surface: '#fff', surface2: '#f4f3ef',
      ink: '#0a0a0a', ink2: '#5b5b5e', ink3: '#9a9a9d',
      line: '#ececec', lineStrong: '#d6d6d4', accent: '#0a0a0a', onAccent: '#fff',
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
  },
  pages: {
    home: {
      page: 'home',
      layout: '1col',
      density: 'comfy',
      sections: [{ component: 'Hero', props: {}, visible: true }],
    },
  },
})

describe('ThemeRegistry', () => {
  let registry: ThemeRegistry

  beforeEach(() => {
    registry = new ThemeRegistry()
  })

  it('starts empty', () => {
    expect(registry.size).toBe(0)
    expect(registry.list()).toEqual([])
  })

  it('registers a theme', () => {
    const theme = makeTheme('pure-commerce')
    registry.register(theme)
    expect(registry.size).toBe(1)
    expect(registry.has('pure-commerce')).toBe(true)
  })

  it('retrieves a full theme', () => {
    const theme = makeTheme('pure-commerce')
    registry.register(theme)
    const got = registry.get('pure-commerce')
    expect(got).toBe(theme)
  })

  it('retrieves just the contract', () => {
    const theme = makeTheme('pure-commerce')
    registry.register(theme)
    const contract = registry.getContract('pure-commerce')
    expect(contract?.key).toBe('pure-commerce')
    expect(contract?.name).toBe('Theme pure-commerce')
  })

  it('throws on duplicate key', () => {
    const theme = makeTheme('pure-commerce')
    registry.register(theme)
    expect(() => registry.register(theme)).toThrow(/already registered/)
  })

  it('throws on invalid contract', () => {
    const theme = makeTheme('BAD_KEY')
    expect(() => registry.register(theme)).toThrow(/Invalid theme contract/)
  })

  it('unregisters a theme', () => {
    const theme = makeTheme('pure-commerce')
    registry.register(theme)
    expect(registry.unregister('pure-commerce')).toBe(true)
    expect(registry.size).toBe(0)
  })

  it('returns false when unregistering unknown key', () => {
    expect(registry.unregister('nope')).toBe(false)
  })

  it('preserves registration order', () => {
    registry.register(makeTheme('theme-a'))
    registry.register(makeTheme('theme-b'))
    registry.register(makeTheme('theme-c'))
    const keys = registry.list().map((e) => e.key)
    expect(keys).toEqual(['theme-a', 'theme-b', 'theme-c'])
  })

  it('unregistering preserves order of remaining', () => {
    registry.register(makeTheme('theme-a'))
    registry.register(makeTheme('theme-b'))
    registry.register(makeTheme('theme-c'))
    registry.unregister('theme-b')
    const keys = registry.list().map((e) => e.key)
    expect(keys).toEqual(['theme-a', 'theme-c'])
  })

  it('manifest counts free and premium correctly', () => {
    registry.register(makeTheme('theme-a', { priceType: 'free', price: null }))
    registry.register(makeTheme('theme-b', { priceType: 'premium', price: 9900 }))
    registry.register(makeTheme('theme-c', { priceType: 'premium', price: 14900 }))
    const m = registry.manifest()
    expect(m.total).toBe(3)
    expect(m.free).toBe(1)
    expect(m.premium).toBe(2)
  })

  it('manifest groups by category', () => {
    registry.register(makeTheme('theme-a', { category: 'minimal' }))
    registry.register(makeTheme('theme-b', { category: 'luxury' }))
    registry.register(makeTheme('theme-c', { category: 'minimal' }))
    const m = registry.manifest()
    expect(m.byCategory.minimal).toBe(2)
    expect(m.byCategory.luxury).toBe(1)
  })

  it('clear removes all themes', () => {
    registry.register(makeTheme('theme-a'))
    registry.register(makeTheme('theme-b'))
    registry.clear()
    expect(registry.size).toBe(0)
  })
})
