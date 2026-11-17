import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './theme.css';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ComfortProvider } from './context/ComfortContext';
import { DeviceModeProvider } from './context/DeviceModeContext';
import { PWAProvider } from './context/PWAContext';
import { ToastProvider } from './components/common/Toast';

export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const custom =
      localStorage.getItem('fintrack_api_url') ||
      localStorage.getItem('fintrack_api_base_url');
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
  return 'https://fintrack-30zs.onrender.com';
};

// Global Error Boundary to prevent any blank screen crash
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FinTrack UI Crash prevented by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '36px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
              VK BANKER'S & FINANCE
            </h2>
            <p style={{ fontSize: '13px', color: '#38bdf8', marginBottom: '16px', fontWeight: '600' }}>
              தவணை நிதி மேலாண்மை - System Recovery
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              Your financial data and customer records are safely stored. Click below to refresh the application.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: '#0ea5e9',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Reload Application / மீண்டும் தொடங்கு
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ComfortProvider>
        <DeviceModeProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <PWAProvider>
                  <ToastProvider>
                    <App />
                  </ToastProvider>
                </PWAProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </DeviceModeProvider>
      </ComfortProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
