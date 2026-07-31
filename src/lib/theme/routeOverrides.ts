/**
 * Route-Specific Theme Overrides
 * 
 * Force specific themes on certain routes:
 * - Movie trailers → Always dark
 * - Documentation → Always light
 * - Admin → High contrast
 */

import type { ThemeMode, ResolvedTheme } from './types';

export interface RouteThemeOverride {
  pattern: string | RegExp;
  theme?: ThemeMode;
  resolvedTheme?: ResolvedTheme;
  priority: number;
  reason?: string;
}

/**
 * Route override configuration
 */
export const ROUTE_OVERRIDES: RouteThemeOverride[] = [
  // Movie trailers always dark for cinematic experience
  {
    pattern: /\/movies\/\d+\/trailer/,
    theme: 'dark',
    resolvedTheme: 'dark',
    priority: 10,
    reason: 'Cinematic experience',
  },
  
  // Watch mode always dark
  {
    pattern: /\/watch/,
    theme: 'dark',
    resolvedTheme: 'dark',
    priority: 10,
    reason: 'Video playback',
  },
  
  // Admin dashboard can use high contrast
  {
    pattern: /\/admin/,
    theme: 'high-contrast',
    resolvedTheme: 'high-contrast',
    priority: 8,
    reason: 'Accessibility',
  },
  
  // Documentation prefers light theme
  {
    pattern: /\/docs/,
    theme: 'light',
    resolvedTheme: 'light',
    priority: 5,
    reason: 'Readability',
  },
];

/**
 * Get theme override for current route
 */
export function getRouteThemeOverride(pathname: string): RouteThemeOverride | null {
  const matches = ROUTE_OVERRIDES.filter(override => {
    if (typeof override.pattern === 'string') {
      return pathname.startsWith(override.pattern);
    }
    return override.pattern.test(pathname);
  });

  if (matches.length === 0) {
    return null;
  }

  // Return highest priority match
  return matches.sort((a, b) => b.priority - a.priority)[0];
}

/**
 * Check if route has override
 */
export function hasRouteOverride(pathname: string): boolean {
  return getRouteThemeOverride(pathname) !== null;
}

/**
 * Get override reason (for UI display)
 */
export function getOverrideReason(pathname: string): string | null {
  const override = getRouteThemeOverride(pathname);
  return override?.reason || null;
}
