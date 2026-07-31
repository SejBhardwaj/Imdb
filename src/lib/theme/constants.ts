/**
 * Theme System Constants
 * 
 * Centralized configuration for the entire theme infrastructure
 */

import type { ThemeMode, ResolvedTheme, AccentColor } from './types';

/**
 * Storage Keys
 */
export const THEME_STORAGE = {
  COOKIE_NAME: 'theme-preference',
  STORAGE_KEY: 'imdb-theme',
  ACCENT_KEY: 'imdb-accent',
  CONTRAST_KEY: 'imdb-contrast',
  MOTION_KEY: 'imdb-motion',
  ROUTE_OVERRIDE_KEY: 'imdb-theme-route-override',
} as const;

// Export for easier access
export const THEME_COOKIE_NAME = THEME_STORAGE.COOKIE_NAME;

/**
 * Default Values
 */
export const THEME_DEFAULTS = {
  MODE: 'dark' as ThemeMode,
  RESOLVED: 'dark' as ResolvedTheme,
  ACCENT: 'red' as AccentColor,
  MOTION: true,
} as const;

/**
 * Theme Modes
 */
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'high-contrast', 'system'];
export const RESOLVED_THEMES: readonly ResolvedTheme[] = ['light', 'dark', 'high-contrast'];

/**
 * Accent Colors
 */
export const ACCENT_COLORS: readonly AccentColor[] = [
  'red',
  'blue',
  'green',
  'purple',
  'orange',
  'pink',
];

/**
 * HTML Attributes
 */
export const HTML_ATTRIBUTES = {
  CLASS_ATTR: 'class',
  DATA_THEME: 'data-theme',
  DATA_ACCENT: 'data-accent',
  DATA_CONTRAST: 'data-contrast',
  DATA_MOTION: 'data-motion',
} as const;

/**
 * CSS Variables Prefix
 */
export const CSS_VAR_PREFIX = '--color-' as const;

/**
 * Media Queries
 */
export const MEDIA_QUERIES = {
  DARK: '(prefers-color-scheme: dark)',
  LIGHT: '(prefers-color-scheme: light)',
  REDUCED_MOTION: '(prefers-reduced-motion: reduce)',
  HIGH_CONTRAST: '(prefers-contrast: more)',
} as const;

/**
 * BroadcastChannel Name
 */
export const THEME_CHANNEL = 'imdb-theme-sync' as const;

/**
 * Theme Resolution Priority
 * Higher number = higher priority
 */
export const RESOLUTION_PRIORITY = {
  ROUTE_OVERRIDE: 100,
  DATABASE: 80,
  COOKIE: 60,
  LOCAL_STORAGE: 40,
  SYSTEM_PREFERENCE: 20,
  DEFAULT: 0,
} as const;

/**
 * Cookie Configuration
 */
export const COOKIE_CONFIG = {
  MAX_AGE: 365 * 24 * 60 * 60, // 1 year in seconds
  PATH: '/',
  SAME_SITE: 'lax' as const,
  SECURE: true,
} as const;

/**
 * Performance Budgets (milliseconds)
 */
export const PERFORMANCE_BUDGETS = {
  RESOLUTION: 5, // Theme resolution must complete in <5ms
  SWITCH_DESKTOP: 16, // Theme switch must complete in <16ms (60fps)
  SWITCH_MOBILE: 32, // Theme switch on mobile <32ms
  ANIMATION_DURATION: 200, // Cross-fade duration
} as const;

/**
 * Debounce Delays (milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  DATABASE_SYNC: 500, // Delay before syncing to database
  STORAGE_SYNC: 100, // Delay before syncing to localStorage
  TELEMETRY: 1000, // Delay before sending telemetry
} as const;

/**
 * Feature Flags
 */
export const THEME_FEATURES = {
  ENABLE_DATABASE_SYNC: true,
  ENABLE_CROSS_TAB_SYNC: true,
  ENABLE_ROUTE_OVERRIDES: true,
  ENABLE_TELEMETRY: false,
  ENABLE_SSR: true,
  ENABLE_ANIMATIONS: true,
  ENABLE_CSP: true,
} as const;

/**
 * Animation Configs
 */
export const ANIMATION_CONFIG = {
  // Spring physics
  SPRING: {
    stiffness: 300,
    damping: 30,
    mass: 0.5,
    restDelta: 0.001,
  },
  
  // Transition durations
  DURATION: {
    fast: 0.15,
    normal: 0.2,
    slow: 0.3,
  },
  
  // Easing curves
  EASING: {
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
  },
} as const;

/**
 * Accessibility Config
 */
export const A11Y_CONFIG = {
  ANNOUNCE_THEME_CHANGE: true,
  PRESERVE_FOCUS: true,
  PRESERVE_SCROLL: true,
  KEYBOARD_SHORTCUTS: {
    TOGGLE_THEME: 'ctrl+shift+l',
    CYCLE_THEMES: 'ctrl+shift+t',
  },
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  INVALID_THEME: 'Invalid theme mode provided',
  INVALID_ACCENT: 'Invalid accent color provided',
  INVALID_CONTRAST: 'Invalid contrast level provided',
  COOKIE_PARSE_FAILED: 'Failed to parse theme cookie',
  STORAGE_UNAVAILABLE: 'LocalStorage is not available',
  DATABASE_SYNC_FAILED: 'Failed to sync theme to database',
  HYDRATION_MISMATCH: 'Theme hydration mismatch detected',
} as const;

/**
 * Development Warnings
 */
export const DEV_WARNINGS = {
  MULTIPLE_PROVIDERS: 'Multiple ThemeProviders detected. Only one should be used.',
  NO_PROVIDER: 'useTheme must be used within ThemeProvider',
  SSR_MISMATCH: 'SSR theme does not match client theme',
  ANIMATION_DISABLED: 'Theme animations disabled due to reduced motion preference',
} as const;

/**
 * CSS Class Names
 */
export const CSS_CLASSES = {
  LIGHT: 'light',
  DARK: 'dark',
  HIGH_CONTRAST: 'high-contrast',
  REDUCED_MOTION: 'reduce-motion',
  TRANSITIONING: 'theme-transitioning',
} as const;

/**
 * Validation Patterns
 */
export const VALIDATION = {
  THEME_MODE: /^(light|dark|high-contrast|auto)$/,
  ACCENT_COLOR: /^(red|blue|green|purple|orange|pink)$/,
  CONTRAST_LEVEL: /^(normal|high)$/,
} as const;
