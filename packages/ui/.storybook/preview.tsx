import type { Preview } from '@storybook/react'
import path from 'path'

const preview: Preview = {
  parameters: {
    viewport: {
      viewports: {
        iPhone14: {
          name: 'iPhone 14',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        iPad: {
          name: 'iPad',
          styles: { width: '820px', height: '1180px' },
          type: 'tablet',
        },
        MacBook: {
          name: 'MacBook Pro',
          styles: { width: '1512px', height: '982px' },
          type: 'desktop',
        },
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'aria-roles', enabled: true },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'high-contrast', title: 'High Contrast' },
        ],
      },
    },
    direction: {
      name: 'Direction',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light'
      const dir = context.globals.direction || 'ltr'

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme)
        document.documentElement.dir = dir
      }

      return (
        <div style={{ padding: 'var(--spacing-4)', fontFamily: 'var(--font-sans)' }}>
          <Story />
        </div>
      )
    },
  ],
}

export default preview
