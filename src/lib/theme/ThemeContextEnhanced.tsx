/**
 * Enhanced Theme Context with Database Integration
 * 
 * Features:
 * - Database persistence for authenticated users
 * - Cross-device synchronization
 * - Priority-based theme resolution
 * - Optimistic updates
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { ThemeMode, ResolvedTheme, ThemeConfig, ThemeState, AccentColor } from './types';
import { ThemeEngine } from './ThemeEngine';
import { THEME_STORAGE, THEME_DEFAULTS, DEBOUNCE_DELAYS } from './constants';
import { themeSyncManager, generateDeviceId, resolveThemeConflict } from './sync';

interface ThemeContextValue extends ThemeState {
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  setStrongFocusRings: (enabled: boolean) => void;
  setFontScale: (scale: number) => void;
  setAnimations: (enabled: boolean) => void;
  toggleTheme: () => void;
  resetToDefaults: () => void;
  isAuthenticated: boolean;
  userId: string | null;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderEnhancedProps {
  children: ReactNode;
  userId?: string | null;
  defaultTheme?: ThemeMode;
  serverTheme?: ResolvedTheme;
  enableSync?: boolean;
}

export function ThemeProviderEnhanced({
  children,
  userId = null,
  defaultTheme = THEME_DEFAULTS.MODE,
  serverTheme,
  enableSync = true,
}: ThemeProviderEnhancedProps) {
  const [deviceId] = useState(() => generateDeviceId());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Theme state
  const [config, setConfig] = useState<ThemeConfig>(() => ({
    theme: defaultTheme,
    resolvedTheme: serverTheme || THEME_DEFAULTS.RESOLVED,
    accentColor: THEME_DEFAULTS.ACCENT,
    highContrastEnabled: false,
    reducedMotion: false,
    largeText: false,
    strongFocusRings: false,
    fontScale: 1.0,
    animations: true,
    borderRadius: 'medium',
    density: 'comfortable',
    autoScheduleEnabled: false,
  }));

  const [isSyncing, setIsSyncing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>();

  const isAuthenticated = userId !== null;

  /**
   * Load preferences from database on mount (authenticated users)
   */
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setIsInitialized(true);
      return;
    }

    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user/preferences/theme', {
          headers: {
            'X-User-Id': userId,
          },
        });

        if (response.ok) {
          const { data } = await response.json();
          
          // Resolve conflict with local state
          const resolved = resolveThemeConflict(
            { ...config, updatedAt: lastSyncedAt },
            { ...data, updatedAt: new Date(data.updatedAt) }
          );

          setConfig(prev => ({ ...prev, ...resolved }));
          setLastSyncedAt(new Date(data.updatedAt));
        }
      } catch (error) {
        console.error('Failed to load theme preferences:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadPreferences();
  }, [userId, isAuthenticated]);

  /**
   * Setup sync manager for authenticated users
   */
  useEffect(() => {
    if (!isAuthenticated || !userId || !enableSync) {
      return;
    }

    // Connect to sync services
    themeSyncManager.connect(userId, deviceId);

    // Listen for remote updates
    themeSyncManager.onRemoteUpdate((remoteConfig) => {
      setConfig(prev => ({ ...prev, ...remoteConfig }));
      setLastSyncedAt(new Date());
    });

    return () => {
      themeSyncManager.disconnect();
    };
  }, [userId, deviceId, isAuthenticated, enableSync]);

  /**
   * Apply theme using ThemeEngine
   */
  useEffect(() => {
    if (!isInitialized) return;

    // Apply theme class to HTML element
    const html = document.documentElement;
    
    // Remove all theme classes
    html.classList.remove('light', 'dark', 'high-contrast');
    
    // Add current theme class
    html.classList.add(config.resolvedTheme);
    html.setAttribute('data-theme', config.resolvedTheme);
    
    // Apply additional settings
    if (config.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    if (config.highContrastEnabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Apply accent color
    document.documentElement.setAttribute('data-accent', config.accentColor);
    
    // Apply font scale
    document.documentElement.style.fontSize = `${config.fontScale * 100}%`;
  }, [config, isInitialized]);

  /**
   * Sync to database (debounced)
   */
  const syncToDatabase = useCallback(
    async (updates: Partial<ThemeConfig>) => {
      if (!isAuthenticated || !userId) {
        return;
      }

      setIsSyncing(true);

      try {
        await themeSyncManager.syncToDatabase(updates);
        setLastSyncedAt(new Date());
      } catch (error) {
        console.error('Failed to sync theme:', error);
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated, userId]
  );

  /**
   * Update theme with optimistic UI
   */
  const updateTheme = useCallback(
    (updates: Partial<ThemeConfig>) => {
      // Optimistic update
      setConfig(prev => ({ ...prev, ...updates }));

      // Sync to localStorage
      if (updates.theme && typeof window !== 'undefined') {
        try {
          localStorage.setItem('theme-preference', updates.theme);
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
      }

      // Sync to database (debounced)
      if (isAuthenticated) {
        syncToDatabase(updates);
      }
    },
    [isAuthenticated, syncToDatabase]
  );

  /**
   * Set theme mode
   */
  const setTheme = useCallback(
    (theme: ThemeMode) => {
      setIsTransitioning(true);
      
      const resolvedTheme = theme === 'system'
        ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : (theme as ResolvedTheme);

      updateTheme({ theme, resolvedTheme });

      setTimeout(() => setIsTransitioning(false), 200);
    },
    [updateTheme]
  );

  /**
   * Set accent color
   */
  const setAccentColor = useCallback(
    (accentColor: AccentColor) => {
      updateTheme({ accentColor });
    },
    [updateTheme]
  );

  /**
   * Toggle reduced motion
   */
  const setReducedMotion = useCallback(
    (reducedMotion: boolean) => {
      updateTheme({ reducedMotion, animations: !reducedMotion });
    },
    [updateTheme]
  );

  /**
   * Toggle high contrast
   */
  const setHighContrast = useCallback(
    (highContrastEnabled: boolean) => {
      updateTheme({
        highContrastEnabled,
        theme: highContrastEnabled ? 'high-contrast' : config.theme,
        resolvedTheme: highContrastEnabled ? 'high-contrast' : config.resolvedTheme,
      });
    },
    [updateTheme, config.theme, config.resolvedTheme]
  );

  /**
   * Toggle large text
   */
  const setLargeText = useCallback(
    (largeText: boolean) => {
      updateTheme({ largeText, fontScale: largeText ? 1.25 : 1.0 });
    },
    [updateTheme]
  );

  /**
   * Toggle strong focus rings
   */
  const setStrongFocusRings = useCallback(
    (strongFocusRings: boolean) => {
      updateTheme({ strongFocusRings });
    },
    [updateTheme]
  );

  /**
   * Set font scale
   */
  const setFontScale = useCallback(
    (fontScale: number) => {
      updateTheme({ fontScale, largeText: fontScale > 1.0 });
    },
    [updateTheme]
  );

  /**
   * Set animations
   */
  const setAnimations = useCallback(
    (animations: boolean) => {
      updateTheme({ animations, reducedMotion: !animations });
    },
    [updateTheme]
  );

  /**
   * Toggle between light/dark
   */
  const toggleTheme = useCallback(() => {
    const nextTheme = config.resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  }, [config.resolvedTheme, setTheme]);

  /**
   * Reset to defaults
   */
  const resetToDefaults = useCallback(async () => {
    setConfig({
      theme: THEME_DEFAULTS.MODE,
      resolvedTheme: THEME_DEFAULTS.RESOLVED,
      accentColor: THEME_DEFAULTS.ACCENT,
      highContrastEnabled: false,
      reducedMotion: false,
      largeText: false,
      strongFocusRings: false,
      fontScale: 1.0,
      animations: true,
      borderRadius: 'medium',
      density: 'comfortable',
      autoScheduleEnabled: false,
    });

    if (isAuthenticated && userId) {
      await fetch('/api/user/preferences/theme', {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId,
        },
      });
    }
  }, [isAuthenticated, userId]);

  const value: ThemeContextValue = useMemo(
    () => ({
      ...config,
      isTransitioning,
      isSyncing,
      lastSyncedAt,
      deviceId,
      setTheme,
      setAccentColor,
      setReducedMotion,
      setHighContrast,
      setLargeText,
      setStrongFocusRings,
      setFontScale,
      setAnimations,
      toggleTheme,
      resetToDefaults,
      isAuthenticated,
      userId,
    }),
    [
      config,
      isTransitioning,
      isSyncing,
      lastSyncedAt,
      deviceId,
      setTheme,
      setAccentColor,
      setReducedMotion,
      setHighContrast,
      setLargeText,
      setStrongFocusRings,
      setFontScale,
      setAnimations,
      toggleTheme,
      resetToDefaults,
      isAuthenticated,
      userId,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 */
export function useThemeEnhanced() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeEnhanced must be used within ThemeProviderEnhanced');
  }
  
  return context;
}

/**
 * Hook to check if theme is syncing
 */
export function useThemeSyncStatus() {
  const { isSyncing, lastSyncedAt } = useThemeEnhanced();
  return { isSyncing, lastSyncedAt };
}

/**
 * Hook for theme transitions
 */
export function useThemeTransition() {
  const { isTransitioning } = useThemeEnhanced();
  return isTransitioning;
}
