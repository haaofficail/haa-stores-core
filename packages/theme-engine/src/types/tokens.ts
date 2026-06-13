/**
 * Theme Tokens — pure visual values
 *
 * A theme CAN customize these (via Theme Studio).
 * A theme CANNOT control: cart logic, checkout totals, payment, shipping,
 * tax, wallet, loyalty redemption, order creation, inventory.
 */

export type FontPair = 'modern' | 'editorial' | 'technical'

export type HeroVariant = 'classic' | 'split' | 'editorial'
export type CardStyle = 'flat' | 'soft' | 'elevated'
export type Density = 'compact' | 'regular' | 'comfy'

export interface ThemeColors {
  /** Main page background */
  bg: string
  /** Cards, header, modals */
  surface: string
  /** Hover, inputs, secondary cards */
  surface2: string
  /** Primary text + dark CTAs */
  ink: string
  /** Secondary text, captions */
  ink2: string
  /** Placeholders, disabled, tertiary */
  ink3: string
  /** Soft borders */
  line: string
  /** Strong borders (inputs, secondary buttons) */
  lineStrong: string
  /** Primary accent color (tweakable) */
  accent: string
  /** Foreground on accent (auto-computed) */
  onAccent: string
}

export interface ThemeFonts {
  pair: FontPair
  display: string
  body: string
  arabic: string
}

export interface TypographyToken {
  size: number
  weight: number
  lineHeight: number
  letterSpacing: string
}

export interface ThemeTypography {
  h1: TypographyToken
  h2: TypographyToken
  h3: TypographyToken
  body: TypographyToken
  caption: TypographyToken
  eyebrow: TypographyToken
}

export interface ThemeSpacing {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}

export interface ThemeRadius {
  sm: number
  md: number
  lg: number
  xl: number
}

export interface ThemeShadows {
  sm: string
  md: string
  lg: string
}

export interface ThemeMotion {
  default: string
  drawer: string
  modal: string
}

export interface ThemeTokens {
  colors: ThemeColors
  fonts: ThemeFonts
  typography: ThemeTypography
  spacing: ThemeSpacing
  radius: ThemeRadius
  shadows: ThemeShadows
  motion: ThemeMotion
}
