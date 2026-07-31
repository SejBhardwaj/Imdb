/**
 * Theme Settings Page
 * 
 * Complete UI for theme customization:
 * - Theme mode selection
 * - Accent color picker
 * - Accessibility options
 * - Motion controls
 * - Live preview
 */

'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Eye, Check, Palette, Zap, Type, Focus } from 'lucide-react';
import { useThemeEnhanced } from '@/lib/theme/ThemeContextEnhanced';
import { THEME_PRESETS, ACCENT_COLORS } from '@/lib/theme/types';
import type { ThemeMode, AccentColor } from '@/lib/theme/types';

export function ThemeSettingsPage() {
  const theme = useThemeEnhanced();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[rgb(var(--color-foreground))] mb-2">
          Appearance
        </h1>
        <p className="text-[rgb(var(--color-foreground-muted))]">
          Customize how the application looks and feels
        </p>
      </div>

      {/* Theme Mode Selection */}
      <section>
        <h2 className="text-xl font-semibold text-[rgb(var(--color-foreground))] mb-4 flex items-center gap-2">
          <Palette size={20} />
          Theme Mode
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {THEME_PRESETS.map((preset) => (
            <ThemePreviewCard
              key={preset.id}
              preset={preset}
              isActive={theme.theme === preset.config.theme}
              onClick={() => theme.setTheme(preset.config.theme!)}
            />
          ))}
        </div>
      </section>

      {/* Accent Color */}
      <section>
        <h2 className="text-xl font-semibold text-[rgb(var(--color-foreground))] mb-4 flex items-center gap-2">
          <Palette size={20} />
          Accent Color
        </h2>
        
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(([color, config]) => (
            <button
              key={color}
              onClick={() => theme.setAccentColor(color)}
              className="relative aspect-square rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: theme.resolvedTheme === 'light' ? config.light : config.dark,
              }}
              aria-label={`Set accent color to ${config.name}`}
            >
              {theme.accentColor === color && (
                <motion.div
                  layoutId="accent-selected"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Check size={24} className="text-white drop-shadow-lg" />
                </motion.div>
              )}
              <span className="sr-only">{config.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-xl font-semibold text-[rgb(var(--color-foreground))] mb-4 flex items-center gap-2">
          <Eye size={20} />
          Accessibility
        </h2>
        
        <div className="space-y-3">
          <ToggleOption
            icon={<Eye size={18} />}
            label="High Contrast"
            description="Increase contrast for better readability"
            checked={theme.highContrastEnabled}
            onChange={theme.setHighContrast}
          />
          
          <ToggleOption
            icon={<Type size={18} />}
            label="Large Text"
            description="Increase font size across the application"
            checked={theme.largeText}
            onChange={theme.setLargeText}
          />
          
          <ToggleOption
            icon={<Focus size={18} />}
            label="Strong Focus Rings"
            description="Make focus indicators more prominent"
            checked={theme.strongFocusRings}
            onChange={theme.setStrongFocusRings}
          />
        </div>
      </section>

      {/* Motion */}
      <section>
        <h2 className="text-xl font-semibold text-[rgb(var(--color-foreground))] mb-4 flex items-center gap-2">
          <Zap size={20} />
          Motion
        </h2>
        
        <div className="space-y-3">
          <ToggleOption
            icon={<Zap size={18} />}
            label="Animations"
            description="Enable smooth transitions and animations"
            checked={theme.animations}
            onChange={theme.setAnimations}
          />
          
          <ToggleOption
            icon={<Zap size={18} className="opacity-50" />}
            label="Reduced Motion"
            description="Minimize motion for accessibility"
            checked={theme.reducedMotion}
            onChange={theme.setReducedMotion}
          />
        </div>
      </section>

      {/* Font Scale */}
      <section>
        <h2 className="text-xl font-semibold text-[rgb(var(--color-foreground))] mb-4 flex items-center gap-2">
          <Type size={20} />
          Font Size
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[rgb(var(--color-foreground-muted))]">
              {Math.round(theme.fontScale * 100)}%
            </span>
          </div>
          
          <input
            type="range"
            min="0.875"
            max="1.5"
            step="0.125"
            value={theme.fontScale}
            onChange={(e) => theme.setFontScale(parseFloat(e.target.value))}
            className="w-full h-2 bg-[rgb(var(--color-surface))] rounded-lg appearance-none cursor-pointer accent-[rgb(var(--color-primary))]"
          />
          
          <div className="flex justify-between text-xs text-[rgb(var(--color-foreground-muted))]">
            <span>Small</span>
            <span>Default</span>
            <span>Large</span>
          </div>
        </div>
      </section>

      {/* Reset Button */}
      <div className="pt-6 border-t border-[rgb(var(--color-border))]">
        <button
          onClick={theme.resetToDefaults}
          className="px-6 py-2 rounded-lg bg-[rgb(var(--color-surface))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-foreground))] transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Sync Status */}
      {theme.isAuthenticated && (
        <div className="text-sm text-[rgb(var(--color-foreground-muted))] flex items-center gap-2">
          {theme.isSyncing ? (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Syncing across devices...
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Synced {theme.lastSyncedAt && `at ${new Date(theme.lastSyncedAt).toLocaleTimeString()}`}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Theme Preview Card
 */
interface ThemePreviewCardProps {
  preset: typeof THEME_PRESETS[number];
  isActive: boolean;
  onClick: () => void;
}

function ThemePreviewCard({ preset, isActive, onClick }: ThemePreviewCardProps) {
  const Icon = 
    preset.config.theme === 'light' ? Sun :
    preset.config.theme === 'dark' ? Moon :
    preset.config.theme === 'high-contrast' ? Eye :
    Monitor;

  return (
    <motion.button
      onClick={onClick}
      className="relative p-4 rounded-xl border-2 transition-all text-left"
      style={{
        borderColor: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))',
        background: 'rgb(var(--color-surface))',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Selection Indicator */}
      {isActive && (
        <motion.div
          layoutId="theme-selected"
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgb(var(--color-primary))] flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Check size={14} className="text-white" />
        </motion.div>
      )}

      {/* Preview */}
      <div 
        className="w-full h-24 rounded-lg mb-3 relative overflow-hidden"
        style={{ background: preset.preview.background }}
      >
        <div className="absolute inset-2 flex flex-col gap-1">
          <div 
            className="h-2 w-3/4 rounded"
            style={{ background: preset.preview.foreground }}
          />
          <div 
            className="h-2 w-1/2 rounded"
            style={{ background: preset.preview.foreground, opacity: 0.6 }}
          />
          <div 
            className="h-2 w-2/3 rounded mt-2"
            style={{ background: preset.preview.primary }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-[rgb(var(--color-foreground-muted))]" />
        <h3 className="font-medium text-[rgb(var(--color-foreground))]">
          {preset.name}
        </h3>
      </div>
      
      <p className="text-xs text-[rgb(var(--color-foreground-muted))]">
        {preset.description}
      </p>
    </motion.button>
  );
}

/**
 * Toggle Option Component
 */
interface ToggleOptionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleOption({ icon, label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-[rgb(var(--color-surface))]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[rgb(var(--color-foreground-muted))]">
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-[rgb(var(--color-foreground))] mb-0.5">
            {label}
          </h4>
          <p className="text-sm text-[rgb(var(--color-foreground-muted))]">
            {description}
          </p>
        </div>
      </div>
      
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-12 h-6 rounded-full transition-colors"
        style={{
          background: checked ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))',
        }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
          animate={{ left: checked ? '26px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
