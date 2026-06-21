import { describe, it, expect } from 'vitest'
import { contrastRatio } from '@/lib/colors'

/**
 * These tests verify that the token colors (which we also validate
 * at build time via validate.ts) maintain proper contrast.
 * This is a runtime safety net for when tokens change.
 */
describe('accessibility — color contrast', () => {
  // These values must match tokens.json primary + semantic colors
  const colors = {
    primary500: '#0066d9',
    primary600: '#0055cc',
    success: '#15803d',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0369a1',
    white: '#ffffff',
    black: '#0a0a0a',
  }

  it('primary-500 has sufficient UI contrast on white (≥3:1)', () => {
    const ratio = contrastRatio(colors.primary500, colors.white)
    expect(ratio).toBeGreaterThanOrEqual(3)
  })

  it('primary-600 has sufficient text contrast on white (≥4.5:1)', () => {
    const ratio = contrastRatio(colors.primary600, colors.white)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('success color has sufficient text contrast with white text', () => {
    const ratio = contrastRatio(colors.white, colors.success)
    expect(ratio).toBeGreaterThanOrEqual(3)
  })

  it('danger color has sufficient text contrast with white text', () => {
    const ratio = contrastRatio(colors.white, colors.danger)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('warning color uses dark text for sufficient contrast', () => {
    const ratio = contrastRatio(colors.black, colors.warning)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})
