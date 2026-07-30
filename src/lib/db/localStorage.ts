/**
 * LocalStorage wrapper for simple key-value pairs
 * Only used for lightweight data: theme, language, lastSyncTime
 */

const STORAGE_PREFIX = 'imdb_';

type StorageKey = 'theme' | 'language' | 'lastSyncTime';

/**
 * Safe localStorage getter with fallback
 */
export function getLocalStorage<T>(key: StorageKey, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Safe localStorage setter
 */
export function setLocalStorage<T>(key: StorageKey, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    
    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Clearing old data...');
      // Could implement cleanup strategy here
    }
  }
}

/**
 * Remove item from localStorage
 */
export function removeLocalStorage(key: StorageKey): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
}

/**
 * Clear all app-specific localStorage items
 */
export function clearLocalStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = `${STORAGE_PREFIX}test`;
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
