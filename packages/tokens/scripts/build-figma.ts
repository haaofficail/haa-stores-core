#!/usr/bin/env tsx
/**
 * HAA Tokens → Figma Variables Exporter
 *
 * Reads tokens.json + themes/*.json and produces a Figma-importable
 * variables JSON file with collections for:
 *   - Colors (primary, neutral, semantic, platform)
 *   - Typography
 *   - Spacing
 *   - Corner Radius
 *   - Shadows
 *   - Opacity
 *   - Easing
 *   - All themes (Light, Dark, High-Contrast)
 *
 * Usage:  npx tsx scripts/build-figma.ts
 * Output: output/figma/variables.json
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'

const SOURCE_DIR = path.resolve(import.meta.dirname, '../source')
const OUTPUT_DIR = path.resolve(import.meta.dirname, '../output/figma')

interface FigmaVariable {
  id: string
  name: string
  key: string
  variableCollectionId: string
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
  valuesByMode: Record<string, any>
  scopes: string[]
  description?: string
}

interface FigmaCollection {
  id: string
  name: string
  key: string
  modes: { modeId: string; name: string }[]
  defaultModeId: string
  remote: boolean
  variableIds: string[]
}

interface FigmaExport {
  version: string
  variableCollections: FigmaCollection[]
  variableModes: { id: string; name: string; collectionId: string }[]
  variables: FigmaVariable[]
}

function hexToRGBA(hex: string): { r: number; g: number; b: number; a: number } | null {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  if (hex.length !== 6 && hex.length !== 8) return null
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

function parseCSSColor(css: string): { r: number; g: number; b: number; a: number } | null {
  // Handle rgb() / rgba()
  const rgbMatch = css.match(/rgba?\((\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([0-9.]+))?\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]) / 255,
      g: parseInt(rgbMatch[2]) / 255,
      b: parseInt(rgbMatch[3]) / 255,
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    }
  }
  // Handle hex
  return hexToRGBA(css)
}

function nextId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`
}

function build() {
  console.log('\n🎨 Building Figma variables...\n')

  const tokensPath = path.join(SOURCE_DIR, 'tokens.json')
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'))

  // Load themes
  const themeDir = path.join(SOURCE_DIR, 'themes')
  const themes: Record<string, any> = {}
  for (const file of fs.readdirSync(themeDir).filter(f => f.endsWith('.json'))) {
    const name = file.replace('.json', '')
    themes[name] = JSON.parse(fs.readFileSync(path.join(themeDir, file), 'utf-8'))
  }

  // Collection IDs
  const COLOR_COLLECTION = nextId('col')
  const TYPOGRAPHY_COLLECTION = nextId('col')
  const SPACING_COLLECTION = nextId('col')
  const RADIUS_COLLECTION = nextId('col')
  const EASING_COLLECTION = nextId('col')
  const THEME_COLLECTION = nextId('col')

  const export_: FigmaExport = {
    version: '1.0.0',
    variableCollections: [],
    variableModes: [],
    variables: [],
  }

  // ── Modes ────────────────────────────────────────────
  const themeModeIds: Record<string, string> = {}

  const colorMode = nextId('mode')
  const typoMode = nextId('mode')
  const spacingMode = nextId('mode')
  const radiusMode = nextId('mode')
  const easingMode = nextId('mode')

  // ── COLORS Collection ────────────────────────────────
  const colorVariables: FigmaVariable[] = []
  const colorIds: string[] = []

  function addColorVar(name: string, srgb: string, desc?: string) {
    const rgba = hexToRGBA(srgb)
    if (!rgba) return
    const id = nextId('var')
    colorIds.push(id)
    colorVariables.push({
      id,
      name: `color/${name}`,
      key: randomUUID(),
      variableCollectionId: COLOR_COLLECTION,
      resolvedType: 'COLOR',
      valuesByMode: { [colorMode]: rgba },
      scopes: ['ALL_SCOPES'],
      description: desc,
    })
  }

  // Primary
  for (const [shade, value] of Object.entries(tokens.color.primary)) {
    if (shade === 'description' || shade === 'why') continue
    addColorVar(`primary/${shade}`, (value as any).srgb, tokens.color.primary.description)
  }

  // Neutral
  for (const [shade, value] of Object.entries(tokens.color.neutral)) {
    if (shade === 'description' || shade === 'why') continue
    addColorVar(`neutral/${shade}`, (value as any).srgb, tokens.color.neutral.description)
  }

  // Semantic
  for (const [name, value] of Object.entries(tokens.color.semantic)) {
    if (name === 'description' || name === 'why') continue
    const v = value as any
    if (v.light?.srgb) addColorVar(`semantic/${name}/light`, v.light.srgb, v.description)
    if (v.dark?.srgb) addColorVar(`semantic/${name}/dark`, v.dark.srgb, v.description)
  }

  // Platform colors
  const PLATFORM_SKIP = new Set(['description', 'why'])
  if (tokens.color.platform) {
    for (const [platform, colors] of Object.entries(tokens.color.platform)) {
      if (PLATFORM_SKIP.has(platform)) continue
      for (const [name, value] of Object.entries(colors as any)) {
        addColorVar(`platform/${platform}/${name}`, (value as any).srgb)
      }
    }
  }

  export_.variables.push(...colorVariables)
  export_.variableCollections.push({
    id: COLOR_COLLECTION,
    name: 'Colors',
    key: randomUUID(),
    modes: [{ modeId: colorMode, name: 'Base' }],
    defaultModeId: colorMode,
    remote: false,
    variableIds: colorIds,
  })

  export_.variableModes.push({ id: colorMode, name: 'Base', collectionId: COLOR_COLLECTION })

  // ── TYPOGRAPHY Collection ────────────────────────────
  const typoVariables: FigmaVariable[] = []
  const typoIds: string[] = []

  for (const [name, value] of Object.entries(tokens.typography.typeScale)) {
    const v = value as any
    const prefix = `typography/${name}`

    const sizeId = nextId('var')
    typoIds.push(sizeId)
    typoVariables.push({
      id: sizeId,
      name: `${prefix}/size`,
      key: randomUUID(),
      variableCollectionId: TYPOGRAPHY_COLLECTION,
      resolvedType: 'FLOAT',
      valuesByMode: { [typoMode]: v.size },
      scopes: ['FONT_SIZE'],
    })

    const weightId = nextId('var')
    typoIds.push(weightId)
    typoVariables.push({
      id: weightId,
      name: `${prefix}/fontWeight`,
      key: randomUUID(),
      variableCollectionId: TYPOGRAPHY_COLLECTION,
      resolvedType: 'FLOAT',
      valuesByMode: { [typoMode]: v.fontWeight },
      scopes: ['FONT_WEIGHT'],
    })

    const lhId = nextId('var')
    typoIds.push(lhId)
    typoVariables.push({
      id: lhId,
      name: `${prefix}/lineHeight`,
      key: randomUUID(),
      variableCollectionId: TYPOGRAPHY_COLLECTION,
      resolvedType: 'FLOAT',
      valuesByMode: { [typoMode]: v.lineHeight },
      scopes: ['LINE_HEIGHT'],
    })

    const lsId = nextId('var')
    typoIds.push(lsId)
    typoVariables.push({
      id: lsId,
      name: `${prefix}/letterSpacing`,
      key: randomUUID(),
      variableCollectionId: TYPOGRAPHY_COLLECTION,
      resolvedType: 'FLOAT',
      valuesByMode: { [typoMode]: v.letterSpacing },
      scopes: ['LETTER_SPACING'],
    })
  }

  export_.variables.push(...typoVariables)
  export_.variableCollections.push({
    id: TYPOGRAPHY_COLLECTION,
    name: 'Typography',
    key: randomUUID(),
    modes: [{ modeId: typoMode, name: 'Base' }],
    defaultModeId: typoMode,
    remote: false,
    variableIds: typoIds,
  })

  export_.variableModes.push({ id: typoMode, name: 'Base', collectionId: TYPOGRAPHY_COLLECTION })

  // ── SPACING Collection ───────────────────────────────
  const spacingVariables: FigmaVariable[] = []
  const spacingIds: string[] = []

  for (const [name, value] of Object.entries(tokens.spacing)) {
    if (name === 'description' || name === 'why') continue
    const v = value as any
    if (v.value === undefined) continue
    const id = nextId('var')
    spacingIds.push(id)
    spacingVariables.push({
      id,
      name: `spacing/${name}`,
      key: randomUUID(),
      variableCollectionId: SPACING_COLLECTION,
      resolvedType: 'FLOAT',
      valuesByMode: { [spacingMode]: v.value },
      scopes: ['GAP', 'WIDTH', 'HEIGHT', 'PADDING', 'MARGIN'],
      description: v.usage,
    })
  }

  export_.variables.push(...spacingVariables)
  export_.variableCollections.push({
    id: SPACING_COLLECTION,
    name: 'Spacing',
    key: randomUUID(),
    modes: [{ modeId: spacingMode, name: 'Base' }],
    defaultModeId: spacingMode,
    remote: false,
    variableIds: spacingIds,
  })

  export_.variableModes.push({ id: spacingMode, name: 'Base', collectionId: SPACING_COLLECTION })

  // ── CORNER RADIUS Collection ─────────────────────────
  const radiusVariables: FigmaVariable[] = []
  const radiusIds: string[] = []

  for (const [name, value] of Object.entries(tokens.cornerRadius)) {
    if (name === 'description' || name === 'why') continue
    const v = value as any
    if (v.value === undefined) continue
    const id = nextId('var')
    radiusIds.push(id)
    radiusVariables.push({
      id,
      name: `radius/${name}`,
      key: randomUUID(),
      variableCollectionId: RADIUS_COLLECTION,
      resolvedType: 'FLOAT',
      valuesByMode: { [radiusMode]: v.value },
      scopes: ['CORNER_RADIUS'],
      description: v.usage,
    })
  }

  export_.variables.push(...radiusVariables)
  export_.variableCollections.push({
    id: RADIUS_COLLECTION,
    name: 'Corner Radius',
    key: randomUUID(),
    modes: [{ modeId: radiusMode, name: 'Base' }],
    defaultModeId: radiusMode,
    remote: false,
    variableIds: radiusIds,
  })

  export_.variableModes.push({ id: radiusMode, name: 'Base', collectionId: RADIUS_COLLECTION })

  // ── THEMES Collection (Light / Dark / High-Contrast) ─
  const themeVariables: FigmaVariable[] = []
  const themeIds: string[] = []

  const themeOrder = ['light', 'dark', 'high-contrast']
  const themeModes: { modeId: string; name: string }[] = []
  const themeModeMap: Record<string, string> = {}

  for (const theme of themeOrder) {
    const modeId = nextId('mode')
    themeModes.push({ modeId, name: theme.charAt(0).toUpperCase() + theme.slice(1) })
    themeModeMap[theme] = modeId
    export_.variableModes.push({ id: modeId, name: theme.charAt(0).toUpperCase() + theme.slice(1), collectionId: THEME_COLLECTION })
  }

  // Collect all unique surface/text/border/shadow keys across themes
  const allThemeKeys = new Set<string>()
  for (const theme of Object.values(themes)) {
    for (const category of ['surface', 'text', 'border', 'shadow', 'overlay']) {
      if (theme.theme?.[category]) {
        for (const key of Object.keys(theme.theme[category])) {
          allThemeKeys.add(`${category}/${key}`)
        }
      }
    }
  }

  for (const fullKey of allThemeKeys) {
    const [category, ...keyParts] = fullKey.split('/')
    const key = keyParts.join('/')
    const id = nextId('var')
    themeIds.push(id)

    const valuesByMode: Record<string, any> = {}
    for (const themeName of themeOrder) {
      const themeData = themes[themeName]?.theme?.[category]?.[key]
      if (!themeData) {
        valuesByMode[themeModeMap[themeName]] = undefined
        continue
      }
      // Check if it's a hex color or a shadow value
      if (typeof themeData === 'string' && themeData.startsWith('#')) {
        const rgba = hexToRGBA(themeData)
        if (rgba) valuesByMode[themeModeMap[themeName]] = rgba
      } else if (typeof themeData === 'string') {
        valuesByMode[themeModeMap[themeName]] = themeData
      }
    }

    // Only add if at least one mode has a value
    if (Object.values(valuesByMode).some(v => v !== undefined)) {
      const resolvedType = category === 'shadow' ? 'STRING' : 'COLOR'
      themeVariables.push({
        id,
        name: `theme/${category}/${key}`,
        key: randomUUID(),
        variableCollectionId: THEME_COLLECTION,
        resolvedType,
        valuesByMode,
        scopes: ['ALL_SCOPES'],
      })
    }
  }

  export_.variables.push(...themeVariables)
  export_.variableCollections.push({
    id: THEME_COLLECTION,
    name: 'Themes',
    key: randomUUID(),
    modes: themeModes,
    defaultModeId: themeModeMap.light,
    remote: false,
    variableIds: themeIds,
  })

  // ── Write output ─────────────────────────────────────
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const outPath = path.join(OUTPUT_DIR, 'variables.json')
  fs.writeFileSync(outPath, JSON.stringify(export_, null, 2))

  // Stats
  const totalCollections = export_.variableCollections.length
  const totalVariables = export_.variables.length
  const totalModes = export_.variableModes.length

  console.log(`  Collections:  ${totalCollections}`)
  console.log(`  Modes:        ${totalModes}`)
  console.log(`  Variables:    ${totalVariables}`)

  console.log(`\n✅ Written to ${outPath}`)
  console.log()
}

build()
