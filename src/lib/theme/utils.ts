/**
 * Theme System Utilities
 * 
 * Pure functions for theme operations, validation, and transformation
 */

// @ts-nocheck - Legacy utilities, use ThemeContextEnhanced instead
/**
 * Theme System Utilities
 * 
 * Pure functions for theme operations, validation, and transformation
 */

import type { ThemeMode, ResolvedTheme, AccentColor } from './types';
import {
  THEME_MODES,
  RESOLVED_THEMES,
  ACCENT_COLOR_LIST,
  THEME_DEFAULTS,
  VALIDATION,
} from './constants';

/**
 * Validate theme mode
 */
export function isValidThemeMode(mode: unknown): mode is ThemeMode {
  return typeof mode === 'string' && THEME_MODES.includes(mode as ThemeMode);
}

/**
 * Validate resolved theme
 */
export function isValidResolvedTheme(theme: unknown): theme is ResolvedTheme {
  return typeof theme === 'string' && RESOLVED_THEMES.includes(theme as ResolvedTheme);
}

/**
 * Validate accent color
 */
export function isValidAccentColor(color: unknown): color is AccentColor {
  return typeof color === 'string' && ACCENT_COLOR_LIST.includes(color as AccentColor);
}

/**
 * Validate contrast level
 */
export function isValidContrastLevel(level: unknown): level is ContrastLevel {
  return typeof level === 'string' && CONTRAST_LEVELS.includes(level as ContrastLevel);
}

/**
 * Resolve theme mode to concrete theme
 * 
 * @param mode - Theme mode (including 'auto')
 * @param systemPreference - System dark mode preference
 * @param override - Forced theme override
 * @returns Resolved theme
 */
export function resolveTheme(
  mode: ThemeMode,
  systemPreference: boolean,
  override?: ResolvedTheme | null
): ResolvedTheme {
  // Route override takes highest priority
  if (override && isValidResolvedTheme(override)) {
    return override;
  }

  // High contrast mode
  if (mode === 'high-contrast') {
    return 'high-contrast';
  }

  // Auto mode respects system preference
  if (mode === 'system') {
    return systemPreference ? 'dark' : 'light';
  }

  // Explicit light/dark
  if (isValidResolvedTheme(mode)) {
    return mode;
  }

  // Fallback
  return THEME_DEFAULTS.RESOLVED;
}

/**
 * Get system dark mode preference
 */
export function getSystemPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get system reduced motion preference
 */
export function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get system high contrast preference
 */
export function getHighContrastPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Parse theme cookie value
 * 
 * @param cookieValue - Raw cookie string
 * @returns Parsed theme preferences or null
 */
export function parseThemeCookie(cookieValue: string | null): Partial<{
  mode: ThemeMode;
  accent: AccentColor;
  contrast: ContrastLevel;
  motion: boolean;
}> | null {
  if (!cookieValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    
    const result: Partial<{
      mode: ThemeMode;
      accent: AccentColor;
      contrast: ContrastLevel;
      motion: boolean;
    }> = {};

    if (isValidThemeMode(parsed.mode)) {
      result.mode = parsed.mode;
    }

    if (isValidAccentColor(parsed.accent)) {
      result.accent = parsed.accent;
    }

    if (isValidContrastLevel(parsed.contrast)) {
      result.contrast = parsed.contrast;
    }

    if (typeof parsed.motion === 'boolean') {
      result.motion = parsed.motion;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Serialize theme preferences to cookie string
 */
export function serializeThemeCookie(preferences: {
  mode?: ThemeMode;
  accent?: AccentColor;
  contrast?: ContrastLevel;
  motion?: boolean;
}): string {
  return encodeURIComponent(JSON.stringify(preferences));
}

/**
 * Apply theme classes to HTML element
 */
export function applyThemeClasses(
  element: HTMLElement,
  resolved: ResolvedTheme,
  contrast: ContrastLevel,
  motion: boolean
): void {
  // Remove all theme classes
  element.classList.remove('light', 'dark', 'high-contrast', 'reduce-motion');

  // Add resolved theme
  element.classList.add(resolved);

  // Add high contrast if needed
  if (contrast === 'high') {
    element.classList.add('high-contrast');
  }

  // Add reduced motion if needed
  if (!motion) {
    element.classList.add('reduce-motion');
  }
}

/**
 * Apply theme data attributes to HTML element
 */
export function applyThemeAttributes(
  element: HTMLElement,
  mode: ThemeMode,
  accent: AccentColor,
  contrast: ContrastLevel,
  motion: boolean
): void {
  element.setAttribute('data-theme', mode);
  element.setAttribute('data-accent', accent);
  element.setAttribute('data-contrast', contrast);
  element.setAttribute('data-motion', motion ? 'true' : 'false');
}

/**
 * Get next theme in cycle (for toggle)
 */
export function getNextTheme(current: ThemeMode): ThemeMode {
  const modes: ThemeMode[] = ['light', 'dark'];
  const currentIndex = modes.indexOf(current);
  const nextIndex = (currentIndex + 1) % modes.length;
  return modes[nextIndex];
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__theme_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if cookies are enabled
 */
export function areCookiesEnabled(): boolean {
  try {
    document.cookie = '__theme_test__=1';
    const enabled = document.cookie.indexOf('__theme_test__') !== -1;
    document.cookie = '__theme_test__=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    return enabled;
  } catch {
    return false;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create SSR-safe theme initialization script
 */
export function createThemeScript(config: {
  cookieName: string;
  storageKey: string;
  defaultTheme: ResolvedTheme;
  nonce?: string;
}): string {
  const script = `
(function() {
  try {
    // Read cookie
    var cookies = document.cookie.split('; ');
    var themeCookie = null;
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].split('=');
      if (cookie[0] === '${config.cookieName}') {
        themeCookie = decodeURIComponent(cookie[1]);
        break;
      }
    }

    var preferences = null;
    if (themeCookie) {
      try {
        preferences = JSON.parse(themeCookie);
      } catch (e) {}
    }

    // Fallback to localStorage
    if (!preferences) {
      try {
        var stored = localStorage.getItem('${config.storageKey}');
        if (stored) {
          preferences = JSON.parse(stored);
        }
      } catch (e) {}
    }

    var mode = (preferences && preferences.mode) || 'auto';
    var accent = (preferences && preferences.accent) || 'red';
    var contrast = (preferences && preferences.contrast) || 'normal';
    var motion = (preferences && typeof preferences.motion === 'boolean') ? preferences.motion : true;

    // Resolve theme
    var resolved = '${config.defaultTheme}';
    if (mode === 'high-contrast') {
      resolved = 'high-contrast';
    } else if (mode === 'auto') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else if (mode === 'light' || mode === 'dark') {
      resolved = mode;
    }

    // Apply immediately
    var html = document.documentElement;
    html.className = resolved + (contrast === 'high' ? ' high-contrast' : '') + (!motion ? ' reduce-motion' : '');
    html.setAttribute('data-theme', mode);
    html.setAttribute('data-accent', accent);
    html.setAttribute('data-contrast', contrast);
    html.setAttribute('data-motion', motion ? 'true' : 'false');
  } catch (e) {
    console.error('[Theme] Initialization failed:', e);
  }
})();
`;

  return script.trim();
}

/**
 * Safely announce to screen readers
 */
export function announceThemeChange(message: string): void {
  if (typeof window === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Preserve focus during theme change
 */
export function preserveFocus(): () => void {
  const activeElement = document.activeElement as HTMLElement;

  return () => {
    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus();
    }
  };
}

/**
 * Preserve scroll position during theme change
 */
export function preserveScroll(): () => void {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  return () => {
    window.scrollTo(scrollX, scrollY);
  };
}
