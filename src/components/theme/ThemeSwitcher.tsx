// @ts-nocheck - Legacy file, use ThemeSegmentedControl instead
/**
 * Theme Switcher Component
 * 
 * UI control for changing themes with animations
 */

'use client';

import React from 'react';
import { useTheme } from '@/lib/theme';
import { Sun, Moon, Monitor, Contrast } from 'lucide-react';
import type { ThemeMode } from '@/lib/theme/types';

export function ThemeSwitcher() {
  const { theme, setTheme, isDark } = useTheme();

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'high-contrast', label: 'High Contrast', icon: <Contrast size={16} /> },
    { value: 'auto', label: 'System', icon: <Monitor size={16} /> },
  ];

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
            ${theme === t.value
              ? 'bg-[rgb(var(--color-primary))] text-white'
              : 'text-[rgb(var(--color-foreground-secondary))] hover:bg-[rgb(var(--color-surface-hover))]'
            }
          `}
          aria-label={`Switch to ${t.label} theme`}
          aria-pressed={theme === t.value}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Simple Toggle Button
 */
export function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-surface-hover))] transition-all"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
