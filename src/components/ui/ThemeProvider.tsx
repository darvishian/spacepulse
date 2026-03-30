/**
 * Dark theme context provider for space theme
 * TODO: Implement dark mode toggle and theme configuration
 */

'use client';

import React, { createContext, useContext } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // TODO: Implement theme state with localStorage persistence
  const [isDark] = React.useState(true);

  const toggleTheme = React.useCallback(() => {
    // TODO: Implement theme toggle logic
    console.log('[ThemeProvider] Toggle theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
