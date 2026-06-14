import React from 'react';
import ReactDOM from 'react-dom/client';
import '@haa/tokens/output/css/index.css';
import '@haa/system-theme/system-theme.css';
import { SystemThemeProvider } from '@haa/system-theme';
import App from './App';
import './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SystemThemeProvider defaultMode="light">
      <App />
    </SystemThemeProvider>
  </React.StrictMode>,
);
