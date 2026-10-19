import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ComfortProvider } from './context/ComfortContext';
import { DeviceModeProvider } from './context/DeviceModeContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ComfortProvider>
      <DeviceModeProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </DeviceModeProvider>
    </ComfortProvider>
  </React.StrictMode>
);
