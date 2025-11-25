'use client';

import { Theme } from '@radix-ui/themes';
import { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'enix-theme',
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const storedTheme = localStorage.getItem(storageKey) as ThemeMode | null;
    const initialTheme = storedTheme || defaultTheme;
    
    if (initialTheme !== theme) {
      setTheme(initialTheme);
    }
  }, [storageKey, defaultTheme, theme]);

  useEffect(() => {
    if (!mounted) return;

    const resolveTheme = (themeToResolve: ThemeMode): 'dark' | 'light' => {
      if (themeToResolve === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return themeToResolve;
    };

    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);

    // Apply theme to document for CSS variables
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
  }, [theme, mounted]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.setAttribute('data-theme', resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleSetTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newTheme);
    }
  };

  const contextValue = mounted
    ? {
        theme,
        setTheme: handleSetTheme,
        resolvedTheme,
      }
    : {
        theme: defaultTheme,
        setTheme: handleSetTheme,
        resolvedTheme: defaultTheme === 'system' ? 'dark' : defaultTheme,
      };

  const radixAppearance = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <ThemeContext.Provider value={contextValue}>
      <Theme 
        appearance={radixAppearance}
        accentColor="orange"
        grayColor="slate"
        radius="medium"
        scaling="100%"
      >
        {children}
      </Theme>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

