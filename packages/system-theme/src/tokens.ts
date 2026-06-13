/**
 * HAA System Theme — Token Definitions
 *
 * These tokens define the admin dashboard identity.
 * They are NOT storefront theme tokens.
 *
 * Internal values may reference @haa/tokens primitives
 * (e.g., --color-primary-500), but the dashboard should
 * only consume the --haa-* namespace.
 */

export const SYSTEM_THEME_TOKENS = {
  surfaces: {
    1: 'var(--haa-surface-1)',
    2: 'var(--haa-surface-2)',
    3: 'var(--haa-surface-3)',
    inverse: 'var(--haa-surface-inverse)',
  },
  text: {
    primary: 'var(--haa-text-primary)',
    secondary: 'var(--haa-text-secondary)',
    tertiary: 'var(--haa-text-tertiary)',
    disabled: 'var(--haa-text-disabled)',
    inverse: 'var(--haa-text-inverse)',
    link: 'var(--haa-text-link)',
    linkHover: 'var(--haa-text-link-hover)',
  },
  border: {
    DEFAULT: 'var(--haa-border)',
    strong: 'var(--haa-border-strong)',
    focus: 'var(--haa-border-focus)',
    disabled: 'var(--haa-border-disabled)',
    divider: 'var(--haa-divider)',
  },
  primary: {
    50: 'var(--haa-primary-50)',
    100: 'var(--haa-primary-100)',
    500: 'var(--haa-primary-500)',
    600: 'var(--haa-primary-600)',
    700: 'var(--haa-primary-700)',
  },
  semantic: {
    success: 'var(--haa-success)',
    warning: 'var(--haa-warning)',
    danger: 'var(--haa-danger)',
    info: 'var(--haa-info)',
  },
  radius: {
    card: 'var(--haa-radius-card)',
    button: 'var(--haa-radius-button)',
  },
  shadow: {
    card: 'var(--haa-shadow-card)',
    color: 'var(--haa-shadow-color)',
    colorStrong: 'var(--haa-shadow-color-strong)',
  },
  backdrop: {
    opacity: 'var(--haa-backdrop-opacity)',
    blur: 'var(--haa-backdrop-blur)',
    color: 'var(--haa-backdrop-color)',
  },
  selection: {
    bg: 'var(--haa-selection-bg)',
    text: 'var(--haa-selection-text)',
  },
  placeholder: {
    text: 'var(--haa-placeholder-text)',
  },
} as const;

export type SystemThemeTokenKey = keyof typeof SYSTEM_THEME_TOKENS;

export interface SystemThemeMode {
  mode: 'light' | 'dark';
}

export interface SystemThemeContextValue extends SystemThemeMode {
  setMode: (mode: 'light' | 'dark') => void;
}
