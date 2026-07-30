/**
 * Accessibility Utilities
 * 
 * WCAG 2.1 AA compliance helpers:
 * - Screen reader announcements
 * - Focus management
 * - Keyboard navigation
 * - ARIA attributes
 */

/**
 * Announce to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    if (announcement.parentNode) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

/**
 * Announce for alerts (higher priority)
 */
export function announceAlert(message: string): void {
  announce(message, 'assertive');
}

/**
 * Focus element with scroll prevention
 */
export function focusElement(element: HTMLElement | null, preventScroll = true): void {
  if (!element) return;

  element.focus({ preventScroll });

  // Ensure focus is visible
  if (!preventScroll) {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Focus first focusable element in container
 */
export function focusFirstInContainer(container: HTMLElement | null): void {
  if (!container) return;

  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusElement(focusable[0]);
  }
}

/**
 * Get all focusable elements in container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

/**
 * Trap focus within container (for modals)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];

  // Shift + Tab on first element
  if (event.shiftKey && document.activeElement === firstFocusable) {
    event.preventDefault();
    lastFocusable.focus();
    return;
  }

  // Tab on last element
  if (!event.shiftKey && document.activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable.focus();
  }
}

/**
 * Restore focus to previously focused element
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  capture(): void {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  restore(): void {
    if (this.previousFocus && this.previousFocus.focus) {
      setTimeout(() => {
        this.previousFocus?.focus();
      }, 0);
    }
  }
}

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on motion preference
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

/**
 * Check if high contrast mode is active
 */
export function isHighContrastMode(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Format rating for screen readers
 */
export function formatRatingAnnouncement(rating: number, max: number = 10): string {
  return `Rated ${rating} out of ${max} stars`;
}

/**
 * Format vote count for screen readers
 */
export function formatVoteAnnouncement(upvotes: number, downvotes: number): string {
  const total = upvotes + downvotes;
  const helpful = total > 0 ? Math.round((upvotes / total) * 100) : 0;
  return `${upvotes} helpful, ${downvotes} not helpful. ${helpful}% found this helpful.`;
}

/**
 * Format date for screen readers
 */
export function formatDateAnnouncement(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
} as const;

/**
 * Check if event is activation key (Enter or Space)
 */
export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === KeyboardKeys.ENTER || event.key === KeyboardKeys.SPACE;
}

/**
 * Handle roving tabindex navigation
 */
export function handleRovingTabIndex(
  items: HTMLElement[],
  currentIndex: number,
  key: string
): number {
  let newIndex = currentIndex;

  switch (key) {
    case KeyboardKeys.ARROW_DOWN:
    case KeyboardKeys.ARROW_RIGHT:
      newIndex = currentIndex + 1;
      if (newIndex >= items.length) newIndex = 0;
      break;

    case KeyboardKeys.ARROW_UP:
    case KeyboardKeys.ARROW_LEFT:
      newIndex = currentIndex - 1;
      if (newIndex < 0) newIndex = items.length - 1;
      break;

    case KeyboardKeys.HOME:
      newIndex = 0;
      break;

    case KeyboardKeys.END:
      newIndex = items.length - 1;
      break;

    default:
      return currentIndex;
  }

  // Update tabindex
  items.forEach((item, index) => {
    item.setAttribute('tabindex', index === newIndex ? '0' : '-1');
  });

  // Focus new item
  items[newIndex]?.focus();

  return newIndex;
}

/**
 * ARIA live region helpers
 */
export class LiveRegion {
  private element: HTMLDivElement | null = null;

  constructor(priority: 'polite' | 'assertive' = 'polite') {
    this.element = document.createElement('div');
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', priority);
    this.element.setAttribute('aria-atomic', 'true');
    this.element.className = 'sr-only';
    document.body.appendChild(this.element);
  }

  announce(message: string): void {
    if (this.element) {
      this.element.textContent = message;
    }
  }

  destroy(): void {
    if (this.element && this.element.parentNode) {
      document.body.removeChild(this.element);
      this.element = null;
    }
  }
}

/**
 * Skip link component data
 */
export interface SkipLink {
  label: string;
  targetId: string;
}

export const COMMON_SKIP_LINKS: SkipLink[] = [
  { label: 'Skip to main content', targetId: 'main-content' },
  { label: 'Skip to navigation', targetId: 'main-navigation' },
  { label: 'Skip to reviews', targetId: 'reviews-section' },
];

/**
 * Handle skip link click
 */
export function handleSkipLink(targetId: string): void {
  const target = document.getElementById(targetId);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Remove tabindex after focus
    target.addEventListener(
      'blur',
      () => {
        target.removeAttribute('tabindex');
      },
      { once: true }
    );
  }
}

/**
 * Semantic HTML helpers
 */
export const SemanticRoles = {
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  BANNER: 'banner',
  SEARCH: 'search',
  REGION: 'region',
  ARTICLE: 'article',
  LIST: 'list',
  LISTITEM: 'listitem',
  STATUS: 'status',
  ALERT: 'alert',
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
} as const;

/**
 * ARIA states
 */
export const AriaStates = {
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  PRESSED: 'aria-pressed',
  CURRENT: 'aria-current',
  BUSY: 'aria-busy',
  INVALID: 'aria-invalid',
  REQUIRED: 'aria-required',
} as const;

/**
 * Create ARIA description
 */
export function createAriaDescription(text: string): string {
  const id = generateId('desc');
  const description = document.createElement('span');
  description.id = id;
  description.className = 'sr-only';
  description.textContent = text;
  document.body.appendChild(description);
  return id;
}

/**
 * Remove ARIA description
 */
export function removeAriaDescription(id: string): void {
  const element = document.getElementById(id);
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}
