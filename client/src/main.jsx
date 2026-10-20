export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('fintrack_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('YOUR-API')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  return '';
};

const _fetch = window.fetch.bind(window);
window.fetch = (url, opts) => {
  if (typeof url === 'string' && url.startsWith('/api')) {
    const base = getApiBase();
    return _fetch(base ? `${base}${url}` : url, opts);
  }
  return _fetch(url, opts);
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ComfortProvider } from './context/ComfortContext';
import { DeviceModeProvider } from './context/DeviceModeContext';
import { PWAProvider } from './context/PWAContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ComfortProvider>
        <DeviceModeProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <PWAProvider>
                  <App />
                </PWAProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </DeviceModeProvider>
      </ComfortProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
