/**
 * Secure Theme Initialization Script
 * 
 * Runs before React hydration to prevent flash
 * Protected by CSP nonce
 */

import { generateNonce } from '@/lib/security/csp';
import { THEME_STORAGE, CSS_CLASSES } from '@/lib/theme/constants';

interface ThemeScriptSecureProps {
  nonce?: string;
  defaultTheme?: string;
}

export function ThemeScriptSecure({ nonce, defaultTheme = 'dark' }: ThemeScriptSecureProps) {
  // Generate nonce if not provided (for dev)
  const scriptNonce = nonce || (typeof window === 'undefined' ? generateNonce() : '');

  const themeScript = `
    (function() {
      try {
        // Storage keys
        const COOKIE_NAME = '${THEME_STORAGE.COOKIE_NAME}';
        const STORAGE_KEY = '${THEME_STORAGE.STORAGE_KEY}';
        const DEFAULT_THEME = '${defaultTheme}';
        
        // CSS classes
        const CLASSES = ${JSON.stringify(CSS_CLASSES)};
        
        /**
         * Get theme from cookie
         */
        function getCookie(name) {
          const value = \`; \${document.cookie}\`;
          const parts = value.split(\`; \${name}=\`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        }
        
        /**
         * Get theme from localStorage
         */
        function getStorage(key) {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        }
        
        /**
         * Get system theme preference
         */
        function getSystemTheme() {
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
          }
          return 'light';
        }
        
        /**
         * Resolve theme with priority
         */
        function resolveTheme() {
          // 1. Cookie (highest priority for SSR)
          const cookieTheme = getCookie(COOKIE_NAME);
          if (cookieTheme && cookieTheme !== 'system' && cookieTheme !== 'auto') {
            return cookieTheme;
          }
          
          // 2. LocalStorage
          const storageTheme = getStorage(STORAGE_KEY);
          if (storageTheme && storageTheme !== 'system' && storageTheme !== 'auto') {
            return storageTheme;
          }
          
          // 3. System preference if 'system' or 'auto'
          if (cookieTheme === 'system' || cookieTheme === 'auto' || 
              storageTheme === 'system' || storageTheme === 'auto') {
            return getSystemTheme();
          }
          
          // 4. Default
          return DEFAULT_THEME;
        }
        
        /**
         * Apply theme to document
         */
        function applyTheme(theme) {
          const html = document.documentElement;
          
          // Remove all theme classes
          Object.values(CLASSES).forEach(cls => html.classList.remove(cls));
          
          // Add resolved theme class
          if (theme === 'light') {
            html.classList.add(CLASSES.LIGHT);
            html.setAttribute('data-theme', 'light');
          } else if (theme === 'dark') {
            html.classList.add(CLASSES.DARK);
            html.setAttribute('data-theme', 'dark');
          } else if (theme === 'high-contrast') {
            html.classList.add(CLASSES.HIGH_CONTRAST);
            html.setAttribute('data-theme', 'high-contrast');
          }
          
          // Set color-scheme for native form controls
          html.style.colorScheme = theme === 'light' ? 'light' : 'dark';
        }
        
        /**
         * Check for reduced motion
         */
        function checkReducedMotion() {
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.classList.add(CLASSES.REDUCED_MOTION);
          }
        }
        
        // Execute immediately
        const resolvedTheme = resolveTheme();
        applyTheme(resolvedTheme);
        checkReducedMotion();
        
        // Store resolved theme for hydration
        window.__THEME__ = resolvedTheme;
        
      } catch (e) {
        // Fail silently - theme will be applied after hydration
        console.warn('Theme init failed:', e);
      }
    })();
  `;

  return (
    <script
      nonce={scriptNonce}
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}

/**
 * Generate static script tag for Next.js pages
 */
export function generateThemeScript(nonce: string, defaultTheme: string = 'dark'): string {
  return `<script nonce="${nonce}">${ThemeScriptSecure({ nonce, defaultTheme })}</script>`;
}
