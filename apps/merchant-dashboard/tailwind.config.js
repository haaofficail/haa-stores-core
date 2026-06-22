/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-haa-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      // Apple-grade micro-interaction easings, matching the landing page
      // (every .lp-* component on staging.haastores.com uses
      // `transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
      transitionTimingFunction: {
        timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      fontWeight: {
        regular: 'var(--font-regular)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
      },
      borderWidth: {
        DEFAULT: 'var(--border-1)',
        '0': 'var(--border-0)',
        '2': 'var(--border-2)',
        '4': 'var(--border-4)',
      },
      opacity: {
        '0': 'var(--opacity-0)',
        '5': 'var(--opacity-5)',
        '10': 'var(--opacity-10)',
        '20': 'var(--opacity-20)',
        '30': 'var(--opacity-30)',
        '50': 'var(--opacity-50)',
        '70': 'var(--opacity-70)',
        '100': 'var(--opacity-100)',
      },
      colors: {
        surface: {
          '1': 'var(--haa-surface-1)',
          '2': 'var(--haa-surface-2)',
          '3': 'var(--haa-surface-3)',
          inverse: 'var(--haa-surface-inverse)',
        },
        text: {
          primary: 'var(--haa-text-primary)',
          secondary: 'var(--haa-text-secondary)',
          tertiary: 'var(--haa-text-tertiary)',
          disabled: 'var(--haa-text-disabled)',
          inverse: 'var(--haa-text-inverse)',
          link: 'var(--haa-text-link)',
        },
        border: {
          DEFAULT: 'var(--haa-border)',
          hover: 'var(--haa-border-strong)',
          focus: 'var(--haa-border-focus)',
          disabled: 'var(--haa-border-disabled)',
        },
        divider: 'var(--haa-divider)',
        primary: {
          50: 'var(--haa-primary-50)',
          100: 'var(--haa-primary-100)',
          200: 'var(--haa-primary-200)',
          300: 'var(--haa-primary-300)',
          400: 'var(--haa-primary-400)',
          500: 'var(--haa-primary-500)',
          600: 'var(--haa-primary-600)',
          700: 'var(--haa-primary-700)',
          800: 'var(--haa-primary-800)',
        },
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)',
        },
        success: {
          DEFAULT: 'var(--haa-success)',
        },
        warning: {
          DEFAULT: 'var(--haa-warning)',
        },
        danger: {
          DEFAULT: 'var(--haa-danger)',
        },
        info: {
          DEFAULT: 'var(--haa-info)',
        },
      },
      fontSize: {
        'caption2': ['var(--typography-caption2-size)', { lineHeight: 'var(--typography-caption2-line-height)', letterSpacing: 'var(--typography-caption2-letter-spacing)' }],
        'caption1': ['var(--typography-caption1-size)', { lineHeight: 'var(--typography-caption1-line-height)', letterSpacing: 'var(--typography-caption1-letter-spacing)' }],
        'footnote': ['var(--typography-footnote-size)', { lineHeight: 'var(--typography-footnote-line-height)', letterSpacing: 'var(--typography-footnote-letter-spacing)' }],
        'subhead': ['var(--typography-subhead-size)', { lineHeight: 'var(--typography-subhead-line-height)', letterSpacing: 'var(--typography-subhead-letter-spacing)' }],
        'callout': ['var(--typography-callout-size)', { lineHeight: 'var(--typography-callout-line-height)', letterSpacing: 'var(--typography-callout-letter-spacing)' }],
        'body': ['var(--typography-body-size)', { lineHeight: 'var(--typography-body-line-height)', letterSpacing: 'var(--typography-body-letter-spacing)' }],
        'headline': ['var(--typography-headline-size)', { lineHeight: 'var(--typography-headline-line-height)', letterSpacing: 'var(--typography-headline-letter-spacing)' }],
        'title3': ['var(--typography-title3-size)', { lineHeight: 'var(--typography-title3-line-height)', letterSpacing: 'var(--typography-title3-letter-spacing)' }],
        'title2': ['var(--typography-title2-size)', { lineHeight: 'var(--typography-title2-line-height)', letterSpacing: 'var(--typography-title2-letter-spacing)' }],
        'title1': ['var(--typography-title1-size)', { lineHeight: 'var(--typography-title1-line-height)', letterSpacing: 'var(--typography-title1-letter-spacing)' }],
        'large-title': ['var(--typography-large-title-size)', { lineHeight: 'var(--typography-large-title-line-height)', letterSpacing: 'var(--typography-large-title-letter-spacing)' }],
      },
      borderRadius: {
        'micro': 'var(--radius-micro)',
        'mac-btn': 'var(--radius-mac-btn)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'ios-btn': 'var(--radius-ios-btn)',
        'lg': 'var(--radius-lg)',
        'ios-icon': 'var(--radius-ios-icon)',
        'xl': 'var(--radius-xl)',
        'pill': 'var(--radius-pill)',
        'vision': 'var(--radius-vision-os)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        // Landing-card parity (staging.haastores.com `.lp-pcard` / `.lp-card`):
        // 2-layer Apple-grade shadow — close ambient + soft elevated lift.
        'card': '0 1px 3px 0 rgba(0,0,0,0.05), 0 10px 28px -14px rgba(0,0,0,0.12)',
        'card-hover': '0 2px 4px 0 rgba(0,0,0,0.06), 0 16px 36px -14px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'marquee': 'marquee 40s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
