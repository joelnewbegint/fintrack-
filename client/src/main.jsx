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
import OnlineOnlyGate from './components/common/OnlineOnlyGate';

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
          background: 'linear-gradient(165deg, #F3F9FF 0%, #EAF5FF 48%, #D5E9FA 100%)',
          color: '#183653',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid #D5E9FA',
            padding: '36px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 50px -10px rgba(8, 120, 209, 0.15)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#183653' }}>
              VK BANKER'S & FINANCE
            </h2>
            <p style={{ fontSize: '13px', color: '#0878D1', marginBottom: '16px', fontWeight: '700' }}>
              தவணை நிதி மேலாண்மை - System Recovery
            </p>
            <p style={{ fontSize: '12px', color: '#647C95', lineHeight: '1.6', marginBottom: '24px' }}>
              Your financial data and customer records are safely stored. Click below to refresh the application.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #0878D1 0%, #064B8E 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(8, 120, 209, 0.3)',
              }}
            >
              Reload Application / மீண்டும் தொடங்கு
            </button>
            {this.state.error && (
              <details style={{ marginTop: '16px', textAlign: 'left', fontSize: '11px', color: '#647C95' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Technical Details</summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '10px',
                  background: '#F3F9FF',
                  borderRadius: '10px',
                  border: '1px solid #D5E9FA',
                  overflowX: 'auto',
                  fontSize: '10px',
                  color: '#9B2C2C',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {String(this.state.error.message || this.state.error)}
                </pre>
              </details>
            )}
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
                    <OnlineOnlyGate>
                      <App />
                    </OnlineOnlyGate>
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
