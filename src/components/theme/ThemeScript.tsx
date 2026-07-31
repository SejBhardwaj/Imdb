/**
 * Theme Script Component
 * 
 * SSR-safe inline script that prevents flash of unstyled content (FOUC)
 * Executes before React hydration to apply theme immediately
 */

import { THEME_STORAGE, THEME_DEFAULTS } from '@/lib/theme/constants';
import { createThemeScript } from '@/lib/theme/utils';

export interface ThemeScriptProps {
  nonce?: string;
}

/**
 * Theme Initialization Script
 * 
 * MUST be placed in <head> or early in <body>
 * Executes synchronously before first paint
 */
export function ThemeScript({ nonce }: ThemeScriptProps) {
  const script = createThemeScript({
    cookieName: THEME_STORAGE.COOKIE_NAME,
    storageKey: THEME_STORAGE.STORAGE_KEY,
    defaultTheme: THEME_DEFAULTS.RESOLVED,
    nonce,
  });

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      nonce={nonce}
      suppressHydrationWarning
    />
  );
}

/**
 * No-JS Fallback
 * 
 * Applies default theme for users with JavaScript disabled
 */
export function ThemeNoScript() {
  return (
    <noscript>
      <style>{`
        :root {
          color-scheme: ${THEME_DEFAULTS.RESOLVED};
        }
      `}</style>
    </noscript>
  );
}
