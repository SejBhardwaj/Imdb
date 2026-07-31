/**
 * Theme Segmented Control
 * 
 * Polished 4-way theme toggle with:
 * - Spring animations
 * - Icon morphing
 * - Keyboard navigation
 * - ARIA support
 */

'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Sun, Moon, Monitor, Eye } from 'lucide-react';
import { useThemeEnhanced } from '@/lib/theme/ThemeContextEnhanced';
import type { ThemeMode } from '@/lib/theme/types';
import { useState } from 'react';

const THEME_OPTIONS = [
  { value: 'light' as ThemeMode, icon: Sun, label: 'Light' },
  { value: 'dark' as ThemeMode, icon: Moon, label: 'Dark' },
  { value: 'system' as ThemeMode, icon: Monitor, label: 'Auto' },
  { value: 'high-contrast' as ThemeMode, icon: Eye, label: 'High Contrast' },
];

export function ThemeSegmentedControl() {
  const { theme, setTheme, isTransitioning } = useThemeEnhanced();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = THEME_OPTIONS.findIndex(opt => opt.value === theme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="relative inline-flex items-center gap-1 p-1 rounded-full bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] backdrop-blur-sm"
    >
      {/* Animated Background */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-[rgb(var(--color-primary))] shadow-lg"
        initial={false}
        animate={{
          left: `calc(${activeIndex * 25}% + 4px)`,
          width: `calc(25% - 8px)`,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.5,
        }}
      />

      {/* Options */}
      {THEME_OPTIONS.map((option, index) => {
        const Icon = option.icon;
        const isActive = option.value === theme;
        const isHovered = hoveredIndex === index;

        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
            className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:ring-offset-2 focus:ring-offset-[rgb(var(--color-background))]"
            disabled={isTransitioning}
          >
            <motion.div
              animate={{
                scale: isActive ? 1.1 : isHovered ? 1.05 : 1,
                rotate: isActive ? [0, 10, -10, 0] : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
              }}
            >
              <Icon
                size={18}
                className="transition-colors"
                style={{
                  color: isActive ? 'white' : 'rgb(var(--color-foreground-muted))',
                }}
              />
            </motion.div>

            {/* Tooltip */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] text-xs font-medium text-[rgb(var(--color-foreground))] whitespace-nowrap shadow-lg pointer-events-none"
              >
                {option.label}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[rgb(var(--color-surface))] border-r border-b border-[rgb(var(--color-border))]" />
              </motion.div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact version for mobile
 */
export function ThemeSegmentedControlCompact() {
  const { theme, toggleTheme } = useThemeEnhanced();
  
  const Icon = theme === 'light' ? Sun : theme === 'high-contrast' ? Eye : Moon;

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]"
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 30, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Icon size={18} className="text-[rgb(var(--color-foreground))]" />
      </motion.div>
    </button>
  );
}

/**
 * Vertical version for settings sidebar
 */
export function ThemeSegmentedControlVertical() {
  const { theme, setTheme } = useThemeEnhanced();

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="relative flex flex-col gap-2"
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === theme;

        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(option.value)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-[rgb(var(--color-surface-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]"
            style={{
              background: isActive ? 'rgb(var(--color-surface))' : 'transparent',
              borderLeft: isActive ? '3px solid rgb(var(--color-primary))' : '3px solid transparent',
            }}
          >
            <Icon 
              size={20} 
              style={{ 
                color: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--color-foreground-muted))' 
              }} 
            />
            <span 
              className="text-sm font-medium"
              style={{
                color: isActive ? 'rgb(var(--color-foreground))' : 'rgb(var(--color-foreground-muted))',
              }}
            >
              {option.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="active-indicator-vertical"
                className="ml-auto w-2 h-2 rounded-full bg-[rgb(var(--color-primary))]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
