import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DeviceModeContext = createContext();

const STORAGE_KEY = 'fintrack_device_mode';

const getScreenDevice = () => {
  if (typeof window === 'undefined') return 'laptop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'laptop';
};

export const DeviceModeProvider = ({ children }) => {
  const [mode, setModeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  });

  const [screenDevice, setScreenDevice] = useState(getScreenDevice);

  // Listen to screen resize for auto detection
  useEffect(() => {
    const handleResize = () => {
      setScreenDevice(getScreenDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeDevice = mode === 'auto' ? screenDevice : mode;
  const isOverride = mode !== 'auto';

  // Apply data-device attribute to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-device', activeDevice);
    root.setAttribute('data-device-override', isOverride ? 'true' : 'false');
  }, [activeDevice, isOverride]);

  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const resetToAuto = useCallback(() => {
    setMode('auto');
  }, [setMode]);

  const isRealPhone = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <DeviceModeContext.Provider
      value={{
        mode,
        activeDevice,
        isOverride,
        setMode,
        resetToAuto,
        isMobile: activeDevice === 'mobile',
        isTablet: activeDevice === 'tablet',
        isLaptop: activeDevice === 'laptop',
        isRealPhone,
      }}
    >
      {children}
    </DeviceModeContext.Provider>
  );
};

export const useDeviceMode = () => {
  const context = useContext(DeviceModeContext);
  if (!context) {
    throw new Error('useDeviceMode must be used within DeviceModeProvider');
  }
  return context;
};

export default DeviceModeContext;
