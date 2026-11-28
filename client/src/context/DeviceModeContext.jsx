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
  // Always fit dynamically to the current device on startup/refresh
  const [mode, setModeState] = useState('auto');
  const [screenDevice, setScreenDevice] = useState(getScreenDevice);

  // Clear any legacy saved device override so every device auto-fits by default
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }, []);

  // Listen to screen resize and orientation changes for live responsive adaptation
  useEffect(() => {
    const handleResize = () => {
      setScreenDevice(getScreenDevice());
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isRealPhone = screenDevice === 'mobile';
  const activeDevice = isRealPhone || mode === 'auto' ? screenDevice : mode;
  const isOverride = !isRealPhone && mode !== 'auto';

  // Apply data-device attribute to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-device', activeDevice);
    root.setAttribute('data-device-override', isOverride ? 'true' : 'false');
  }, [activeDevice, isOverride]);

  const setMode = useCallback((newMode) => {
    setModeState(newMode || 'auto');
  }, []);

  const resetToAuto = useCallback(() => {
    setModeState('auto');
  }, []);

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
