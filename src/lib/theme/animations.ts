/**
 * Theme Transition Animations
 * 
 * Smooth animations when switching themes:
 * - Color interpolation
 * - Shadow transitions
 * - Border radius morphing
 */

/**
 * Enable View Transitions API for theme changes
 */
export function enableThemeTransitions() {
  if (typeof document === 'undefined') return;

  // Check if View Transitions API is supported
  if (!('startViewTransition' in document)) {
    console.warn('View Transitions API not supported');
    return;
  }

  return true;
}

/**
 * Perform theme transition with View Transitions API
 */
export async function transitionTheme(callback: () => void): Promise<void> {
  if (typeof document === 'undefined') {
    callback();
    return;
  }

  // @ts-ignore - View Transitions API
  if (!document.startViewTransition) {
    callback();
    return;
  }

  // @ts-ignore
  const transition = document.startViewTransition(() => {
    callback();
  });

  await transition.finished;
}

/**
 * CSS animation utilities
 */
export const THEME_ANIMATIONS = {
  // Transition durations
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
  },

  // Easing functions
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Animation presets
  presets: {
    fadeIn: 'fade-in 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    fadeOut: 'fade-out 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    scaleIn: 'scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    scaleOut: 'scale-out 200ms cubic-bezier(0.4, 0, 1, 1)',
    slideUp: 'slide-up 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slideDown: 'slide-down 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

/**
 * Interpolate between two colors
 */
export function interpolateColor(
  from: string,
  to: string,
  progress: number
): string {
  // Simple RGB interpolation
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  if (!fromRgb || !toRgb) return to;

  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Apply smooth theme transition
 */
export function applyThemeTransition(element: HTMLElement): void {
  element.style.transition = `
    background-color ${THEME_ANIMATIONS.duration.normal}ms ${THEME_ANIMATIONS.easing.ease},
    color ${THEME_ANIMATIONS.duration.normal}ms ${THEME_ANIMATIONS.easing.ease},
    border-color ${THEME_ANIMATIONS.duration.normal}ms ${THEME_ANIMATIONS.easing.ease},
    box-shadow ${THEME_ANIMATIONS.duration.slow}ms ${THEME_ANIMATIONS.easing.ease}
  `;
}

/**
 * Remove theme transitions
 */
export function removeThemeTransition(element: HTMLElement): void {
  element.style.transition = '';
}

/**
 * Animate theme change on multiple elements
 */
export function animateThemeChange(): void {
  if (typeof document === 'undefined') return;

  // Get all elements that should animate
  const elements = document.querySelectorAll('[data-theme-transition]');

  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      applyThemeTransition(element);

      // Remove transition after animation completes
      setTimeout(() => {
        removeThemeTransition(element);
      }, THEME_ANIMATIONS.duration.slow);
    }
  });
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
