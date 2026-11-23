import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'golden-cream',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'golden-cream');
    root.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'golden-cream', setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};

export default ThemeContext;
