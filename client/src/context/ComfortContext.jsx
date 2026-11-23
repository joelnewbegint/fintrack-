import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ComfortContext = createContext();

const TEXT_SIZE_KEY = 'fintrack_text_size';
const DENSITY_KEY = 'fintrack_density';
const REDUCED_MOTION_KEY = 'fintrack_reduced_motion';

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

  // Permanently lock to Ocean Blue and ignore old theme keys in localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'ocean-blue');
    root.classList.remove('dark');
  }, []);

  const setTextSize = useCallback((size) => setTextSizeState(size), []);
  const setDensity = useCallback((d) => setDensityState(d), []);
  const setReducedMotion = useCallback((rm) => setReducedMotionState(rm), []);
  const setThemeMode = useCallback(() => {}, []);

  return (
    <ComfortContext.Provider
      value={{
        textSize,
        setTextSize,
        density,
        setDensity,
        reducedMotion,
        setReducedMotion,
        themeMode: 'ocean-blue',
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
    throw new Error('useComfort must be used within a ComfortProvider');
  }
  return context;
};

export default ComfortContext;
