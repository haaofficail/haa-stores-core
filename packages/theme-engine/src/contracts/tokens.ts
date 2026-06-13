import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Must be a valid hex color (e.g., #fff or #ffffff)')

const cssLength = z
  .string()
  .regex(/^-?\d+(\.\d+)?(px|em|rem|%|vw|vh|ch|ex)?$/, 'Must be a valid CSS length')

const cssUnit = z.string().min(1)

export const FontPairSchema = z.enum(['modern', 'editorial', 'technical'])
export const HeroVariantSchema = z.enum(['classic', 'split', 'editorial'])
export const CardStyleSchema = z.enum(['flat', 'soft', 'elevated'])
export const DensitySchema = z.enum(['compact', 'regular', 'comfy'])

export const ThemeColorsSchema = z.object({
  bg: hexColor,
  surface: hexColor,
  surface2: hexColor,
  ink: hexColor,
  ink2: hexColor,
  ink3: hexColor,
  line: hexColor,
  lineStrong: hexColor,
  accent: hexColor,
  onAccent: hexColor,
})

export const ThemeFontsSchema = z.object({
  pair: FontPairSchema,
  display: z.string().min(1),
  body: z.string().min(1),
  arabic: z.string().min(1),
})

const TypographyTokenSchema = z.object({
  size: z.number().int().positive(),
  weight: z.number().int().min(100).max(900),
  lineHeight: z.number().positive(),
  letterSpacing: cssUnit,
})

export const ThemeTypographySchema = z.object({
  h1: TypographyTokenSchema,
  h2: TypographyTokenSchema,
  h3: TypographyTokenSchema,
  body: TypographyTokenSchema,
  caption: TypographyTokenSchema,
  eyebrow: TypographyTokenSchema,
})

export const ThemeSpacingSchema = z.object({
  xs: z.number().nonnegative(),
  sm: z.number().nonnegative(),
  md: z.number().nonnegative(),
  lg: z.number().nonnegative(),
  xl: z.number().nonnegative(),
  xxl: z.number().nonnegative(),
})

export const ThemeRadiusSchema = z.object({
  sm: z.number().nonnegative(),
  md: z.number().nonnegative(),
  lg: z.number().nonnegative(),
  xl: z.number().nonnegative(),
})

export const ThemeShadowsSchema = z.object({
  sm: cssLength,
  md: cssLength,
  lg: cssLength,
})

export const ThemeMotionSchema = z.object({
  default: cssUnit,
  drawer: cssUnit,
  modal: cssUnit,
})

export const ThemeTokensSchema = z.object({
  colors: ThemeColorsSchema,
  fonts: ThemeFontsSchema,
  typography: ThemeTypographySchema,
  spacing: ThemeSpacingSchema,
  radius: ThemeRadiusSchema,
  shadows: ThemeShadowsSchema,
  motion: ThemeMotionSchema,
})
