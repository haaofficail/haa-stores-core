#!/usr/bin/env tsx

import * as fs from 'node:fs'
import * as path from 'node:path'

const SOURCE_DIR = path.resolve(import.meta.dirname, '../source')
const OUTPUT_DIR = path.resolve(import.meta.dirname, '../output/css')

interface Tokens {
  version: string
  color: Record<string, any>
  typography: Record<string, any>
  spacing: Record<string, any>
  cornerRadius: Record<string, any>
  shadow: Record<string, any>
  borderWidth: Record<string, any>
  opacity: Record<string, any>
  easing: Record<string, any>
  zIndex: Record<string, any>
  gradient: Record<string, any>
  breakpoint: Record<string, any>
  duration: Record<string, any>
  touchTarget: Record<string, any>
  material: Record<string, any>
  accessibility: Record<string, any>
  [key: string]: any
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function writeCss(filename: string, content: string): void {
  const filePath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✓ ${filename}`)
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

const SKIP_KEYS = new Set(['description', 'why'])

interface TypeScaleToken {
  size: number
  fontWeight: number | string
  lineHeight: number
  letterSpacing?: number
}

function isTypeScaleToken(value: unknown): value is TypeScaleToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    'size' in value &&
    'fontWeight' in value &&
    'lineHeight' in value
  )
}

function buildColors(tokens: Tokens): string {
  let css = ':root {\n'

  css += '  /* Primary Palette */\n'
  for (const [weight, value] of Object.entries(tokens.color.primary)) {
    if (typeof value === 'object' && value !== null && 'srgb' in value) {
      css += `  --color-primary-${weight}: ${value.srgb};\n`
    }
  }

  css += '\n  /* Neutral Palette */\n'
  for (const [weight, value] of Object.entries(tokens.color.neutral)) {
    if (typeof value === 'object' && value !== null && 'srgb' in value) {
      css += `  --color-neutral-${weight}: ${value.srgb};\n`
    }
  }

  css += '\n  /* Semantic Colors */\n'
  for (const [name, value] of Object.entries(tokens.color.semantic)) {
    if (name === 'description' || name === 'why') continue
    const v = value as any
    if (v.light?.srgb) {
      css += `  --color-${name}: ${v.light.srgb};\n`
      if (v.textOnLight) css += `  --color-${name}-text: ${v.textOnLight};\n`
      if (v.subtle?.light) css += `  --color-${name}-subtle: ${v.subtle.light};\n`
    }
  }

  css += '}\n'

  css += '\n[data-theme="dark"] {\n'
  css += '  /* Neutral Palette — inverted for dark mode */\n'
  const neutralEntries = Object.entries(tokens.color.neutral).filter(([_k, v]) => typeof v === 'object' && 'srgb' in (v as any))
  const neutralKeys = neutralEntries.map(([k]) => k).filter(k => k !== 'description' && k !== 'why')
  // Invert neutral palette: 50↔950, 100↔900, etc.
  for (const key of neutralKeys) {
    const invertedKey = String(1000 - Number(key))
    const inverted = tokens.color.neutral[invertedKey]
    if (inverted?.srgb) {
      css += `  --color-neutral-${key}: ${inverted.srgb};\n`
    }
  }
  css += '\n'
  for (const [name, value] of Object.entries(tokens.color.semantic)) {
    if (name === 'description' || name === 'why') continue
    const v = value as any
    if (v.dark?.srgb) {
      css += `  --color-${name}: ${v.dark.srgb};\n`
      if (v.textOnDark) css += `  --color-${name}-text: ${v.textOnDark};\n`
      if (v.subtle?.dark) css += `  --color-${name}-subtle: ${v.subtle.dark};\n`
    }
  }
  css += '}\n'

  return css
}

function buildTypography(tokens: Tokens): string {
  const t = tokens.typography
  let css = ':root {\n'
  css += '  /* Typography — SF Scale */\n'

  css += `  --font-sans: ${t.fontFamily.sans};\n`
  css += `  --font-sans-arabic: ${t.fontFamily.sansArabic};\n`
  css += `  --font-mono: ${t.fontFamily.mono};\n`

  for (const [name, value] of Object.entries(t.fontWeight)) {
    css += `  --font-${name}: ${value};\n`
  }

  css += '\n  /* Type Scale */\n'
  for (const [name, value] of Object.entries(t.typeScale)) {
    if (!isTypeScaleToken(value)) continue
    const kebab = toKebabCase(name)
    css += `  --typography-${kebab}-size: ${value.size}px;\n`
    css += `  --typography-${kebab}-font-weight: ${value.fontWeight};\n`
    css += `  --typography-${kebab}-line-height: ${value.lineHeight}px;\n`
    if (value.letterSpacing !== undefined) {
      css += `  --typography-${kebab}-letter-spacing: ${value.letterSpacing}px;\n`
    }
  }

  css += '\n  /* Line Heights */\n'
  css += '  --leading-tight: 1.15;\n'
  css += '  --leading-normal: 1.4;\n'
  css += '  --leading-relaxed: 1.6;\n'

  css += '}\n'
  return css
}

function buildSpacing(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* 8pt Grid Spacing */\n'
  for (const [key, value] of Object.entries(tokens.spacing)) {
    if (SKIP_KEYS.has(key)) continue
    const sv = value.value
    css += `  --spacing-${key}: ${sv === 0 ? '0' : sv + 'px'};\n`
  }
  css += '\n  /* Gap */\n'
  for (const [key] of Object.entries(tokens.spacing)) {
    if (SKIP_KEYS.has(key)) continue
    if (key !== '0') {
      css += `  --gap-${key}: var(--spacing-${key});\n`
    }
  }
  css += '}\n'
  return css
}

function buildRadius(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Corner Radii — Apple Values */\n'
  for (const [name, value] of Object.entries(tokens.cornerRadius)) {
    if (SKIP_KEYS.has(name)) continue
    css += `  --radius-${toKebabCase(name)}: ${(value as any).value}px;\n`
  }
  css += '}\n'
  return css
}

function buildShadows(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Shadows — Elevation Levels */\n'
  for (const [name, value] of Object.entries(tokens.shadow)) {
    if (SKIP_KEYS.has(name)) continue
    const v = value as any
    css += `  --shadow-${name}: ${v.value};\n`
  }
  css += '}\n'

  css += '\n[data-theme="dark"] {\n'
  for (const [name, value] of Object.entries(tokens.shadow)) {
    if (SKIP_KEYS.has(name)) continue
    const v = value as any
    if (v.dark) {
      css += `  --shadow-${name}: ${v.dark};\n`
    }
  }
  css += '}\n'

  return css
}

function buildBorders(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Border Widths */\n'
  for (const [key, value] of Object.entries(tokens.borderWidth)) {
    if (SKIP_KEYS.has(key)) continue
    const val = (value as any).value
    css += `  --border-${key}: ${val === 0 ? '0' : val + 'px'};\n`
  }
  css += '}\n'
  return css
}

function buildOpacity(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Opacity Scale */\n'
  for (const [key, value] of Object.entries(tokens.opacity)) {
    if (SKIP_KEYS.has(key)) continue
    css += `  --opacity-${key}: ${(value as any).value};\n`
  }
  css += '}\n'
  return css
}

function buildEasing(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Easing — Apple Springs */\n'
  for (const [name, value] of Object.entries(tokens.easing)) {
    if (SKIP_KEYS.has(name)) continue
    const v = value as any
    css += `  --ease-${toKebabCase(name)}: ${v.value};\n`
  }
  css += '}\n'
  return css
}

function buildZIndex(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Z-Index Scale */\n'
  for (const [name, value] of Object.entries(tokens.zIndex)) {
    if (SKIP_KEYS.has(name)) continue
    css += `  --z-${name}: ${(value as any).value};\n`
  }
  css += '}\n'
  return css
}

function buildGradients(tokens: Tokens): string {
  let css = ':root {\n'
  css += '  /* Gradient Presets */\n'
  for (const [name, value] of Object.entries(tokens.gradient)) {
    if (SKIP_KEYS.has(name)) continue
    css += `  --gradient-${toKebabCase(name)}: ${(value as any).value};\n`
  }
  css += '}\n'
  return css
}

function buildThemeVars(theme: any): string {
  let css = ''

  if (theme.theme?.surface) {
    for (const [key, value] of Object.entries(theme.theme.surface)) {
      css += `  --surface-${key}: ${(value as any).value};\n`
    }
  }

  if (theme.theme?.text) {
    for (const [key, value] of Object.entries(theme.theme.text)) {
      const name = toKebabCase(key)
      css += `  --text-${name}: ${(value as any).value};\n`
    }
  }

  if (theme.theme?.border) {
    for (const [key, value] of Object.entries(theme.theme.border)) {
      css += `  --border-${key}: ${(value as any).value};\n`
    }
  }

  if (theme.theme?.divider) {
    css += `  --divider: ${theme.theme.divider.value};\n`
  }

  if (theme.theme?.shadow) {
    for (const [key, value] of Object.entries(theme.theme.shadow)) {
      css += `  --shadow-${key}: ${(value as any).value};\n`
    }
  }

  if (theme.theme?.backdrop) {
    css += `  --backdrop-opacity: ${theme.theme.backdrop.opacity};\n`
    css += `  --backdrop-blur: ${theme.theme.backdrop.blur}px;\n`
    css += `  --backdrop-color: ${theme.theme.backdrop.color.value};\n`
  }

  if (theme.theme?.selection) {
    css += `  --selection-bg: ${theme.theme.selection.background.value};\n`
    css += `  --selection-text: ${theme.theme.selection.text.value};\n`
  }

  if (theme.theme?.placeholder) {
    css += `  --placeholder-text: ${theme.theme.placeholder.text.value};\n`
  }

  return css
}

function buildThemeCSS(tokens: Tokens, theme: any, selector: string): string {
  return `/* ${theme.description || 'Theme'} */\n${selector} {\n${buildThemeVars(theme)}}\n`
}

function buildMaterials(tokens: Tokens): string {
  let css = '/* Materials — Glass Levels */\n'

  for (const [name, value] of Object.entries(tokens.material)) {
    if (SKIP_KEYS.has(name)) continue
    const v = value as any
    if (v.lightBackground && v.blur) {
      const className = `material-${toKebabCase(name)}`
      css += `.${className} {\n`
      css += `  background: ${v.lightBackground};\n`
      css += `  backdrop-filter: blur(${v.blur}px);\n`
      css += `  -webkit-backdrop-filter: blur(${v.blur}px);\n`
      if (v.border) {
        css += `  border: ${v.border};\n`
      }
      css += '}\n\n'

      css += `[data-theme="dark"] .${className} {\n`
      if (v.darkBackground) {
        css += `  background: ${v.darkBackground};\n`
      }
      css += '}\n\n'
    }
  }

  return css
}

function buildSafeAreas(): string {
  return `:root {
  /* Safe Areas */
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);

  /* Touch Target Minimum */
  --touch-target-min: ${44}px;
  --touch-target-min-sm: ${32}px;
}
`
}

function buildAccessibility(tokens: Tokens): string {
  const a11y = tokens.accessibility
  let css = ':root {\n'
  css += '  /* Accessibility */\n'

  for (const [key, value] of Object.entries(a11y.dynamicType)) {
    css += `  --dynamic-type-${key}: ${value};\n`
  }

  css += `  --contrast-aa: ${a11y.contrast.aa};\n`
  css += `  --contrast-aaa: ${a11y.contrast.aaa};\n`
  css += `  --contrast-ui: ${a11y.contrast.ui};\n`
  css += '}\n'

  css += `
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  [class*="material-"] {
    background: var(--surface-2) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}

@media (prefers-contrast: more) {
  :root {
    --text-primary: #000;
    --border-default: #666;
  }
  [data-theme="dark"] {
    --text-primary: #fff;
    --border-default: #aaa;
  }
}

[data-theme="high-contrast"] {
  --text-primary: #000;
  --border-default: #666;
}
`

  return css
}

function buildReset(): string {
  return `/* CSS Reset — Apple-style */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--surface-1);
}

body {
  min-height: 100vh;
  min-height: 100dvh;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  border: none;
  background: none;
}

/* Anchors:
   - Bare anchors (in-content links — body text, policies, support
     pages, signup forms) inherit the brand link color + underline
     on hover.
   - Anchors that already carry a Tailwind color/background utility
     (text-*, bg-*, from-*) opt OUT of these defaults. This stops
     sidebar NavLinks, dashboard pills, marketing CTAs, and any
     <Link> styled as a button from picking up the link color +
     underline on hover. Without this scope, every navigation link
     turned blue + underlined on hover — a UX regression caught in
     the merchant-dashboard live audit. */
a:not([class*="text-"]):not([class*="bg-"]):not([class*="from-"]) {
  color: var(--text-link);
  text-decoration: none;
}

a:not([class*="text-"]):not([class*="bg-"]):not([class*="from-"]):hover {
  color: var(--text-link-hover);
  text-decoration: underline;
}

:focus-visible {
  outline: 2px solid var(--border-focus, var(--color-primary-500));
  outline-offset: 2px;
  border-radius: var(--radius-md, 8px);
}

::selection {
  background: var(--selection-bg, var(--color-primary-100));
  color: var(--selection-text, inherit);
}

::placeholder {
  color: var(--placeholder-text);
}

*, *::before, *::after {
  transition:
    background-color 0.3s var(--ease-spring-smooth, ease),
    color 0.3s var(--ease-spring-smooth, ease),
    border-color 0.3s var(--ease-spring-smooth, ease),
    box-shadow 0.3s var(--ease-spring-smooth, ease);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
  }
}
`
}

function buildIndexCss(files: string[]): string {
  const imports = files.map(f => `@import './${f}';`).join('\n')
  return `/* HAA Design System — Tokens */
/* Auto-generated from source/tokens.json */
/* Do not edit directly */

${imports}
`
}

function main(): void {
  console.log('\n🔨 Building CSS tokens...\n')

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const tokens: Tokens = readJson(path.join(SOURCE_DIR, 'tokens.json'))
  const lightTheme = readJson(path.join(SOURCE_DIR, 'themes/light.json'))
  const darkTheme = readJson(path.join(SOURCE_DIR, 'themes/dark.json'))
  const highContrastTheme = readJson(path.join(SOURCE_DIR, 'themes/high-contrast.json'))

  writeCss('00-reset.css', buildReset())

  const cssBuilders: [string, () => string][] = [
    ['01-colors.css', () => buildColors(tokens)],
    ['02-typography.css', () => buildTypography(tokens)],
    ['03-spacing.css', () => buildSpacing(tokens)],
    ['04-radius.css', () => buildRadius(tokens)],
    ['05-shadows.css', () => buildShadows(tokens)],
    ['06-borders.css', () => buildBorders(tokens)],
    ['07-opacity.css', () => buildOpacity(tokens)],
    ['08-easing.css', () => buildEasing(tokens)],
    ['09-z-index.css', () => buildZIndex(tokens)],
    ['10-gradients.css', () => buildGradients(tokens)],
    ['11-materials.css', () => buildMaterials(tokens)],
    ['12-safe-areas.css', () => buildSafeAreas()],
    ['13-accessibility.css', () => buildAccessibility(tokens)],
  ]

  for (const [filename, builder] of cssBuilders) {
    const css = `/* HAA — ${filename.replace('.css', '')} */\n\n${builder()}`
    writeCss(filename, css)
  }

  writeCss('themes-light.css', '/* HAA — Light Theme */\n\n' + buildThemeCSS(tokens, lightTheme, ':root, [data-theme="light"]'))
  writeCss('themes-dark.css', '/* HAA — Dark Theme */\n\n' + buildThemeCSS(tokens, darkTheme, '[data-theme="dark"]'))

  const hcVars = buildThemeVars(highContrastTheme)
  writeCss('themes-high-contrast.css', `/* HAA — High Contrast */
@media (prefers-contrast: more) {
:root {
${hcVars}}
}
[data-theme="high-contrast"] {
${hcVars}}`)

  const allFiles = [
    '00-reset.css',
    ...cssBuilders.map(([f]) => f),
    'themes-light.css',
    'themes-dark.css',
    'themes-high-contrast.css',
  ]
  writeCss('index.css', buildIndexCss(allFiles))

  console.log(`\n✅ Done — ${allFiles.length + 1} files written to ${OUTPUT_DIR}\n`)
}

main()
