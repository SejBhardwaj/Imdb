/**
 * Enterprise Theme System Types
 */

export type ThemeMode = 'light' | 'dark' | 'system' | 'high-contrast';
export type ResolvedTheme = 'light' | 'dark' | 'high-contrast';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large';
export type Density = 'compact' | 'comfortable' | 'spacious';

export interface ThemeConfig {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accentColor: AccentColor;
  highContrastEnabled: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  strongFocusRings: boolean;
  fontScale: number;
  animations: boolean;
  borderRadius: BorderRadius;
  density: Density;
  autoScheduleEnabled: boolean;
  autoScheduleSunrise?: string;
  autoScheduleSunset?: string;
}

export interface ThemeState extends ThemeConfig {
  isTransitioning: boolean;
  isSyncing: boolean;
  lastSyncedAt?: Date;
  deviceId?: string;
}

export interface ThemeSyncEvent {
  type: 'theme_update';
  userId: string;
  preferences: Partial<ThemeConfig>;
  deviceId: string;
  timestamp: number;
}

export interface ThemeOverride {
  route?: string;
  component?: string;
  theme?: ThemeMode;
  resolvedTheme?: ResolvedTheme;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  config: Partial<ThemeConfig>;
  preview: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default-light',
    name: 'Light',
    description: 'Clean and bright',
    config: {
      theme: 'light',
      resolvedTheme: 'light',
      accentColor: 'blue',
    },
    preview: {
      background: '#ffffff',
      foreground: '#000000',
      primary: '#0070f3',
      secondary: '#666666',
    },
  },
  {
    id: 'default-dark',
    name: 'Dark',
    description: 'Easy on the eyes',
    config: {
      theme: 'dark',
      resolvedTheme: 'dark',
      accentColor: 'blue',
    },
    preview: {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#0070f3',
      secondary: '#888888',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum readability',
    config: {
      theme: 'high-contrast',
      resolvedTheme: 'high-contrast',
      highContrastEnabled: true,
      strongFocusRings: true,
    },
    preview: {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#00ff00',
      secondary: '#ffff00',
    },
  },
  {
    id: 'auto',
    name: 'Auto',
    description: 'Follows system',
    config: {
      theme: 'system',
      resolvedTheme: 'dark', // Will be resolved at runtime
    },
    preview: {
      background: 'linear-gradient(135deg, #ffffff 50%, #000000 50%)',
      foreground: '#666666',
      primary: '#0070f3',
      secondary: '#888888',
    },
  },
];

export const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string; name: string }> = {
  blue: { light: '#0070f3', dark: '#3291ff', name: 'Blue' },
  purple: { light: '#8b5cf6', dark: '#a78bfa', name: 'Purple' },
  green: { light: '#10b981', dark: '#34d399', name: 'Green' },
  orange: { light: '#f97316', dark: '#fb923c', name: 'Orange' },
  red: { light: '#ef4444', dark: '#f87171', name: 'Red' },
  pink: { light: '#ec4899', dark: '#f472b6', name: 'Pink' },
};
