export type BackgroundMode = 'single' | 'sectioned' | 'editorial';

export type LuxuryBackgroundConfig = {
  mode: BackgroundMode;
  color: string;
  surfaceColor: string;
  cardColor: string;
  allowSectionContrast: boolean;
};

export const defaultBackground: LuxuryBackgroundConfig = {
  mode: 'single',
  color: '#FAF7F1',
  surfaceColor: '#FAF7F1',
  cardColor: '#FAF7F1',
  allowSectionContrast: false,
};

export const luxuryTokens = {
  colors: {
    bg: '#FAF7F1',
    surface: '#FAF7F1',
    card: '#FAF7F1',
    section: '#FAF7F1',
    hero: '#FAF7F1',
    footer: '#FAF7F1',
    subtleSurface: '#FBF8F2',
    imageFrame: '#F7EFE6',
    primary: '#B88A3D',
    primaryHover: '#9D7432',
    text: '#2B2520',
    muted: '#756B61',
    textTertiary: '#A6947A',
    border: '#E6D8C6',
    softBorder: '#EFE4D6',
    shadow: 'rgba(43, 37, 32, 0.08)',
  },
  radius: {
    card: '6px',
    button: '3px',
    input: '3px',
    image: '4px',
  },
  spacing: {
    sectionY: '56px',
    sectionX: '32px',
    cardGap: '18px',
  },
  typography: {
    headingFamily: 'theme-serif, "IBM Plex Sans Arabic", serif',
    bodyFamily: 'theme-sans, "IBM Plex Sans Arabic", sans-serif',
    // Apple-grade type scale: rounded ratios, generous leading, tight tracking.
    displaySize: 'clamp(40px, 6vw, 84px)',
    heroSize: 'clamp(32px, 5vw, 72px)',
    sectionTitleSize: 'clamp(22px, 3vw, 36px)',
    cardTitleSize: 'clamp(15px, 1.4vw, 17px)',
    productNameSize: '14px',
    bodySize: '15px',
    smallSize: '13px',
    eyebrowSize: '10px',
    // Line-heights (multipliers): tight on display, generous on body.
    displayLeading: '1.02',
    heroLeading: '1.05',
    titleLeading: '1.2',
    bodyLeading: '1.6',
    // Tracking (em-equivalent): tighter for display, looser for caps.
    displayTracking: '-0.02em',
    titleTracking: '-0.01em',
    bodyTracking: '0',
    eyebrowTracking: '0.32em',
    capsTracking: '0.18em',
  },
  // Responsive container widths — match the Apple-style fluid layout.
  responsive: {
    containerMaxWidth: '1440px',
    mobilePadding: '1rem',
    tabletPadding: '1.5rem',
    desktopPadding: '2rem',
    mobileMinHeight: 'clamp(360px, 60vw, 480px)',
    desktopMinHeight: 'clamp(420px, 50vw, 620px)',
  },
  shadows: {
    soft: '0 18px 50px rgba(43, 37, 32, 0.08)',
    card: '0 2px 8px rgba(43, 37, 32, 0.04)',
    cardHover: '0 8px 24px rgba(43, 37, 32, 0.08)',
  },
  transitions: {
    fast: '150ms ease-out',
    base: '220ms ease-out',
    slow: '320ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export const luxuryCSSVars: Record<string, string> = {
  '--surface-1': luxuryTokens.colors.bg,
  '--surface-2': luxuryTokens.colors.card,
  '--text-primary': luxuryTokens.colors.text,
  '--text-secondary': luxuryTokens.colors.muted,
  '--text-tertiary': luxuryTokens.colors.textTertiary,
  '--primary': luxuryTokens.colors.primary,
  '--primary-hover': luxuryTokens.colors.primaryHover,
  '--border': luxuryTokens.colors.border,
  '--border-hover': luxuryTokens.colors.softBorder,
  '--lux-bg': luxuryTokens.colors.bg,
  '--lux-surface': luxuryTokens.colors.surface,
  '--lux-card': luxuryTokens.colors.card,
  '--lux-image-frame': luxuryTokens.colors.imageFrame,
  '--lux-primary': luxuryTokens.colors.primary,
  '--lux-primary-hover': luxuryTokens.colors.primaryHover,
  '--lux-text': luxuryTokens.colors.text,
  '--lux-muted': luxuryTokens.colors.muted,
  '--lux-border': luxuryTokens.colors.border,
};

export const LUXURY_THEME_CLASS = 'luxury-showcase-theme';
