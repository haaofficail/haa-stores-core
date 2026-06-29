import React from 'react';
import ReactDOM from 'react-dom/client';
import '@haa/tokens/output/css/index.css';
import '@haa/system-theme/system-theme.css';
import { SystemThemeProvider } from '@haa/system-theme';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './i18n';
import './index.css';
import { initObservability } from './lib/observability';
import { queryClient } from './lib/queryClient';

initObservability();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SystemThemeProvider defaultMode="light">
        <App />
      </SystemThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
