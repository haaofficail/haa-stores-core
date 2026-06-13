export { ThemeProvider, useTheme, STORAGE_KEY } from './ThemeContext'
export type { Theme } from './ThemeContext'

// Re-export theme engine for theme developers
export { validateThemeContract, validateSection, validatePageTemplate } from '@haa/theme-engine'
export { ThemeRegistry } from '@haa/theme-engine'
export { THEME_FORBIDDEN_NAMES, ALLOWED_SECTION_PROPS, containsForbiddenName } from '@haa/theme-engine'
export type { ThemeExperienceContract as ThemeContract, ThemeDefinition } from '@haa/theme-engine'
export type { FontPair, HeroVariant, PageDensity as Density, CardStyle } from '@haa/theme-engine'
export type { ThemeTokens, ThemeTypography, ThemeColors, ThemeSpacing, ThemeRadius, ThemeShadows } from '@haa/theme-engine'
export type { SupportedPage, PageLayout } from '@haa/theme-engine'
export type { SectionInstance } from '@haa/theme-engine'
