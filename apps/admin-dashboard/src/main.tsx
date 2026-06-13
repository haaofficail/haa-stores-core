import React from 'react';
import ReactDOM from 'react-dom/client';
import '@haa/tokens/output/css/index.css';
import App from './App';
import './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
