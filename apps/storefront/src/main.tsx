import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@haa/tokens/output/css/index.css';
import App from './App';
import './i18n';
import './index.css';
import { initObservability } from './lib/observability';

initObservability();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
