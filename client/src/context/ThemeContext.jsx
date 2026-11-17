import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Default to 'lavender-glass' for new users; respect existing preference
    return localStorage.getItem('fintrack_theme') || 'lavender-glass';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'lavender-glass') {
      root.setAttribute('data-theme', 'lavender-glass');
      root.classList.remove('dark');
    } else if (theme === 'glass') {
      root.setAttribute('data-theme', 'glass');
      root.classList.remove('dark');
    } else {
      root.removeAttribute('data-theme');
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    localStorage.setItem('fintrack_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'lavender-glass') return 'light';
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'glass';
      return 'lavender-glass';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
