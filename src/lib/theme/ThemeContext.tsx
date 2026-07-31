// @ts-nocheck - Legacy file, use ThemeContextEnhanced instead
/**
 * Theme Context & Provider
 * 
 * React context for theme state management with SSR support
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ThemeContextValue, ThemeMode, ResolvedTheme, AccentColor, ContrastLevel } from './types';
import { themeEngine } from './ThemeEngine';
import { THEME_DEFAULTS, THEME_CHANNEL, A11Y_CONFIG } from './constants';
import {
  resolveTheme,
  getSystemPreference,
  getReducedMotionPreference,
  getNextTheme,
  applyThemeClasses,
  applyThemeAttributes,
  announceThemeChange,
  preserveFocus,
  preserveScroll,
} from './utils';

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme Provider Props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  forceTheme?: ResolvedTheme | null;
  enableSystem?: boolean;
  enableAnimation?: boolean;
  storageKey?: string;
}

/**
 * Theme Provider
 */
export function ThemeProvider({
  children,
  defaultTheme,
  forceTheme = null,
  enableSystem = true,
  enableAnimation = true,
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme || THEME_DEFAULTS.MODE);
  const [accent, setAccentState] = useState<AccentColor>(THEME_DEFAULTS.ACCENT);
  const [contrast, setContrastState] = useState<ContrastLevel>(THEME_DEFAULTS.CONTRAST);
  const [motion, setMotionState] = useState<boolean>(THEME_DEFAULTS.MOTION);
  const [systemPreference, setSystemPreference] = useState(false);
  const [routeOverride, setRouteOverride] = useState<ResolvedTheme | null>(forceTheme);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize from engine
  useEffect(() => {
    const config = themeEngine.getConfig();
    setThemeState(config.mode);
    setAccentState(config.accent);
    setContrastState(config.contrast);
    setMotionState(config.motion);
    setSystemPreference(getSystemPreference());
    
    if (forceTheme) {
      themeEngine.setRouteOverride(forceTheme);
      setRouteOverride(forceTheme);
    }

    setMounted(true);
  }, [forceTheme]);

  // Listen to system preference changes
  useEffect(() => {
    if (!mounted || !enableSystem) return;

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleDarkChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto' || !motion) {
        setMotionState(!e.matches);
      }
    };

    darkMediaQuery.addEventListener('change', handleDarkChange);
    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      darkMediaQuery.removeEventListener('change', handleDarkChange);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, [mounted, enableSystem, theme, motion]);

  // Cross-tab synchronization
  useEffect(() => {
    if (!mounted) return;

    try {
      channelRef.current = new BroadcastChannel(THEME_CHANNEL);

      channelRef.current.onmessage = (event) => {
        const { type, value } = event.data;

        switch (type) {
          case 'theme':
            setThemeState(value);
            break;
          case 'accent':
            setAccentState(value);
            break;
          case 'contrast':
            setContrastState(value);
            break;
          case 'motion':
            setMotionState(value);
            break;
          case 'reset':
            const config = themeEngine.getConfig();
            setThemeState(config.mode);
            setAccentState(config.accent);
            setContrastState(config.contrast);
            setMotionState(config.motion);
            break;
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      channelRef.current?.close();
    };
  }, [mounted]);

  // Apply theme to DOM
  const resolvedTheme = useMemo(() => {
    return resolveTheme(theme, systemPreference, routeOverride);
  }, [theme, systemPreference, routeOverride]);

  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    const restoreFocus = A11Y_CONFIG.PRESERVE_FOCUS ? preserveFocus() : () => {};
    const restoreScroll = A11Y_CONFIG.PRESERVE_SCROLL ? preserveScroll() : () => {};

    // Apply classes and attributes
    applyThemeClasses(html, resolvedTheme, contrast, motion);
    applyThemeAttributes(html, theme, accent, contrast, motion);

    // Restore focus and scroll
    requestAnimationFrame(() => {
      restoreFocus();
      restoreScroll();
    });
  }, [mounted, theme, resolvedTheme, accent, contrast, motion]);

  // Set theme
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    themeEngine.setThemeMode(mode);

    if (A11Y_CONFIG.ANNOUNCE_THEME_CHANGE) {
      announceThemeChange(`Theme changed to ${mode}`);
    }

    // Broadcast to other tabs
    try {
      channelRef.current?.postMessage({ type: 'theme', value: mode });
    } catch {
      // Ignore
    }
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const next = getNextTheme(theme);
    setTheme(next);
  }, [theme, setTheme]);

  // Set accent
  const setAccent = useCallback((color: AccentColor) => {
    setAccentState(color);
    themeEngine.setAccent(color);

    try {
      channelRef.current?.postMessage({ type: 'accent', value: color });
    } catch {
      // Ignore
    }
  }, []);

  // Set contrast
  const setContrast = useCallback((level: ContrastLevel) => {
    setContrastState(level);
    themeEngine.setContrast(level);

    try {
      channelRef.current?.postMessage({ type: 'contrast', value: level });
    } catch {
      // Ignore
    }
  }, []);

  // Set motion
  const setMotion = useCallback((enabled: boolean) => {
    setMotionState(enabled);
    themeEngine.setMotion(enabled);

    try {
      channelRef.current?.postMessage({ type: 'motion', value: enabled });
    } catch {
      // Ignore
    }
  }, []);

  // Force theme (route override)
  const forceThemeFunc = useCallback((forced: ResolvedTheme | null) => {
    setRouteOverride(forced);
    themeEngine.setRouteOverride(forced);
  }, []);

  // Clear override
  const clearOverride = useCallback(() => {
    setRouteOverride(null);
    themeEngine.clearRouteOverride();
  }, []);

  // Reset
  const reset = useCallback(() => {
    themeEngine.reset();
    const config = themeEngine.getConfig();
    setThemeState(config.mode);
    setAccentState(config.accent);
    setContrastState(config.contrast);
    setMotionState(config.motion);

    try {
      channelRef.current?.postMessage({ type: 'reset' });
    } catch {
      // Ignore
    }
  }, []);

  // Context value
  const value: ThemeContextValue = useMemo(() => ({
    // State
    theme,
    resolvedTheme,
    accent,
    contrast,
    motion,

    // Computed
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isHighContrast: resolvedTheme === 'high-contrast' || contrast === 'high',
    isAuto: theme === 'auto',
    isReducedMotion: !motion,

    // Actions
    setTheme,
    toggleTheme,
    setAccent,
    setContrast,
    setMotion,
    reset,
    forceTheme: forceThemeFunc,
    clearOverride,
  }), [
    theme,
    resolvedTheme,
    accent,
    contrast,
    motion,
    setTheme,
    toggleTheme,
    setAccent,
    setContrast,
    setMotion,
    reset,
    forceThemeFunc,
    clearOverride,
  ]);

  // During SSR or before mount, render with defaults
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme Hook
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

/**
 * useThemeValue Hook (optimized for specific values)
 */
export function useThemeValue<K extends keyof ThemeContextValue>(
  key: K
): ThemeContextValue[K] {
  const context = useTheme();
  return context[key];
}
