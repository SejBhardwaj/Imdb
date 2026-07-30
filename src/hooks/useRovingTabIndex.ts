/**
 * Roving Tab Index Hook
 * 
 * Implements roving tabindex pattern for keyboard navigation
 * Only one item is tabbable at a time (tabIndex=0)
 * Others are focusable but not tabbable (tabIndex=-1)
 */

import { useState, useCallback, KeyboardEvent } from 'react';

export function useRovingTabIndex(itemCount: number) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const getTabIndex = useCallback((index: number) => {
    return index === currentIndex ? 0 : -1;
  }, [currentIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % itemCount);
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + itemCount) % itemCount);
        break;

      case 'Home':
        e.preventDefault();
        setCurrentIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setCurrentIndex(itemCount - 1);
        break;
    }
  }, [itemCount]);

  const setFocus = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      setCurrentIndex(index);
    }
  }, [itemCount]);

  return {
    currentIndex,
    getTabIndex,
    handleKeyDown,
    setFocus,
  };
}
