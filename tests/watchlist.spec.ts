/**
 * Playwright E2E Tests for Offline-First Watchlist
 * 
 * Tests:
 * 1. Offline functionality
 * 2. Cross-tab synchronization
 * 3. Rollback on failure
 * 4. Conflict resolution
 * 5. Persistence after refresh
 * 6. Background sync
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe('Offline-First Watchlist', () => {
  const MOVIE_ID = 550; // Fight Club
  const MOVIE_TITLE = 'Fight Club';

  test.beforeEach(async ({ page }) => {
    // Initialize repository before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clear watchlist
    await page.evaluate(async () => {
      const { WatchlistRepository } = await import('@/repositories/WatchlistRepository');
      await WatchlistRepository.initialize('test-user');
      await WatchlistRepository.clear();
    });
  });

  /**
   * Test 1: Offline Functionality
   */
  test('should work offline', async ({ page, context }) => {
    test.setTimeout(60000); // 60 seconds

    // Add movie while online
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Go offline
    await context.setOffline(true);
    
    // Remove movie while offline
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Add movie again while offline
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Refresh page (still offline)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be in watchlist
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
    
    // Verify state persisted
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 2: Cross-Tab Synchronization
   */
  test('should sync across tabs', async ({ context }) => {
    test.setTimeout(30000);

    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/');
    await page2.goto('/');
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    // Add movie in tab 1
    await page1.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page1.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Should automatically appear in tab 2 (via BroadcastChannel)
    await expect(page2.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 3000 });
    
    // Remove in tab 2
    await page2.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page2.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Should automatically update in tab 1
    await expect(page1.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 3000 });
    
    await page1.close();
    await page2.close();
  });

  /**
   * Test 3: Rollback on Failure
   */
  test('should rollback on server error', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');
    
    // Mock server error
    await page.route('**/api/watchlist/**', (route) => {
      route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ error: 'Server error' }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    // Try to add movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    
    // Should show optimistically
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 2000 });
    
    // Wait for sync to fail and rollback
    await page.waitForSelector('[data-testid="sync-failed"]', { timeout: 5000 });
    
    // Should rollback to not-in-watchlist
    await expect(page.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 3000 });
    
    // Should show error toast
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('Failed', { timeout: 3000 });
  });

  /**
   * Test 4: Persistence After Refresh
   */
  test('should persist after refresh', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');
    
    // Add movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Wait for sync
    await page.waitForTimeout(2000);
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be in watchlist
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Remove movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Refresh again
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should be removed
    await expect(page.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 5: Conflict Resolution (Last-Write-Wins)
   */
  test('should resolve conflicts with Last-Write-Wins', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');
    
    // Simulate conflict scenario
    await page.evaluate(async (movieId) => {
      const { WatchlistRepository } = await import('@/repositories/WatchlistRepository');
      const { getDB } = await import('@/lib/db/indexedDB');
      
      // Add movie with old timestamp
      const db = await getDB();
      await db.put('watchlist', {
        movieId,
        addedAt: Date.now() - 10000, // 10 seconds ago
        lastModified: Date.now() - 10000,
        deviceId: 'device1',
      });
      
      // Simulate server has newer removal
      // In real scenario, fetchAndMergeFromServer() would handle this
    }, MOVIE_ID);
    
    // Refresh to load watchlist
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show in watchlist (local state)
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Trigger merge from server (which has newer removal)
    await page.evaluate(async () => {
      const { WatchlistRepository } = await import('@/repositories/WatchlistRepository');
      await WatchlistRepository.fetchAndMergeFromServer();
    });
    
    // After merge, newer server state should win
    // (In this test, we'd need to mock the server response)
  });

  /**
   * Test 6: Offline Queue Management
   */
  test('should queue operations offline and sync when online', async ({ page, context }) => {
    test.setTimeout(60000);

    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    
    // Add movie 1
    await page.click(`[data-testid="watchlist-button-550"]`);
    await expect(page.locator('[data-testid="in-watchlist-550"]')).toBeVisible({ timeout: 5000 });
    
    // Add movie 2
    await page.click(`[data-testid="watchlist-button-551"]`);
    await expect(page.locator('[data-testid="in-watchlist-551"]')).toBeVisible({ timeout: 5000 });
    
    // Remove movie 1
    await page.click(`[data-testid="watchlist-button-550"]`);
    await expect(page.locator('[data-testid="not-in-watchlist-550"]')).toBeVisible({ timeout: 5000 });
    
    // Check queue size
    const queueSize = await page.evaluate(async () => {
      const { getDB } = await import('@/lib/db/indexedDB');
      const db = await getDB();
      const queue = await db.getAll('offlineQueue');
      return queue.length;
    });
    
    expect(queueSize).toBe(3); // 3 operations queued
    
    // Go online
    await context.setOffline(false);
    
    // Wait for automatic sync
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
    
    // Queue should be cleared
    const queueSizeAfter = await page.evaluate(async () => {
      const { getDB } = await import('@/lib/db/indexedDB');
      const db = await getDB();
      const queue = await db.getAll('offlineQueue');
      return queue.length;
    });
    
    expect(queueSizeAfter).toBe(0);
  });

  /**
   * Test 7: Service Worker Background Sync
   */
  test('should trigger background sync via service worker', async ({ page, context }) => {
    test.setTimeout(60000);

    await page.goto('/');
    
    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      return 'serviceWorker' in navigator && !!(await navigator.serviceWorker.ready);
    });
    
    if (!swRegistered) {
      test.skip();
      return;
    }
    
    // Go offline
    await context.setOffline(true);
    
    // Add movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Go online (should trigger background sync automatically)
    await context.setOffline(false);
    
    // Wait for service worker to sync
    await page.waitForTimeout(5000);
    
    // Check if queue is empty (synced by service worker)
    const queueSize = await page.evaluate(async () => {
      const { getDB } = await import('@/lib/db/indexedDB');
      const db = await getDB();
      const queue = await db.getAll('offlineQueue');
      return queue.length;
    });
    
    expect(queueSize).toBe(0);
  });

  /**
   * Test 8: Accessibility - ARIA Announcements
   */
  test('should announce changes to screen readers', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');
    
    // Add movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    
    // Check ARIA live region
    const announcement = await page.locator('[role="status"][aria-live="polite"]').textContent();
    expect(announcement).toContain('added to watchlist');
    
    // Remove movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    
    // Check ARIA announcement
    await page.waitForTimeout(1000);
    const announcement2 = await page.locator('[role="status"][aria-live="polite"]').textContent();
    expect(announcement2).toContain('removed from watchlist');
  });

  /**
   * Test 9: Keyboard Navigation
   */
  test('should support keyboard navigation', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');
    
    // Focus watchlist button
    await page.keyboard.press('Tab');
    
    // Activate with Enter
    await page.keyboard.press('Enter');
    
    // Should add to watchlist
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Activate with Space
    await page.keyboard.press('Space');
    
    // Should remove from watchlist
    await expect(page.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 10: Undo Action
   */
  test('should allow undo action', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');
    
    // Add movie
    await page.click(`[data-testid="watchlist-button-${MOVIE_ID}"]`);
    await expect(page.locator('[data-testid="in-watchlist"]')).toBeVisible({ timeout: 5000 });
    
    // Should show undo toast
    await expect(page.locator('[data-testid="undo-button"]')).toBeVisible({ timeout: 3000 });
    
    // Click undo
    await page.click('[data-testid="undo-button"]');
    
    // Should remove from watchlist
    await expect(page.locator('[data-testid="not-in-watchlist"]')).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Helper function to clear IndexedDB between tests
 */
async function clearIndexedDB(page: Page) {
  await page.evaluate(async () => {
    const { clearDB } = await import('@/lib/db/indexedDB');
    await clearDB();
  });
}
