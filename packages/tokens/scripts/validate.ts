#!/usr/bin/env tsx
/**
 * HAA Tokens Validator
 *
 * 1.  Validate JSON against schema
 * 2.  WCAG contrast check for all color pairs
 * 3.  Spacing values are multiples of 8
 * 4.  Corner radii match Apple values
 * 5.  Color blindness simulation (protanopia, deuteranopia, tritanopia)
 * 6.  Touch target minimum (44pt)
 * 7.  Report all issues
 *
 * Exit code: 0 = pass, 1 = fail
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

const SOURCE_DIR = path.resolve(import.meta.dirname, '../source')

interface ValidationResult {
  pass: boolean
  errors: string[]
  warnings: string[]
}

interface MotionConfig {
  easing?: string
}

function isMotionConfig(value: unknown): value is MotionConfig {
  return typeof value === 'object' && value !== null
}

// Simple WCAG relative luminance calculation (sRGB)
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const rsRGB = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gsRGB = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bsRGB = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function meetsAA(hex1: string, hex2: string): boolean {
  return contrastRatio(hex1, hex2) >= 4.5
}

function meetsAAA(hex1: string, hex2: string): boolean {
  return contrastRatio(hex1, hex2) >= 7.0
}

// Simple color blindness simulation (LMS-based approximation)
function simulateColorBlindness(hex: string, type: 'protanopia' | 'deuteranopia' | 'tritanopia'): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  let r2: number, g2: number, b2: number

  switch (type) {
    case 'protanopia':
      r2 = 0.567 * r + 0.433 * g
      g2 = 0.558 * r + 0.442 * g
      b2 = b
      break
    case 'deuteranopia':
      r2 = 0.625 * r + 0.375 * g
      g2 = 0.7 * r + 0.3 * g
      b2 = b
      break
    case 'tritanopia':
      r2 = r
      g2 = 0.95 * g + 0.05 * b
      b2 = 0.433 * g + 0.567 * b
      break
    default:
      return hex
  }

  const toHex = (v: number) => Math.round(Math.min(Math.max(v, 0), 255))
    .toString(16).padStart(2, '0')

  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`
}

// Apple expected corner radii
const APPLE_EXPECTED_RADII: Record<string, number[]> = {
  'micro': [5.5],
  'macBtn': [6],
  'md': [12],
  'iosBtn': [14],
  'iosIcon': [20.5],
  'visionOs': [28],
  'pill': [9999],
}

function isMultipleOf8(value: number): boolean {
  return value % 8 === 0
}

async function main(): Promise<number> {
  console.log('\n🔍 Validating HAA Design Tokens...\n')

  const result: ValidationResult = { pass: true, errors: [], warnings: [] }

  // 1. Load tokens
  const tokensPath = path.join(SOURCE_DIR, 'tokens.json')
  if (!fs.existsSync(tokensPath)) {
    result.errors.push('tokens.json not found')
    return report(result)
  }

  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'))

  // 2. Schema check (basic structural validation)
  if (!tokens.version) {
    result.errors.push('Missing version field')
  }
  if (!tokens.color?.primary) {
    result.errors.push('Missing color.primary')
  }
  if (!tokens.color?.neutral) {
    result.errors.push('Missing color.neutral')
  }
  if (!tokens.color?.semantic) {
    result.errors.push('Missing color.semantic')
  }
  if (!tokens.typography?.typeScale) {
    result.errors.push('Missing typography.typeScale')
  }
  if (!tokens.spacing) {
    result.errors.push('Missing spacing')
  }

  // 3. Spacing — multiple of 8 check
  console.log('  Checking spacing (8pt grid)...')
  const SKIP_KEYS = new Set(['description', 'why'])
  for (const [key, value] of Object.entries(tokens.spacing)) {
    if (SKIP_KEYS.has(key)) continue
    const v = (value as any).value
    if (v !== undefined && v !== 0 && !isMultipleOf8(v)) {
      result.errors.push(`spacing.${key}: ${v}px is not a multiple of 8`)
    }
  }

  // 4. Corner radii — check against Apple values
  console.log('  Checking corner radii (Apple values)...')
  for (const [name, expectedValues] of Object.entries(APPLE_EXPECTED_RADII)) {
    if (tokens.cornerRadius?.[name]) {
      const actual = (tokens.cornerRadius[name] as any).value
      if (!expectedValues.includes(actual)) {
        result.warnings.push(
          `cornerRadius.${name}: ${actual}px (expected ${expectedValues.join(' or ')}px)`
        )
      }
    }
  }

  // 5. Contrast check — WCAG AA/AAA
  console.log('  Checking WCAG contrast...')

  const SEMANTIC_KEYS = new Set(['description'])

  // Check text contrast (needs 4.5:1 AA)
  const checkTextContrast = (name: string, text: string, bg: string) => {
    const ratio = contrastRatio(text, bg)
    if (!meetsAA(text, bg)) {
      result.errors.push(`${name}: text ${text} on ${bg} = ${ratio.toFixed(1)}:1 — fails AA (4.5)`)
    } else if (!meetsAAA(text, bg)) {
      result.warnings.push(`${name}: text ${text} on ${bg} = ${ratio.toFixed(1)}:1 — fails AAA (7.0)`)
    }
  }

  // Check UI element contrast (needs 3:1 AA)
  const checkUIContrast = (name: string, element: string, bg: string) => {
    const ratio = contrastRatio(element, bg)
    if (ratio < 3.0) {
      result.errors.push(`${name}: UI ${element} on ${bg} = ${ratio.toFixed(1)}:1 — fails UI AA (3.0)`)
    } else if (ratio < 4.5) {
      result.warnings.push(`${name}: UI ${element} on ${bg} = ${ratio.toFixed(1)}:1 — passes UI but fails text AA (4.5)`)
    }
  }

  // Neutral text on white background (text contrast)
  if (tokens.color?.neutral?.['900']) {
    checkTextContrast('neutral.900 text on white', tokens.color.neutral['900'].srgb, '#ffffff')
  }
  if (tokens.color?.neutral?.['950']) {
    checkTextContrast('neutral.950 text on white', tokens.color.neutral['950'].srgb, '#ffffff')
  }

  // Primary button colors (UI elements with white text)
  // The color itself needs 3:1 against bg, and white text needs 4.5:1 against the color
  if (tokens.color?.primary?.['500']) {
    checkUIContrast('primary.500 button on white', tokens.color.primary['500'].srgb, '#ffffff')
    // White text on primary.500 button
    checkTextContrast('white text on primary.500', '#ffffff', tokens.color.primary['500'].srgb)
  }
  if (tokens.color?.primary?.['600']) {
    checkUIContrast('primary.600 button on white', tokens.color.primary['600'].srgb, '#ffffff')
    checkTextContrast('white text on primary.600', '#ffffff', tokens.color.primary['600'].srgb)
  }

  // Semantic colors — use declared textOnLight / textOnDark when available
  for (const [name, value] of Object.entries(tokens.color?.semantic || {})) {
    if (SEMANTIC_KEYS.has(name)) continue
    const v = value as any
    if (v.light?.srgb) {
      checkUIContrast(`semantic.${name} (light) on white`, v.light.srgb, '#ffffff')
      const lightText = v.textOnLight || '#ffffff'
      checkTextContrast(`${lightText} text on semantic.${name} (light)`, lightText, v.light.srgb)
    }
    if (v.dark?.srgb) {
      checkUIContrast(`semantic.${name} (dark) on black`, v.dark.srgb, '#0a0a0a')
      const darkText = v.textOnDark || '#ffffff'
      checkTextContrast(`${darkText} text on semantic.${name} (dark)`, darkText, v.dark.srgb)
    }
  }

  // 6. Color blindness simulation
  console.log('  Simulating color blindness...')
  const cbTypes = ['protanopia', 'deuteranopia', 'tritanopia'] as const

  for (const cbType of cbTypes) {
    for (const [name, value] of Object.entries(tokens.color?.semantic || {})) {
      if (SEMANTIC_KEYS.has(name)) continue
      const v = value as any
      if (v.light?.srgb) {
        const simulated = simulateColorBlindness(v.light.srgb, cbType)
        const ratio = contrastRatio(simulated, '#ffffff')
        if (ratio < 3.0) {
          result.warnings.push(
            `${cbType}: ${name} (${v.light.srgb}) simulated=${simulated} contrast=${ratio.toFixed(1)}:1 on white`
          )
        }
        // Check if colors become indistinguishable from each other
        for (const [otherName, otherValue] of Object.entries(tokens.color?.semantic || {})) {
          if (SEMANTIC_KEYS.has(otherName) || otherName <= name) continue
          const ov = otherValue as any
          if (ov.light?.srgb) {
            const otherSimulated = simulateColorBlindness(ov.light.srgb, cbType)
            const betweenRatio = contrastRatio(simulated, otherSimulated)
            if (betweenRatio < 1.5) {
              result.warnings.push(
                `${cbType}: ${name} & ${otherName} become nearly identical (ratio=${betweenRatio.toFixed(1)}:1, ${simulated} vs ${otherSimulated})`
              )
            }
          }
        }
      }
    }
  }

  // 7. Check theme files exist and have correct structure
  console.log('  Checking theme files...')
  const themeFiles = ['light.json', 'dark.json', 'high-contrast.json']
  for (const file of themeFiles) {
    const filePath = path.join(SOURCE_DIR, 'themes', file)
    if (!fs.existsSync(filePath)) {
      result.errors.push(`Missing theme file: themes/${file}`)
    } else {
      const theme = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      if (!theme.theme?.surface) {
        result.errors.push(`${file}: missing theme.surface`)
      }
      if (!theme.theme?.text) {
        result.errors.push(`${file}: missing theme.text`)
      }
    }
  }

  // 8. Check touch target minimum
  if (tokens.touchTarget?.default?.value !== 44) {
    result.warnings.push(
      `touchTarget.default: ${tokens.touchTarget?.default?.value}pt (should be 44pt per Apple HIG)`
    )
  }

  // 9. Check that motion entries reference valid easings
  console.log('  Checking motion choreography...')
  const validEasings = Object.keys(tokens.easing || {}).map(k => toCamelCase(k))
  if (tokens.motion) {
    for (const [component, actions] of Object.entries(tokens.motion)) {
      for (const [action, config] of Object.entries(actions as any)) {
        if (isMotionConfig(config) && config.easing && !validEasings.includes(config.easing)) {
          result.warnings.push(
            `motion.${component}.${action}: unknown easing "${config.easing}"`
          )
        }
      }
    }
  }

  // 10. Check accessibility settings
  if (tokens.accessibility?.contrast?.aa < 4.5) {
    result.errors.push(
      `Accessibility contrast AA threshold: ${tokens.accessibility.contrast.aa} (must be ≥ 4.5)`
    )
  }

  return report(result)
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function report(result: ValidationResult): number {
  if (result.errors.length > 0) {
    console.log(`\n❌ ${result.errors.length} error(s):`)
    for (const err of result.errors) {
      console.log(`   ✗ ${err}`)
    }
    result.pass = false
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  ${result.warnings.length} warning(s):`)
    for (const warn of result.warnings) {
      console.log(`   ⚠ ${warn}`)
    }
  }

  if (result.pass) {
    console.log('\n✅ All checks passed!')
  } else {
    console.log('\n❌ Validation failed.')
  }

  console.log()
  return result.pass ? 0 : 1
}

process.exit(await main())
