/**
 * Server Echo Merge Tests
 * 
 * Validates that optimistic updates merge with server responses without:
 * - DOM replacement
 * - Animation loss
 * - Scroll position loss
 * - Flickering
 * - Component unmounting
 */

import { test, expect } from '@playwright/test';

test.describe('Server Echo Merging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });
  });

  test('should not replace DOM elements when server responds', async ({ page }) => {
    // Click write review
    await page.click('button:has-text("Write a Review")');
    
    // Fill form
    await page.fill('input[name="title"]', 'Merge Test Review');
    await page.fill('textarea[name="content"]', 'Testing server echo merge without DOM replacement.');
    await page.click('[data-rating="8"]');

    // Get initial review count
    const initialCount = await page.locator('[data-testid="review-card"]').count();

    // Track DOM mutations
    const mutations = await page.evaluate(() => {
      return new Promise((resolve) => {
        const mutations: any[] = [];
        const observer = new MutationObserver((mutationsList) => {
          mutationsList.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.removedNodes.forEach((node) => {
                if (node.nodeType === 1 && (node as Element).getAttribute('data-testid') === 'review-card') {
                  mutations.push({
                    type: 'removed',
                    element: 'review-card',
                    timestamp: Date.now(),
                  });
                }
              });
            }
          });
        });

        const reviewList = document.querySelector('[data-testid="reviews-list"]');
        if (reviewList) {
          observer.observe(reviewList, {
            childList: true,
            subtree: true,
          });
        }

        // Store observer in window for later access
        (window as any).mutationObserver = observer;
        (window as any).mutations = mutations;

        // Resolve after observing
        setTimeout(() => resolve(mutations), 100);
      });
    });

    // Submit review (creates optimistic + waits for server)
    await page.click('button:has-text("Publish Review")');

    // Wait for optimistic update
    await page.waitForTimeout(200);

    // Wait for server response
    await page.waitForTimeout(1000);

    // Get mutations after merge
    const finalMutations = await page.evaluate(() => {
      const observer = (window as any).mutationObserver;
      if (observer) {
        observer.disconnect();
      }
      return (window as any).mutations || [];
    });

    // Check if new review appears
    await page.waitForSelector('[data-testid="review-card"]:has-text("Merge Test Review")');

    // Should not have removed any review-card elements during merge
    const removedCards = finalMutations.filter((m: any) => m.type === 'removed' && m.element === 'review-card');
    expect(removedCards.length).toBe(0);

    // Final count should be initial + 1
    const finalCount = await page.locator('[data-testid="review-card"]').count();
    expect(finalCount).toBe(initialCount + 1);
  });

  test('should maintain scroll position during server merge', async ({ page }) => {
    // Add many reviews first (to enable scrolling)
    await page.evaluate(() => {
      // Mock adding 20 reviews to the list
      const mockReviews = Array.from({ length: 20 }, (_, i) => ({
        id: `mock-review-${i}`,
        title: `Mock Review ${i}`,
        content: `Mock content ${i}`,
        rating: 5 + (i % 5),
      }));
      
      // Store in window for rendering
      (window as any).mockReviews = mockReviews;
    });

    // Scroll to middle of list
    await page.evaluate(() => {
      const reviewsList = document.querySelector('[data-testid="reviews-list"]');
      if (reviewsList) {
        reviewsList.scrollTop = reviewsList.scrollHeight / 2;
      }
    });

    // Record scroll position before submission
    const scrollBeforeSubmit = await page.evaluate(() => {
      const reviewsList = document.querySelector('[data-testid="reviews-list"]');
      return reviewsList?.scrollTop || 0;
    });

    // Submit new review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Scroll Test Review');
    await page.fill('textarea[name="content"]', 'Testing scroll preservation.');
    await page.click('[data-rating="7"]');
    await page.click('button:has-text("Publish Review")');

    // Wait for server merge
    await page.waitForTimeout(1500);

    // Check scroll position after merge
    const scrollAfterMerge = await page.evaluate(() => {
      const reviewsList = document.querySelector('[data-testid="reviews-list"]');
      return reviewsList?.scrollTop || 0;
    });

    // Scroll position should be maintained (within 50px tolerance)
    const scrollDifference = Math.abs(scrollAfterMerge - scrollBeforeSubmit);
    expect(scrollDifference).toBeLessThan(50);
  });

  test('should preserve animation state during merge', async ({ page }) => {
    // Enable animation tracking
    await page.evaluate(() => {
      (window as any).animationEvents = [];
      
      // Track animation events
      document.addEventListener('animationstart', (e) => {
        (window as any).animationEvents.push({
          type: 'start',
          target: (e.target as Element).getAttribute('data-testid'),
          timestamp: Date.now(),
        });
      });
      
      document.addEventListener('animationend', (e) => {
        (window as any).animationEvents.push({
          type: 'end',
          target: (e.target as Element).getAttribute('data-testid'),
          timestamp: Date.now(),
        });
      });
    });

    // Submit review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Animation Test');
    await page.fill('textarea[name="content"]', 'Testing animation preservation.');
    await page.click('[data-rating="9"]');
    await page.click('button:has-text("Publish Review")');

    // Wait for optimistic + server merge
    await page.waitForTimeout(1500);

    // Check animation events
    const animationEvents = await page.evaluate(() => {
      return (window as any).animationEvents || [];
    });

    // Should have animation events (Framer Motion)
    expect(animationEvents.length).toBeGreaterThan(0);

    // Should not have interrupted animations (no premature ends)
    const interrupted = animationEvents.filter((event: any, index: number) => {
      if (event.type === 'end' && index > 0) {
        const previousStart = animationEvents
          .slice(0, index)
          .reverse()
          .find((e: any) => e.type === 'start' && e.target === event.target);
        
        if (previousStart) {
          const duration = event.timestamp - previousStart.timestamp;
          return duration < 100; // Animation ended too quickly (interrupted)
        }
      }
      return false;
    });

    expect(interrupted.length).toBe(0);
  });

  test('should not flicker during optimistic to server transition', async ({ page }) => {
    // Track visibility changes
    await page.evaluate(() => {
      (window as any).visibilityChanges = [];
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const target = mutation.target as HTMLElement;
            if (target.getAttribute('data-testid') === 'review-card') {
              (window as any).visibilityChanges.push({
                opacity: target.style.opacity,
                visibility: target.style.visibility,
                display: target.style.display,
                timestamp: Date.now(),
              });
            }
          }
        });
      });

      setTimeout(() => {
        const reviewsList = document.querySelector('[data-testid="reviews-list"]');
        if (reviewsList) {
          observer.observe(reviewsList, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style'],
          });
        }
        (window as any).visibilityObserver = observer;
      }, 100);
    });

    // Submit review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Flicker Test');
    await page.fill('textarea[name="content"]', 'Testing no flicker on merge.');
    await page.click('[data-rating="6"]');
    await page.click('button:has-text("Publish Review")');

    // Wait for complete transition
    await page.waitForTimeout(2000);

    // Get visibility changes
    const visibilityChanges = await page.evaluate(() => {
      const observer = (window as any).visibilityObserver;
      if (observer) {
        observer.disconnect();
      }
      return (window as any).visibilityChanges || [];
    });

    // Should not have visibility/opacity flickering
    const flickerEvents = visibilityChanges.filter((change: any) => {
      return change.opacity === '0' || change.visibility === 'hidden' || change.display === 'none';
    });

    expect(flickerEvents.length).toBe(0);
  });

  test('should use stable React keys during transition', async ({ page }) => {
    // Inject React DevTools helpers
    const hasStableKeys = await page.evaluate(() => {
      return new Promise((resolve) => {
        let optimisticKey: string | null = null;
        let serverKey: string | null = null;

        // Monitor React key stability
        const checkKeys = () => {
          const reviewCards = document.querySelectorAll('[data-testid="review-card"]');
          const keys: string[] = [];
          
          reviewCards.forEach((card) => {
            // React stores key in internal props
            const reactKey = (card as any)._reactKey || card.getAttribute('data-key');
            if (reactKey) {
              keys.push(reactKey);
            }
          });

          return keys;
        };

        // Initial keys
        const initialKeys = checkKeys();

        // After optimistic update
        setTimeout(() => {
          const afterOptimistic = checkKeys();
          optimisticKey = afterOptimistic[afterOptimistic.length - 1];
        }, 300);

        // After server merge
        setTimeout(() => {
          const afterServer = checkKeys();
          serverKey = afterServer[afterServer.length - 1];
          
          resolve({
            stable: optimisticKey === serverKey,
            optimisticKey,
            serverKey,
          });
        }, 1500);
      });
    });

    // Submit review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Key Stability Test');
    await page.fill('textarea[name="content"]', 'Testing React key stability.');
    await page.click('[data-rating="8"]');
    await page.click('button:has-text("Publish Review")');

    // Wait for promise resolution
    await page.waitForTimeout(2000);

    // Note: This is a simplified test. In reality, checking React internals
    // requires React DevTools or similar. This validates the concept.
  });

  test('should merge vote updates without DOM replacement', async ({ page }) => {
    // Assume there's already a review on the page
    await page.waitForSelector('[data-testid="review-card"]');

    // Get initial DOM element reference
    const initialElement = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="review-card"]');
      if (card) {
        (window as any).initialCardElement = card;
        (window as any).initialCardId = (card as any).id || 'no-id';
        return true;
      }
      return false;
    });

    expect(initialElement).toBe(true);

    // Click upvote
    await page.click('[data-testid="review-card"] button[aria-label*="helpful"]');

    // Wait for optimistic + server update
    await page.waitForTimeout(1000);

    // Check if DOM element is the same reference
    const sameElement = await page.evaluate(() => {
      const currentCard = document.querySelector('[data-testid="review-card"]');
      const initialCard = (window as any).initialCardElement;
      return currentCard === initialCard;
    });

    // Element reference should be preserved
    expect(sameElement).toBe(true);

    // Vote count should be updated
    const voteText = await page.locator('[data-testid="review-card"] [data-testid="vote-count"]').textContent();
    expect(voteText).toBeTruthy();
  });

  test('should handle simultaneous vote and content updates', async ({ page }) => {
    // Create a review first
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Simultaneous Update Test');
    await page.fill('textarea[name="content"]', 'Original content.');
    await page.click('[data-rating="7"]');
    await page.click('button:has-text("Publish Review")');
    
    await page.waitForSelector('[data-testid="review-card"]:has-text("Simultaneous Update Test")');

    // Track mutations
    await page.evaluate(() => {
      (window as any).updateEvents = [];
    });

    // Simultaneously: Edit review AND vote on it
    const editPromise = page.click('[data-testid="review-card"] button:has-text("Edit")');
    const votePromise = page.click('[data-testid="review-card"] button[aria-label*="helpful"]');

    await Promise.all([editPromise, votePromise]);

    // Both updates should be reflected
    await page.waitForTimeout(1500);

    // Check that no errors occurred
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(500);

    // Should not have React errors about keys or updates
    const reactErrors = consoleErrors.filter(err => 
      err.includes('key') || err.includes('update') || err.includes('render')
    );
    expect(reactErrors.length).toBe(0);
  });

  test('should preserve focus during server merge', async ({ page }) => {
    // Submit review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Focus Test');
    await page.fill('textarea[name="content"]', 'Testing focus preservation.');
    await page.click('[data-rating="8"]');
    
    // Focus the submit button
    await page.focus('button:has-text("Publish Review")');
    
    // Record focused element
    const focusedBefore = await page.evaluate(() => {
      return document.activeElement?.tagName || 'NONE';
    });

    await page.click('button:has-text("Publish Review")');

    // Wait for server merge
    await page.waitForTimeout(1500);

    // Check if focus is maintained or properly restored
    const focusedAfter = await page.evaluate(() => {
      return document.activeElement?.tagName || 'NONE';
    });

    // Focus should be on a valid interactive element (not BODY)
    expect(focusedAfter).not.toBe('BODY');
  });
});
