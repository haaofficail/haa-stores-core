#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as path from 'node:path'

const SOURCE_DIR = path.resolve(import.meta.dirname, '../source')
const OUTPUT_DIR = path.resolve(import.meta.dirname, '../output/swift')
const SOURCES_DIR = path.join(OUTPUT_DIR, 'Sources/HAATheme')

const WATCH_FLAG = process.argv.includes('--watch')

function hexToComponents(hex: string): { red: number; green: number; blue: number } {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return { red: r, green: g, blue: b }
}

function formatFloat(n: number): string {
  if (Number.isInteger(n)) return `${n}.0`
  return parseFloat(n.toFixed(4)).toString()
}

function colorInit(hex: string): string {
  const { red, green, blue } = hexToComponents(hex)
  return `UIColor(red: ${formatFloat(red)}, green: ${formatFloat(green)}, blue: ${formatFloat(blue)}, alpha: 1.0)`
}

function dynamicColor(lightHex: string, darkHex: string): string {
  const lightInit = colorInit(lightHex)
  const darkInit = colorInit(darkHex)
  return [
    `UIColor { traitCollection in`,
    `    switch traitCollection.userInterfaceStyle {`,
    `    case .dark: return ${darkInit}`,
    `    default: return ${lightInit}`,
    `    }`,
    `  }`,
  ].join('\n    ')
}

function nsColorInit(hex: string): string {
  const { red, green, blue } = hexToComponents(hex)
  return `NSColor(red: ${formatFloat(red)}, green: ${formatFloat(green)}, blue: ${formatFloat(blue)}, alpha: 1.0)`
}

function dynamicNSColor(lightHex: string, darkHex: string): string {
  return `NSColor(name: nil) { appearance in\n      appearance.name == .darkAqua ? ${nsColorInit(darkHex)} : ${nsColorInit(lightHex)}\n    }`
}

interface Tokens {
  color: {
    primary: Record<string, { srgb: string }>
    neutral: Record<string, { srgb: string }>
    semantic: Record<string, {
      light: { srgb: string }
      dark: { srgb: string }
      textOnLight: string
      textOnDark: string
    }>
    platform: {
      ios: Record<string, { srgb: string }>
      macos: Record<string, { srgb: string }>
    }
  }
  typography: {
    typeScale: Record<string, { size: number; fontWeight: number; lineHeight: number; letterSpacing: number }>
  }
  spacing: Record<string, { value: number }>
  cornerRadius: Record<string, { value: number }>
  [key: string]: any
}

function readTokens(): Tokens {
  return JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, 'tokens.json'), 'utf-8'))
}

function writeSwiftFile(filename: string, content: string): void {
  const dir = path.dirname(path.join(SOURCES_DIR, filename))
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(path.join(SOURCES_DIR, filename), content, 'utf-8')
  console.log(`  ✓ ${filename}`)
}

function writeOutputFile(filename: string, content: string): void {
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), content, 'utf-8')
  console.log(`  ✓ ${filename}`)
}

function buildColorFile(tokens: Tokens): string {
  const lines: string[] = [
    '#if canImport(UIKit)',
    'import UIKit',
    '#elseif canImport(AppKit)',
    'import AppKit',
    '#endif',
    '',
    'public struct HAAColor {',
  ]

  // Primary palette
  lines.push('')
  lines.push('  // MARK: - Primary Palette')
  for (const [weight, value] of Object.entries(tokens.color.primary)) {
    if (typeof value === 'object' && 'srgb' in value) {
      const hex = (value as { srgb: string }).srgb
      lines.push(`  public static let primary${weight} = ${colorInit(hex)}`)
    }
  }

  // Neutral palette
  lines.push('')
  lines.push('  // MARK: - Neutral Palette')
  for (const [weight, value] of Object.entries(tokens.color.neutral)) {
    if (typeof value === 'object' && 'srgb' in value) {
      const hex = (value as { srgb: string }).srgb
      lines.push(`  public static let neutral${weight} = ${colorInit(hex)}`)
    }
  }

  // Semantic colors
  lines.push('')
  lines.push('  // MARK: - Semantic Colors')
  for (const [name, value] of Object.entries(tokens.color.semantic)) {
    const v = value as any
    if (typeof v !== 'object' || !v.light) continue

    const lightHex = v.light.srgb
    const darkHex = v.dark.srgb

    // The main semantic color - dynamic
    lines.push('')
    lines.push(`  public static let ${name}: UIColor = {`)
    lines.push(`    ${dynamicColor(lightHex, darkHex)}`)
    lines.push('  }()')

    // Subtle variant
    if (v.subtle?.light && v.subtle?.dark) {
      const subtleLight = v.subtle.light.startsWith('#') ? v.subtle.light : null
      const subtleDark = v.subtle.dark.startsWith('#') ? v.subtle.dark : null
      if (subtleLight && subtleDark) {
        lines.push('')
        lines.push(`  public static let ${name}Subtle: UIColor = {`)
        lines.push(`    ${dynamicColor(subtleLight, subtleDark)}`)
        lines.push('  }()')
      }
    }

    // Text on light - fixed color
    if (v.textOnLight) {
      lines.push(`  public static let ${name}TextOnLight = ${colorInit(v.textOnLight)}`)
    }
    if (v.textOnDark) {
      lines.push(`  public static let ${name}TextOnDark = ${colorInit(v.textOnDark)}`)
    }

    // Computed textColor property
    lines.push('')
    lines.push(`  public static var ${name}TextColor: UIColor {`)
    lines.push(`    UIColor { traitCollection in`)
    lines.push(`      switch traitCollection.userInterfaceStyle {`)
    lines.push(`      case .dark: return ${colorInit(v.textOnDark || '#0a0a0a')}`)
    lines.push(`      default: return ${colorInit(v.textOnLight || '#ffffff')}`)
    lines.push(`      }`)
    lines.push(`    }`)
    lines.push('  }')
  }

  // Platform colors
  lines.push('')
  lines.push('  // MARK: - Platform Colors')
  lines.push('')
  lines.push('  public enum Platform {')
  lines.push('')
  lines.push('#if canImport(UIKit)')
  lines.push('    public enum iOS {')
  for (const [name, value] of Object.entries(tokens.color.platform.ios)) {
    lines.push(`      public static let ${name} = ${colorInit(value.srgb)}`)
  }
  lines.push('    }')
  lines.push('#endif')
  lines.push('')
  lines.push('#if canImport(AppKit)')
  lines.push('    public enum macOS {')
  for (const [name, value] of Object.entries(tokens.color.platform.macos)) {
    lines.push(`      public static let ${name} = ${nsColorInit(value.srgb)}`)
  }
  lines.push('    }')
  lines.push('#endif')
  lines.push('  }')

  lines.push('')
  lines.push('}')

  return lines.join('\n')
}

function buildTypographyFile(tokens: Tokens): string {
  const typeScale = tokens.typography.typeScale
  const fontWeightMap: Record<number, string> = {
    400: '.regular',
    500: '.medium',
    600: '.semibold',
    700: '.bold',
  }

  const lines: string[] = [
    '#if canImport(UIKit)',
    'import UIKit',
    '#elseif canImport(AppKit)',
    'import AppKit',
    '#endif',
    '',
    'public enum HAATypography: CaseIterable {',
  ]

  // Cases with sizes
  for (const [name] of Object.entries(typeScale)) {
    const caseName = name.charAt(0).toLowerCase() + name.slice(1)
    lines.push(`  case ${caseName}`)
  }

  lines.push('')
  lines.push('  // MARK: - Properties')
  lines.push('')

  // Size
  lines.push('  public var pointSize: CGFloat {')
  lines.push('    switch self {')
  for (const [name, value] of Object.entries(typeScale)) {
    const caseName = name.charAt(0).toLowerCase() + name.slice(1)
    lines.push(`    case .${caseName}: return ${value.size}`)
  }
  lines.push('    }')
  lines.push('  }')

  // Weight
  lines.push('')
  lines.push('  public var weight: UIFont.Weight {')
  lines.push('    switch self {')
  for (const [name, value] of Object.entries(typeScale)) {
    const caseName = name.charAt(0).toLowerCase() + name.slice(1)
    const w = fontWeightMap[value.fontWeight] || '.regular'
    lines.push(`    case .${caseName}: return ${w}`)
  }
  lines.push('    }')
  lines.push('  }')

  // Font descriptor
  lines.push('')
  lines.push('  public var fontDescriptor: UIFontDescriptor {')
  lines.push('    let traits: [UIFontDescriptor.TraitKey: Any] = [')
  lines.push('      .weight: weight,')
  lines.push('    ]')
  lines.push('    return UIFontDescriptor(name: nil, size: pointSize)')
  lines.push('      .addingAttributes([')
  lines.push('        .traits: traits,')
  lines.push('      ])')
  lines.push('  }')

  // Dynamic Type text style mapping
  const textStyleMap: Record<string, string> = {
    largeTitle: '.largeTitle',
    title1: '.title1',
    title2: '.title2',
    title3: '.title3',
    headline: '.headline',
    body: '.body',
    callout: '.callout',
    subhead: '.subheadline',
    footnote: '.footnote',
    caption1: '.caption1',
    caption2: '.caption2',
  }

  lines.push('')
  lines.push('  public var textStyle: UIFont.TextStyle {')
  lines.push('    switch self {')
  for (const [name] of Object.entries(typeScale)) {
    const caseName = name.charAt(0).toLowerCase() + name.slice(1)
    const ts = textStyleMap[name] || '.body'
    lines.push(`    case .${caseName}: return ${ts}`)
  }
  lines.push('    }')
  lines.push('  }')

  // Font method
  lines.push('')
  lines.push('  // MARK: - Font Creation')
  lines.push('')
  lines.push('  public static func font(for textStyle: HAATypography, with traitCollection: UITraitCollection? = nil) -> UIFont {')
  lines.push('    let baseFont = UIFont(descriptor: textStyle.fontDescriptor, size: textStyle.pointSize)')
  lines.push('    let metrics = UIFontMetrics(forTextStyle: textStyle.textStyle)')
  lines.push('    if let traitCollection {')
  lines.push('      return metrics.scaledFont(for: baseFont, compatibleWith: traitCollection)')
  lines.push('    }')
  lines.push('    return metrics.scaledFont(for: baseFont)')
  lines.push('  }')

  lines.push('')
  lines.push('}')

  return lines.join('\n')
}

function buildSpacingFile(tokens: Tokens): string {
  const SKIP_KEYS = new Set(['description', 'why'])

  const entries: [string, number][] = []
  for (const [key, value] of Object.entries(tokens.spacing)) {
    if (SKIP_KEYS.has(key)) continue
    const v = value as { value: number }
    entries.push([key, v.value])
  }

  const lines: string[] = [
    '#if canImport(CoreGraphics)',
    'import CoreGraphics',
    '#endif',
    '',
    'public struct HAASpacing {',
  ]

  for (const [key, val] of entries) {
    lines.push(`  public static let s${key}: CGFloat = ${formatFloat(val)}`)
  }

  lines.push('')
  lines.push('  public static subscript(_ value: Int) -> CGFloat {')
  lines.push('    switch value {')
  for (const [key] of entries) {
    lines.push(`    case ${key}: return s${key}`)
  }
  lines.push('    default: return 0')
  lines.push('    }')
  lines.push('  }')

  lines.push('')
  lines.push('  private init() {}')
  lines.push('}')

  return lines.join('\n')
}

function buildRadiusFile(tokens: Tokens): string {
  const SKIP_KEYS = new Set(['description', 'why'])

  const lines: string[] = [
    '#if canImport(CoreGraphics)',
    'import CoreGraphics',
    '#endif',
    '',
    'public struct HAARadius {',
  ]

  for (const [name, value] of Object.entries(tokens.cornerRadius)) {
    if (SKIP_KEYS.has(name)) continue
    const v = value as { value: number }
    lines.push(`  public static let ${name}: CGFloat = ${formatFloat(v.value)}`)
  }

  lines.push('')
  lines.push('  private init() {}')
  lines.push('}')

  return lines.join('\n')
}

function buildPackageSwift(): string {
  return `// swift-tools-version:5.7
import PackageDescription

let package = Package(
  name: "HAATheme",
  defaultLocalization: "en",
  platforms: [
    .iOS(.v15),
    .macOS(.v12),
    .visionOS(.v1),
    .tvOS(.v15),
  ],
  products: [
    .library(
      name: "HAATheme",
      targets: ["HAATheme"]
    ),
  ],
  targets: [
    .target(
      name: "HAATheme",
      path: "Sources/HAATheme"
    ),
  ]
)
`
}

function buildReadme(): string {
  return `# HAATheme

HAA Design System — Swift token package.

## Installation

### Swift Package Manager

Add to your \`Package.swift\`:

\`\`\`swift
dependencies: [
  .package(path: "path/to/tokens/output/swift")
]
\`\`\`

Or add via Xcode: \`File → Add Packages…\` → \`Add Local…\`

## Usage

### Colors

\`\`\`swift
import HAATheme

// Primary palette
view.backgroundColor = HAAColor.primary500

// Semantic colors
button.tintColor = HAAColor.success
label.textColor = HAAColor.successTextColor  // adapts to light/dark

// Platform-specific
#if canImport(UIKit)
view.tintColor = HAAColor.Platform.iOS.blue
#elseif canImport(AppKit)
view.layer?.backgroundColor = HAAColor.Platform.macOS.blue.cgColor
#endif
\`\`\`

### Typography

\`\`\`swift
import HAATheme

// With Dynamic Type scaling
let font = HAATypography.font(for: .headline)

let label = UILabel()
label.font = HAATypography.font(for: .title1, with: traitCollection)
\`\`\`

### Spacing

\`\`\`swift
import HAATheme

// Direct property access
let spacing = HAASpacing.s2  // 16pt

// Subscript access
stackView.spacing = HAASpacing[2]  // 16pt
contentView.layoutMargins = UIEdgeInsets(
  top: HAASpacing[3],    // 24pt
  left: HAASpacing[4],   // 32pt
  bottom: HAASpacing[3],
  right: HAASpacing[4]
)
\`\`\`

### Corner Radius

\`\`\`swift
import HAATheme

button.layer.cornerRadius = HAARadius.md  // 12pt
card.layer.cornerRadius = HAARadius.lg   // 20pt
\`\`\`

## Requirements

- iOS 15.0+
- macOS 12.0+
- visionOS 1.0+
- tvOS 15.0+
`
}

export function buildSwift(): void {
  console.log('\n🔨 Building Swift tokens...\n')

  if (WATCH_FLAG) {
    console.log('  ⚠️  Watch mode is not yet implemented. Exiting.\n')
    return
  }

  if (!fs.existsSync(SOURCES_DIR)) {
    fs.mkdirSync(SOURCES_DIR, { recursive: true })
  }

  const tokens = readTokens()

  writeSwiftFile('HAAColor.swift', buildColorFile(tokens))
  writeSwiftFile('HAATypography.swift', buildTypographyFile(tokens))
  writeSwiftFile('HAASpacing.swift', buildSpacingFile(tokens))
  writeSwiftFile('HAARadius.swift', buildRadiusFile(tokens))

  writeOutputFile('Package.swift', buildPackageSwift())
  writeOutputFile('README.md', buildReadme())

  console.log(`\n✅ Done — 6 files written to ${OUTPUT_DIR}\n`)
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  buildSwift()
}
