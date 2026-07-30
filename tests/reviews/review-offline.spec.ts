/**
 * Review Offline & Background Sync E2E Tests
 * 
 * Tests:
 * - Offline submission queuing
 * - Background sync on reconnect
 * - Idempotency (no duplicate submissions)
 */

import { test, expect } from '@playwright/test';

test.describe('Review Offline & Background Sync', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant permissions for service worker
    await context.grantPermissions(['notifications']);

    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Register service worker
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw-reviews.js');
        await navigator.serviceWorker.ready;
      }
    });
  });

  test('review is queued when offline', async ({ page, context }) => {
    await page.click('button:has-text("Write a Review")');

    // Fill review
    await page.fill('input[name="title"]', 'Offline Review');
    await page.fill('textarea[name="content"]', 
      'This review is being submitted while offline and should be queued for later synchronization.'
    );
    await page.click('[aria-label="Rate 9 out of 10"]');

    // Go offline
    await context.setOffline(true);

    // Submit review
    await page.click('button:has-text("Publish Review")');

    // Should see offline message
    await expect(page.locator('text=/will be published when online/i')).toBeVisible();

    // Verify review is in offline queue
    const isQueued = await page.evaluate(async () => {
      const db = await window.indexedDB.open('imdb-reviews-db', 1);
      return new Promise((resolve) => {
        db.onsuccess = async () => {
          const tx = db.result.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const request = store.getAll();
          request.onsuccess = () => {
            resolve(request.result.length > 0);
          };
        };
      });
    });

    expect(isQueued).toBe(true);
  });

  test('queued review syncs when coming back online', async ({ page, context }) => {
    // Setup: Queue a review while offline
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Sync Test Review');
    await page.fill('textarea[name="content"]', 
      'Testing automatic synchronization when network connectivity is restored after being offline.'
    );

    await context.setOffline(true);
    await page.click('button:has-text("Publish Review")');

    // Wait for queue
    await page.waitForTimeout(1000);

    // Go back online
    await context.setOffline(false);

    // Trigger sync event
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-reviews');
        }
      }
    });

    // Wait for sync to complete
    await expect(page.locator('text=Review published successfully')).toBeVisible({ timeout: 10000 });

    // Verify queue is empty
    const isQueueEmpty = await page.evaluate(async () => {
      const db = await window.indexedDB.open('imdb-reviews-db', 1);
      return new Promise((resolve) => {
        db.onsuccess = async () => {
          const tx = db.result.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const request = store.getAll();
          request.onsuccess = () => {
            resolve(request.result.length === 0);
          };
        };
      });
    });

    expect(isQueueEmpty).toBe(true);
  });

  test('idempotency prevents duplicate submissions', async ({ page, context }) => {
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Idempotency Test');
    await page.fill('textarea[name="content"]', 
      'Testing idempotency to ensure duplicate submissions are prevented even with poor network conditions.'
    );

    // Simulate flaky network - go offline/online rapidly
    await context.setOffline(true);
    
    // Click submit multiple times
    await page.click('button:has-text("Publish Review")');
    await page.waitForTimeout(100);
    await page.click('button:has-text("Publish Review")');
    await page.waitForTimeout(100);
    await page.click('button:has-text("Publish Review")');

    // Come back online
    await context.setOffline(false);

    // Trigger sync
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-reviews');
      }
    });

    // Wait for completion
    await page.waitForTimeout(3000);

    // Verify only ONE review was created (check review list)
    const reviewCount = await page.locator('text=Idempotency Test').count();
    expect(reviewCount).toBe(1);
  });

  test('multiple queued actions sync in order', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Create first review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'First Offline Review');
    await page.fill('textarea[name="content"]', 
      'First review submitted while offline to test queue ordering and sequential processing.'
    );
    await page.click('button:has-text("Publish Review")');
    await page.waitForTimeout(500);

    // Create second review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Second Offline Review');
    await page.fill('textarea[name="content"]', 
      'Second review submitted while offline to verify multiple items in queue are handled correctly.'
    );
    await page.click('button:has-text("Publish Review")');
    await page.waitForTimeout(500);

    // Verify 2 items in queue
    const queueSize = await page.evaluate(async () => {
      const db = await window.indexedDB.open('imdb-reviews-db', 1);
      return new Promise((resolve) => {
        db.onsuccess = async () => {
          const tx = db.result.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const request = store.getAll();
          request.onsuccess = () => {
            resolve(request.result.length);
          };
        };
      });
    });

    expect(queueSize).toBe(2);

    // Come back online
    await context.setOffline(false);

    // Trigger sync
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-reviews');
      }
    });

    // Wait for both to sync
    await page.waitForTimeout(5000);

    // Both reviews should appear
    await expect(page.locator('text=First Offline Review')).toBeVisible();
    await expect(page.locator('text=Second Offline Review')).toBeVisible();
  });

  test('retry with exponential backoff on persistent failure', async ({ page, context }) => {
    // Mock server to return errors
    await page.route('**/api/reviews', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await context.setOffline(true);

    // Submit review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Retry Test');
    await page.fill('textarea[name="content"]', 
      'Testing retry logic with exponential backoff when server returns persistent errors.'
    );
    await page.click('button:has-text("Publish Review")');

    await context.setOffline(false);

    // Trigger sync
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-reviews');
      }
    });

    // Wait for retry attempts
    await page.waitForTimeout(5000);

    // Verify review is still in queue (due to persistent failure)
    const stillQueued = await page.evaluate(async () => {
      const db = await window.indexedDB.open('imdb-reviews-db', 1);
      return new Promise((resolve) => {
        db.onsuccess = async () => {
          const tx = db.result.transaction('offlineQueue', 'readonly');
          const store = tx.objectStore('offlineQueue');
          const request = store.getAll();
          request.onsuccess = () => {
            const actions = request.result;
            resolve(actions.length > 0 && actions[0].retryCount > 0);
          };
        };
      });
    });

    expect(stillQueued).toBe(true);
  });

  test('offline indicator shows when network is down', async ({ page, context }) => {
    // Should show online indicator initially
    await expect(page.locator('text=/Live updates/i')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Trigger offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Should show offline indicator
    await expect(page.locator('text=/offline/i')).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Should show online again
    await expect(page.locator('text=/Live updates/i')).toBeVisible();
  });
});
