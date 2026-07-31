// @ts-nocheck - Legacy file, use ThemeContextEnhanced instead
/**
 * Theme Engine
 * 
 * Core theme resolution and persistence logic
 * Handles SSR, client-side updates, and synchronization
 */

import type {
  ThemeMode,
  ResolvedTheme,
  AccentColor,
  ContrastLevel,
  ThemeConfig,
  ThemePreferences,
  ThemeResolutionResult,
} from './types';
import {
  THEME_STORAGE,
  THEME_DEFAULTS,
  RESOLUTION_PRIORITY,
  COOKIE_CONFIG,
} from './constants';
import {
  resolveTheme,
  getSystemPreference,
  getReducedMotionPreference,
  isValidThemeMode,
  isValidAccentColor,
  isValidContrastLevel,
  parseThemeCookie,
  serializeThemeCookie,
  isLocalStorageAvailable,
} from './utils';

/**
 * Theme Resolution Engine
 */
export class ThemeEngine {
  private routeOverride: ResolvedTheme | null = null;
  private systemPreference: boolean = false;
  private reducedMotionPreference: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.systemPreference = getSystemPreference();
      this.reducedMotionPreference = getReducedMotionPreference();
      this.listenToSystemChanges();
    }
  }

  /**
   * Resolve theme from all sources (priority order)
   */
  resolve(): ThemeResolutionResult {
    // 1. Route Override (highest priority)
    if (this.routeOverride) {
      return {
        mode: this.routeOverride,
        resolved: this.routeOverride,
        strategy: 'route-override',
        source: 'route',
      };
    }

    // 2. Cookie
    const cookiePrefs = this.readCookie();
    if (cookiePrefs?.mode) {
      const resolved = resolveTheme(
        cookiePrefs.mode,
        this.systemPreference,
        this.routeOverride
      );
      return {
        mode: cookiePrefs.mode,
        resolved,
        strategy: 'cookie',
        source: 'cookie',
      };
    }

    // 3. LocalStorage
    const storagePrefs = this.readLocalStorage();
    if (storagePrefs?.mode) {
      const resolved = resolveTheme(
        storagePrefs.mode,
        this.systemPreference,
        this.routeOverride
      );
      return {
        mode: storagePrefs.mode,
        resolved,
        strategy: 'localStorage',
        source: 'localStorage',
      };
    }

    // 4. System Preference
    const systemMode: ThemeMode = 'auto';
    const resolved = resolveTheme(systemMode, this.systemPreference, this.routeOverride);
    
    return {
      mode: systemMode,
      resolved,
      strategy: 'system',
      source: 'system',
    };
  }

  /**
   * Get full theme configuration
   */
  getConfig(): ThemeConfig {
    const resolution = this.resolve();
    const prefs = this.readAllPreferences();

    return {
      mode: resolution.mode,
      resolved: resolution.resolved,
      accent: prefs.accent || THEME_DEFAULTS.ACCENT,
      contrast: prefs.contrast || THEME_DEFAULTS.CONTRAST,
      motion: prefs.motion ?? !this.reducedMotionPreference,
    };
  }

  /**
   * Set theme mode
   */
  setThemeMode(mode: ThemeMode): void {
    if (!isValidThemeMode(mode)) {
      throw new Error(`Invalid theme mode: ${mode}`);
    }

    this.writeCookie({ mode });
    this.writeLocalStorage({ mode });
  }

  /**
   * Set accent color
   */
  setAccent(accent: AccentColor): void {
    if (!isValidAccentColor(accent)) {
      throw new Error(`Invalid accent color: ${accent}`);
    }

    this.writeCookie({ accent });
    this.writeLocalStorage({ accent });
  }

  /**
   * Set contrast level
   */
  setContrast(contrast: ContrastLevel): void {
    if (!isValidContrastLevel(contrast)) {
      throw new Error(`Invalid contrast level: ${contrast}`);
    }

    this.writeCookie({ contrast });
    this.writeLocalStorage({ contrast });
  }

  /**
   * Set motion preference
   */
  setMotion(motion: boolean): void {
    this.writeCookie({ motion });
    this.writeLocalStorage({ motion });
  }

  /**
   * Set route override
   */
  setRouteOverride(theme: ResolvedTheme | null): void {
    this.routeOverride = theme;
  }

  /**
   * Clear route override
   */
  clearRouteOverride(): void {
    this.routeOverride = null;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.clearCookie();
    this.clearLocalStorage();
    this.routeOverride = null;
  }

  /**
   * Read preferences from cookie
   */
  private readCookie(): Partial<ThemePreferences> | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split('; ');
    const themeCookie = cookies.find((c) => c.startsWith(THEME_STORAGE.COOKIE_NAME + '='));

    if (!themeCookie) return null;

    const value = themeCookie.substring(THEME_STORAGE.COOKIE_NAME.length + 1);
    return parseThemeCookie(value);
  }

  /**
   * Write preferences to cookie
   */
  private writeCookie(prefs: Partial<ThemePreferences>): void {
    if (typeof document === 'undefined') return;

    const existing = this.readCookie() || {};
    const updated = { ...existing, ...prefs };
    const value = serializeThemeCookie(updated);

    const cookie = [
      `${THEME_STORAGE.COOKIE_NAME}=${value}`,
      `max-age=${COOKIE_CONFIG.MAX_AGE}`,
      `path=${COOKIE_CONFIG.PATH}`,
      `samesite=${COOKIE_CONFIG.SAME_SITE}`,
      COOKIE_CONFIG.SECURE ? 'secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    document.cookie = cookie;
  }

  /**
   * Clear cookie
   */
  private clearCookie(): void {
    if (typeof document === 'undefined') return;

    document.cookie = `${THEME_STORAGE.COOKIE_NAME}=; max-age=0; path=${COOKIE_CONFIG.PATH}`;
  }

  /**
   * Read preferences from localStorage
   */
  private readLocalStorage(): Partial<ThemePreferences> | null {
    if (!isLocalStorageAvailable()) return null;

    try {
      const stored = localStorage.getItem(THEME_STORAGE.STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const result: Partial<ThemePreferences> = {};

      if (isValidThemeMode(parsed.mode)) result.mode = parsed.mode;
      if (isValidAccentColor(parsed.accent)) result.accent = parsed.accent;
      if (isValidContrastLevel(parsed.contrast)) result.contrast = parsed.contrast;
      if (typeof parsed.motion === 'boolean') result.motion = parsed.motion;

      return Object.keys(result).length > 0 ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Write preferences to localStorage
   */
  private writeLocalStorage(prefs: Partial<ThemePreferences>): void {
    if (!isLocalStorageAvailable()) return;

    try {
      const existing = this.readLocalStorage() || {};
      const updated = { ...existing, ...prefs };
      localStorage.setItem(THEME_STORAGE.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail
    }
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): void {
    if (!isLocalStorageAvailable()) return;

    try {
      localStorage.removeItem(THEME_STORAGE.STORAGE_KEY);
    } catch {
      // Silently fail
    }
  }

  /**
   * Read all preferences from all sources
   */
  private readAllPreferences(): Partial<ThemePreferences> {
    const cookie = this.readCookie();
    const storage = this.readLocalStorage();

    return {
      mode: cookie?.mode || storage?.mode,
      accent: cookie?.accent || storage?.accent,
      contrast: cookie?.contrast || storage?.contrast,
      motion: cookie?.motion ?? storage?.motion,
    };
  }

  /**
   * Listen to system preference changes
   */
  private listenToSystemChanges(): void {
    if (typeof window === 'undefined') return;

    // Dark mode
    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkMediaQuery.addEventListener('change', (e) => {
      this.systemPreference = e.matches;
    });

    // Reduced motion
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionMediaQuery.addEventListener('change', (e) => {
      this.reducedMotionPreference = e.matches;
    });
  }
}

// Singleton instance
export const themeEngine = new ThemeEngine();
