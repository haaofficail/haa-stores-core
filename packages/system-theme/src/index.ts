/**
 * @haa/system-theme
 *
 * HAA System Theme — Admin Dashboard Identity
 *
 * This package provides:
 * - CSS tokens (--haa-* namespace) for dashboard UI
 * - SystemThemeProvider React component
 * - TypeScript token definitions
 *
 * IMPORTANT:
 * - This is NOT for storefront themes.
 * - Storefront themes are managed by @haa/theme-system.
 * - This package must NOT be imported by the storefront.
 * - This package must NOT read storefront theme variables.
 */

export { SystemThemeProvider, useSystemTheme } from './SystemThemeProvider';
export { SYSTEM_THEME_TOKENS } from './tokens';
export type { SystemThemeTokenKey, SystemThemeMode, SystemThemeContextValue } from './tokens';
