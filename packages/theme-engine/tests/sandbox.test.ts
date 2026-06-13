import { describe, it, expect } from 'vitest'
import {
  containsForbiddenName,
  validatePropValue,
  validateSectionProps,
  isAllowedSectionProp,
  validateSectionPropsAllowlist,
  THEME_FORBIDDEN_NAMES,
  ALLOWED_SECTION_PROPS,
} from '../src/sandbox'

describe('THEME_FORBIDDEN_NAMES', () => {
  it('includes all expected dangerous names', () => {
    const expected = [
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie',
      'eval', 'Function',
      'cartApi', 'checkoutApi', 'ordersApi', 'walletApi',
      'createOrder', 'processPayment',
    ]
    for (const name of expected) {
      expect(THEME_FORBIDDEN_NAMES).toContain(name)
    }
  })
})

describe('containsForbiddenName', () => {
  it('detects fetch', () => {
    expect(containsForbiddenName('fetch("/api")')).toBe('fetch')
  })

  it('detects localStorage', () => {
    expect(containsForbiddenName('window.localStorage.setItem("x", "1")')).toBe('localStorage')
  })

  it('detects eval', () => {
    expect(containsForbiddenName('eval("alert(1)")')).toBe('eval')
  })

  it('returns null for safe values', () => {
    expect(containsForbiddenName('Hello world')).toBe(null)
    expect(containsForbiddenName('#fafaf7')).toBe(null)
    expect(containsForbiddenName('Modern Minimal')).toBe(null)
  })

  it('does not match partial names', () => {
    // "fetched" should NOT match "fetch"
    expect(containsForbiddenName('fetched')).toBe(null)
    // "MyLocal" should NOT match "localStorage"
    expect(containsForbiddenName('MyLocal')).toBe(null)
  })

  it('detects business-logic references', () => {
    expect(containsForbiddenName('cartApi.add()')).toBe('cartApi')
    expect(containsForbiddenName('processPayment()')).toBe('processPayment')
    expect(containsForbiddenName('createOrder(...)')).toBe('createOrder')
  })
})

describe('validatePropValue', () => {
  it('accepts safe string', () => {
    expect(validatePropValue('title', 'Welcome')).toEqual({ ok: true })
  })

  it('rejects forbidden reference', () => {
    const r = validatePropValue('ctaHref', 'fetch("/api")')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/forbidden/i)
  })
})

describe('validateSectionProps', () => {
  it('accepts all-safe props', () => {
    const props = { title: 'Hello', count: 5, ctaText: 'Click me' }
    expect(validateSectionProps(props)).toEqual({ ok: true })
  })

  it('rejects if any string prop is forbidden', () => {
    const props = { title: 'Hello', subtitle: 'eval("x")' }
    const r = validateSectionProps(props)
    expect(r.ok).toBe(false)
  })

  it('ignores non-string props', () => {
    const props = { count: 5, flag: true, missing: null }
    expect(validateSectionProps(props)).toEqual({ ok: true)
  })
})

describe('ALLOWED_SECTION_PROPS', () => {
  it('Hero allows title and variant', () => {
    expect(isAllowedSectionProp('Hero', 'title')).toBe(true)
    expect(isAllowedSectionProp('Hero', 'variant')).toBe(true)
  })

  it('Hero rejects onClick', () => {
    expect(isAllowedSectionProp('Hero', 'onClick')).toBe(false)
  })

  it('Unknown section rejects everything', () => {
    expect(isAllowedSectionProp('FakeSection', 'title')).toBe(false)
  })

  it('All listed section IDs have a props entry', () => {
    const expectedIds = [
      'Hero', 'CategoryRail', 'FeaturedGrid', 'EditorialStrip', 'TrustBand',
      'Newsletter', 'ProductGallery', 'ProductInfo', 'ColorPicker',
      'QuantityStepper', 'AddToCart', 'TrustInline', 'Tabs',
      'RelatedProducts', 'Breadcrumbs', 'CartSummary', 'CheckoutSteps',
      'AccountSidebar', 'OrderCard', 'OrderTimeline', 'CouponInput',
      'AddressForm', 'PaymentForm',
    ]
    for (const id of expectedIds) {
      expect(ALLOWED_SECTION_PROPS).toHaveProperty(id)
    }
  })
})

describe('validateSectionPropsAllowlist', () => {
  it('accepts all-allowed props', () => {
    const r = validateSectionPropsAllowlist('Hero', { title: 'x', variant: 'split' })
    expect(r.ok).toBe(true)
  })

  it('rejects disallowed prop', () => {
    const r = validateSectionPropsAllowlist('Hero', { onClick: '() => {}' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.prop).toBe('onClick')
  })

  it('rejects unknown section', () => {
    const r = validateSectionPropsAllowlist('FakeSection', { title: 'x' })
    expect(r.ok).toBe(false)
  })
})
