import React from 'react';
import ReactDOM from 'react-dom/client';
import '@haa/tokens/output/css/index.css';
import '@haa/system-theme/system-theme.css';
import { SystemThemeProvider } from '@haa/system-theme';
import App from './App';
import './i18n';
import './index.css';

// W1 (DECISION-OS-009): the dashboard does NOT use storefront theme runtime.
// `<ThemeProvider>` from @haa/theme-react was a dead wrapper — no `useTheme()`
// consumer anywhere in apps/merchant-dashboard/src. Removed to align with the
// theme-boundary rule that bans dashboard imports of theme-react / theme-engine
// / theme-web / theme-system (main entry). System chrome theming comes via
// SystemThemeProvider from @haa/system-theme.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SystemThemeProvider defaultMode="light">
      <App />
    </SystemThemeProvider>
  </React.StrictMode>,
);
