import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ComfortContext = createContext();

const TEXT_SIZE_KEY = 'fintrack_text_size';
const DENSITY_KEY = 'fintrack_density';
const REDUCED_MOTION_KEY = 'fintrack_reduced_motion';
const THEME_MODE_KEY = 'fintrack_theme_mode'; // 'light' | 'dark' | 'auto'

export const ComfortProvider = ({ children }) => {
  const [textSize, setTextSizeState] = useState(() => {
    return localStorage.getItem(TEXT_SIZE_KEY) || 'normal'; // 'normal' | 'large' | 'xl'
  });

  const [density, setDensityState] = useState(() => {
    return localStorage.getItem(DENSITY_KEY) || 'comfortable'; // 'comfortable' | 'compact'
  });

  const [reducedMotion, setReducedMotionState] = useState(() => {
    const saved = localStorage.getItem(REDUCED_MOTION_KEY);
    if (saved !== null) return saved === 'true';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem(THEME_MODE_KEY) || 'light'; // 'light' | 'dark' | 'auto'
  });

  // Apply attributes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-text-size', textSize);
    localStorage.setItem(TEXT_SIZE_KEY, textSize);
  }, [textSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-density', density);
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
    localStorage.setItem(REDUCED_MOTION_KEY, reducedMotion.toString());
  }, [reducedMotion]);

  // Apply dark mode based on themeMode
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (themeMode === 'auto') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(media.matches);
      const listener = (e) => applyTheme(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      applyTheme(themeMode === 'dark');
    }

    localStorage.setItem(THEME_MODE_KEY, themeMode);
    localStorage.setItem('fintrack_theme', themeMode);
  }, [themeMode]);

  const setTextSize = useCallback((size) => setTextSizeState(size), []);
  const setDensity = useCallback((d) => setDensityState(d), []);
  const setReducedMotion = useCallback((rm) => setReducedMotionState(rm), []);
  const setThemeMode = useCallback((tm) => setThemeModeState(tm), []);

  return (
    <ComfortContext.Provider
      value={{
        textSize,
        setTextSize,
        density,
        setDensity,
        reducedMotion,
        setReducedMotion,
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </ComfortContext.Provider>
  );
};

export const useComfort = () => {
  const context = useContext(ComfortContext);
  if (!context) {
    throw new Error('useComfort must be used within ComfortProvider');
  }
  return context;
};

export default ComfortContext;
