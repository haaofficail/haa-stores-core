/**
 * HAA Storefront Design Tokens
 *
 * Type-safe constants matching CSS custom properties in 14-storefront-tokens.css
 * All values should match 1:1 with CSS variables.
 */

// ─── Spacing Scale ───────────────────────────────────────────────
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export type SpaceToken = keyof typeof space;

// ─── Icon Sizes ──────────────────────────────────────────────────
export const iconSizes = {
  xs: 16,
  sm: 18,
  md: 20,
  default: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
} as const;

export type IconSizeToken = keyof typeof iconSizes;

// Maps spec icon size names to pixel values
export const iconSizeMap: Record<IconSizeToken, string> = {
  xs: 'h-4 w-4',
  sm: 'h-[18px] w-[18px]',
  md: 'h-5 w-5',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
  '2xl': 'h-16 w-16',
};

// ─── Button Heights ──────────────────────────────────────────────
export const buttonHeights = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export type ButtonHeightToken = keyof typeof buttonHeights;

export const buttonHeightMap: Record<ButtonHeightToken, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

export const buttonMinHeightMap: Record<ButtonHeightToken, string> = {
  sm: 'min-h-[32px]',
  md: 'min-h-[40px]',
  lg: 'min-h-[48px]',
};

export const buttonPaddingMap: Record<ButtonHeightToken, string> = {
  sm: 'px-3',
  md: 'px-4',
  lg: 'px-6',
};

export const buttonSizeMap: Record<ButtonHeightToken, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

export const buttonRadiusMap: Record<ButtonHeightToken, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
};

// ─── Touch Targets ───────────────────────────────────────────────
export const touchTargets = {
  default: 44,
  minimum: 24,
  compact: 32,
  icon: 40,
} as const;

export type TouchTargetToken = keyof typeof touchTargets;

// ─── E-commerce Type Scale ───────────────────────────────────────
export const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  md: 'text-md',
  'product-title': 'text-product-title',
  'product-price': 'text-product-price',
  'section-title': 'text-section-title',
  'page-title': 'text-page-title',
  'hero-title': 'text-hero-title',
} as const;

export type TextSizeToken = keyof typeof textSizes;

// ─── Badge Tokens ────────────────────────────────────────────────
export const badge = {
  height: 20,
  paddingX: 2,
  fontSize: 'text-[11px]',
  radius: 'rounded-full',
  iconSize: 'h-3 w-3',
} as const;

// ─── Card Tokens ─────────────────────────────────────────────────
export const card = {
  padding: 'p-4',
  radius: 'rounded-card',
  imageRadius: 'rounded-xl',
  gap: 'gap-3',
  titleLineClamp: 'line-clamp-2',
  actionMinHeight: 'min-h-[40px]',
} as const;

// ─── Semantic Color Classes ──────────────────────────────────────
export const badgeSemantic = {
  sale: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-text',
  error: 'bg-danger-soft text-danger-text',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-text-secondary',
  brand: 'bg-primary-50 text-primary-700',
} as const;

export type BadgeSemantic = keyof typeof badgeSemantic;
