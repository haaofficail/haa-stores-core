import fs from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const TOKENS_PATH = path.resolve(__dirname, '..', 'source', 'tokens.json')
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output', 'kotlin')
const PACKAGE_PATH = 'com/haatheme'

function hexToInt(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16)
}

interface ColorEntry {
  srgb: string
  p3?: string
  contrast?: string
}

interface SemanticColorEntry {
  light: ColorEntry
  dark: ColorEntry
  textOnLight: string
  textOnDark: string
  subtle: { light: string; dark: string }
}

interface TypeScaleEntry {
  size: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
}

interface Tokens {
  color: Record<string, any>
  typography: { typeScale: Record<string, TypeScaleEntry> }
  spacing: Record<string, { value: number }>
  cornerRadius: Record<string, { value: number }>
}

function loadTokens(): Tokens {
  return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
}

function writeFile(...parts: string[]) {
  const filePath = path.join(OUTPUT_DIR, ...parts)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  return (content: string) => fs.writeFileSync(filePath, content, 'utf-8')
}

function generateColorObject(colors: Record<string, ColorEntry>, name: string): string {
  const lines: string[] = []
  for (const [shade, color] of Object.entries(colors)) {
    if (typeof color !== 'object' || color === null || !('srgb' in color)) continue
    const c = color as ColorEntry
    const intVal = hexToInt(c.srgb)
    const propName = `${name.replace(/^\w/, c => c.toUpperCase())}${shade}`
    lines.push(`    val ${propName} = Color(0x${intVal.toString(16).padStart(8, '0')})`)
  }
  return lines.join('\n')
}

function generateSemanticColor(semantic: Record<string, SemanticColorEntry>): string {
  const lines: string[] = []
  lines.push('    data class SemanticColor(val light: Color, val dark: Color, val textOnLight: Color, val textOnDark: Color)')
  lines.push('')
  for (const [name, entry] of Object.entries(semantic)) {
    if (!entry || typeof entry !== 'object' || !('light' in entry)) continue
    const sc = entry as SemanticColorEntry
    const lightHex = hexToInt(sc.light.srgb)
    const darkHex = hexToInt(sc.dark.srgb)
    const textLightHex = hexToInt(sc.textOnLight)
    const textDarkHex = hexToInt(sc.textOnDark)
    const propName = name.replace(/^\w/, c => c.toUpperCase())
    lines.push(`    val ${propName} = SemanticColor(`)
    lines.push(`      light = Color(0x${lightHex.toString(16).padStart(8, '0')}),`)
    lines.push(`      dark = Color(0x${darkHex.toString(16).padStart(8, '0')}),`)
    lines.push(`      textOnLight = Color(0x${textLightHex.toString(16).padStart(8, '0')}),`)
    lines.push(`      textOnDark = Color(0x${textDarkHex.toString(16).padStart(8, '0')}),`)
    lines.push(`    )`)
  }
  return lines.join('\n')
}

function generatePlatformColors(platform: Record<string, Record<string, ColorEntry>>): string {
  const lines: string[] = []
  for (const [platformName, colors] of Object.entries(platform)) {
    if (typeof colors !== 'object' || colors === null) continue
    const objName = platformName.replace(/^\w/, c => c.toUpperCase())
    lines.push(`  object ${objName} {`)
    for (const [name, color] of Object.entries(colors)) {
      if (typeof color !== 'object' || color === null || !('srgb' in color)) continue
      const intVal = hexToInt(color.srgb)
      const propName = name.replace(/^\w/, c => c.toUpperCase())
      lines.push(`    val ${propName} = Color(0x${intVal.toString(16).padStart(8, '0')})`)
    }
    lines.push(`  }`)
  }
  return lines.join('\n')
}

function buildKotlin() {
  console.log('\n🔨 Building Kotlin tokens...\n')
  const tokens = loadTokens()

  // --- HAAColor.kt ---
  {
    const write = writeFile(PACKAGE_PATH, 'HAAColor.kt')
    const lines: string[] = []
    lines.push('package com.haa.theme')
    lines.push('')
    lines.push('import androidx.compose.ui.graphics.Color')
    lines.push('')
    lines.push('object HAAColor {')

    // Primary palette
    lines.push('')
    lines.push('  // ── Primary Palette ──')
    lines.push(generateColorObject(tokens.color.primary, 'primary'))

    // Neutral palette
    lines.push('')
    lines.push('  // ── Neutral Palette ──')
    lines.push(generateColorObject(tokens.color.neutral, 'neutral'))

    // Semantic colors
    lines.push('')
    lines.push('  // ── Semantic Colors ──')
    lines.push(`  object Semantic {`)
    lines.push(generateSemanticColor(tokens.color.semantic as unknown as Record<string, SemanticColorEntry>))
    lines.push(`  }`)

    // Platform colors
    lines.push('')
    lines.push('  // ── Platform Colors ──')
    lines.push(`  object Platform {`)
    lines.push(generatePlatformColors(tokens.color.platform as unknown as Record<string, Record<string, ColorEntry>>))
    lines.push(`  }`)

    lines.push('}')
    lines.push('')
    write(lines.join('\n'))
    console.log(`  ✓ HAAColor.kt`)
  }

  // --- HAATypography.kt ---
  {
    const write = writeFile(PACKAGE_PATH, 'HAATypography.kt')
    const typeScale = tokens.typography.typeScale
    const lines: string[] = []
    lines.push('package com.haa.theme')
    lines.push('')
    lines.push('import androidx.compose.ui.text.TextStyle')
    lines.push('import androidx.compose.ui.text.font.FontWeight')
    lines.push('import androidx.compose.ui.unit.sp')
    lines.push('')
    lines.push('object HAATypography {')

    for (const [name, entry] of Object.entries(typeScale)) {
      const propName = name.replace(/^\w/, c => c.toUpperCase())
      const weight = entry.fontWeight >= 600 ? 'Bold' : entry.fontWeight >= 500 ? 'Medium' : 'Normal'
      lines.push('')
      lines.push(`  val ${propName} = TextStyle(`)
      lines.push(`    fontSize = ${entry.size}.sp,`)
      lines.push(`    fontWeight = FontWeight.${weight},`)
      lines.push(`    lineHeight = ${entry.lineHeight}.sp,`)
      lines.push(`    letterSpacing = ${entry.letterSpacing}.sp,`)
      lines.push(`  )`)
    }

    lines.push('}')
    lines.push('')
    write(lines.join('\n'))
    console.log(`  ✓ HAATypography.kt`)
  }

  // --- HAASpacing.kt ---
  {
    const write = writeFile(PACKAGE_PATH, 'HAASpacing.kt')
    const lines: string[] = []
    lines.push('package com.haa.theme')
    lines.push('')
    lines.push('import androidx.compose.ui.unit.Dp')
    lines.push('import androidx.compose.ui.unit.dp')
    lines.push('')
    lines.push('object HAASpacing {')

    for (const [key, entry] of Object.entries(tokens.spacing)) {
      if (typeof entry !== 'object' || !('value' in (entry as any))) continue
      const value = (entry as { value: number }).value
      const propName = `S${key}`
      lines.push(`  val ${propName} = ${value}.dp`)
    }

    lines.push('}')
    lines.push('')
    write(lines.join('\n'))
    console.log(`  ✓ HAASpacing.kt`)
  }

  // --- HAARadius.kt ---
  {
    const write = writeFile(PACKAGE_PATH, 'HAARadius.kt')
    const lines: string[] = []
    lines.push('package com.haa.theme')
    lines.push('')
    lines.push('import androidx.compose.foundation.shape.RoundedCornerShape')
    lines.push('import androidx.compose.ui.unit.dp')
    lines.push('')
    lines.push('object HAARadius {')

    for (const [name, entry] of Object.entries(tokens.cornerRadius)) {
      if (typeof entry !== 'object' || !('value' in (entry as any))) continue
      const value = (entry as { value: number }).value
      const propName = name.replace(/^\w/, c => c.toUpperCase())
      if (value >= 9999) {
        lines.push(`  val ${propName} = RoundedCornerShape(percent = 50)`)
      } else {
        lines.push(`  val ${propName} = RoundedCornerShape(${value}.dp)`)
      }
    }

    lines.push('}')
    lines.push('')
    write(lines.join('\n'))
    console.log(`  ✓ HAARadius.kt`)
  }

  // --- Theme.kt ---
  {
    const write = writeFile(PACKAGE_PATH, 'Theme.kt')
    const lines: string[] = []
    lines.push('package com.haa.theme')
    lines.push('')
    lines.push('import androidx.compose.foundation.isSystemInDarkTheme')
    lines.push('import androidx.compose.material3.MaterialTheme')
    lines.push('import androidx.compose.material3.darkColorScheme')
    lines.push('import androidx.compose.material3.lightColorScheme')
    lines.push('import androidx.compose.runtime.Composable')
    lines.push('import androidx.compose.ui.graphics.Color')
    lines.push('')
    lines.push('private val LightColorScheme = lightColorScheme(')
    lines.push(`  primary = HAAColor.Primary500,`)
    lines.push(`  onPrimary = Color.White,`)
    lines.push(`  secondary = HAAColor.Neutral500,`)
    lines.push(`  onSecondary = Color.White,`)
    lines.push(`  background = HAAColor.Neutral50,`)
    lines.push(`  onBackground = HAAColor.Neutral950,`)
    lines.push(`  surface = Color.White,`)
    lines.push(`  onSurface = HAAColor.Neutral950,`)
    lines.push(`  error = HAAColor.Semantic.Danger.light,`)
    lines.push(`  onError = Color.White,`)
    lines.push(')')
    lines.push('')
    lines.push('private val DarkColorScheme = darkColorScheme(')
    lines.push(`  primary = HAAColor.Primary400,`)
    lines.push(`  onPrimary = HAAColor.Neutral950,`)
    lines.push(`  secondary = HAAColor.Neutral400,`)
    lines.push(`  onSecondary = HAAColor.Neutral950,`)
    lines.push(`  background = HAAColor.Neutral950,`)
    lines.push(`  onBackground = HAAColor.Neutral50,`)
    lines.push(`  surface = HAAColor.Neutral900,`)
    lines.push(`  onSurface = HAAColor.Neutral50,`)
    lines.push(`  error = HAAColor.Semantic.Danger.dark,`)
    lines.push(`  onError = HAAColor.Neutral950,`)
    lines.push(')')
    lines.push('')
    lines.push('@Composable')
    lines.push('fun HAATheme(')
    lines.push('  darkTheme: Boolean = isSystemInDarkTheme(),')
    lines.push('  content: @Composable () -> Unit')
    lines.push(') {')
    lines.push('  val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme')
    lines.push('  MaterialTheme(colorScheme = colorScheme, content = content)')
    lines.push('}')
    lines.push('')
    write(lines.join('\n'))
    console.log(`  ✓ Theme.kt`)
  }

  // --- README.md ---
  {
    const write = writeFile('README.md')
    write(`# HAA Theme — Kotlin

## Installation

Add the dependency to your \`build.gradle.kts\`:

\`\`\`kotlin
implementation("com.haa:haa-theme:1.0.0")
\`\`\`

## Usage

\`\`\`kotlin
import com.haa.theme.*

// Wrap your app with HAATheme
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            HAATheme {
                Greeting("HAA")
            }
        }
    }
}

@Composable
fun Greeting(name: String) {
    Column(
        modifier = Modifier.padding(HAASpacing.S4)
    ) {
        Text(
            text = "Hello, $name!",
            style = HAATypography.LargeTitle,
            color = HAAColor.Primary500
        )
        Spacer(modifier = Modifier.height(HAASpacing.S2))
        Card(
            shape = HAARadius.Md,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Welcome to HAA Design System",
                style = HAATypography.Body,
                modifier = Modifier.padding(HAASpacing.S3)
            )
        }
    }
}
\`\`\`

## Components

All HAA tokens are available as Compose-friendly objects:

| Object | Purpose |
|--------|---------|
| \`HAAColor\` | Color palette, semantic colors, platform colors |
| \`HAATypography\` | Type scale with \`TextStyle\` values |
| \`HAASpacing\` | 8-pt grid spacing in \`Dp\` |
| \`HAARadius\` | Corner radius as \`RoundedCornerShape\` |
| \`HAATheme\` | Material 3 theme with light/dark color schemes |
`)
    console.log(`  ✓ README.md`)
  }

  console.log(`\n✅ Done — Kotlin files written to ${OUTPUT_DIR}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildKotlin()
}

export { buildKotlin }
