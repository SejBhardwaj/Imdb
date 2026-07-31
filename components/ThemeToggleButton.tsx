'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function ThemeToggleButton() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-xl glass text-[rgb(var(--color-foreground-muted))] hover:text-[rgb(var(--color-foreground))] transition-all hover:border-[rgb(var(--color-border-hover))]"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
