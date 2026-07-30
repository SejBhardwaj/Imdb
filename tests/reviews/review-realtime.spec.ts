/**
 * Review Realtime Updates E2E Tests
 * 
 * Tests:
 * - SSE connection
 * - Live review updates
 * - Backpressure handling
 * - Multi-client sync
 */

import { test, expect } from '@playwright/test';

test.describe('Review Realtime Updates', () => {
  test('SSE connection establishes on page load', async ({ page }) => {
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Check for connection indicator
    await expect(page.locator('text=/Live updates/i')).toBeVisible({ timeout: 5000 });

    // Verify SSE connection in network tab
    const sseRequest = await page.waitForRequest(
      request => request.url().includes('/api/reviews/sse'),
      { timeout: 5000 }
    );

    expect(sseRequest.url()).toContain('movieId=550');
  });

  test('new review appears in realtime for other users', async ({ browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup user 1
    await page1.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'user-1',
        displayName: 'User One',
      }));
    });

    // Setup user 2
    await page2.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'user-2',
        displayName: 'User Two',
      }));
    });

    // Both navigate to same movie
    await Promise.all([
      page1.goto('/movies/550'),
      page2.goto('/movies/550'),
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle'),
    ]);

    // User 1 creates a review
    await page1.click('button:has-text("Write a Review")');
    await page1.fill('input[name="title"]', 'Realtime Test Review');
    await page1.fill('textarea[name="content"]', 
      'Testing realtime updates to verify other users see new reviews immediately without refresh.'
    );
    await page1.click('button:has-text("Publish Review")');

    // User 2 should see the new review appear automatically
    await expect(page2.locator('text=Realtime Test Review')).toBeVisible({ timeout: 5000 });

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('vote updates appear in realtime', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ uid: 'user-1', displayName: 'User One' }));
    });

    await page2.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ uid: 'user-2', displayName: 'User Two' }));
    });

    await Promise.all([
      page1.goto('/movies/550'),
      page2.goto('/movies/550'),
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle'),
    ]);

    // Get initial vote count on page 2
    const upvoteButton2 = page2.locator('[aria-label="Upvote review"]').first();
    const initialCount = await upvoteButton2.textContent();

    // User 1 upvotes
    const upvoteButton1 = page1.locator('[aria-label="Upvote review"]').first();
    await upvoteButton1.click();

    // Page 2 should see updated count
    await expect(async () => {
      const newCount = await upvoteButton2.textContent();
      expect(newCount).not.toBe(initialCount);
    }).toPass({ timeout: 5000 });

    await context1.close();
    await context2.close();
  });

  test('backpressure: handles burst of updates without freezing', async ({ page }) => {
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Monitor for UI freezing (should remain responsive)
    let clickSucceeded = false;

    // Simulate burst of updates (mock many SSE messages)
    await page.evaluate(() => {
      const eventSource = new EventSource('/api/reviews/sse?movieId=550');
      
      // Send 100 rapid updates
      for (let i = 0; i < 100; i++) {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'vote',
            review: { id: `review-${i}`, votes: { upvotes: i } },
            movieId: 550,
            timestamp: Date.now(),
          }),
        });
        eventSource.dispatchEvent(event);
      }
    });

    // UI should still be responsive (can click buttons)
    await page.waitForTimeout(1000); // Let updates buffer

    try {
      await page.click('[aria-label="Sort tabs"]', { timeout: 2000 });
      clickSucceeded = true;
    } catch (error) {
      clickSucceeded = false;
    }

    expect(clickSucceeded).toBe(true);
  });

  test('buffered updates are processed in batches', async ({ page }) => {
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Check that buffer size is reported
    const bufferIndicator = page.locator('text=/buffered/i');

    // Send multiple updates rapidly
    await page.evaluate(() => {
      const eventSource = new EventSource('/api/reviews/sse?movieId=550');
      
      for (let i = 0; i < 10; i++) {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'create',
            review: { id: `new-${i}`, title: `Review ${i}` },
            movieId: 550,
            timestamp: Date.now(),
          }),
        });
        eventSource.dispatchEvent(event);
      }
    });

    // Buffer should show updates pending
    await expect(bufferIndicator).toBeVisible({ timeout: 2000 });

    // After flush interval, buffer should clear
    await page.waitForTimeout(1500); // Flush interval is 1 second
    await expect(bufferIndicator).not.toBeVisible();
  });

  test('reconnects automatically after connection drop', async ({ page }) => {
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Verify connected
    await expect(page.locator('text=/Live updates/i')).toBeVisible();

    // Close SSE connection
    await page.evaluate(() => {
      const eventSources = (window as any).eventSources || [];
      eventSources.forEach((es: EventSource) => es.close());
    });

    // Should show disconnected
    await expect(page.locator('text=/offline/i')).toBeVisible({ timeout: 3000 });

    // Wait for auto-reconnect (5 seconds)
    await page.waitForTimeout(6000);

    // Should reconnect
    await expect(page.locator('text=/Live updates/i')).toBeVisible({ timeout: 5000 });
  });

  test('updates maintain sort order', async ({ page }) => {
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Select "Most Recent" sort
    await page.click('button:has-text("Most Recent")');

    // Get first review title before update
    const firstReviewBefore = await page
      .locator('[data-testid="review-card"]')
      .first()
      .locator('[data-testid="review-title"]')
      .textContent();

    // Simulate new review arriving via SSE
    await page.evaluate(() => {
      const event = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'create',
          review: {
            id: 'newest-review',
            title: 'Brand New Review',
            metadata: { createdAt: Date.now() },
          },
          movieId: 550,
          timestamp: Date.now(),
        }),
      });

      const eventSource = new EventSource('/api/reviews/sse?movieId=550');
      eventSource.dispatchEvent(event);
    });

    // Wait for update
    await page.waitForTimeout(1500);

    // New review should be first (most recent)
    const firstReviewAfter = await page
      .locator('[data-testid="review-card"]')
      .first()
      .locator('[data-testid="review-title"]')
      .textContent();

    expect(firstReviewAfter).toBe('Brand New Review');
    expect(firstReviewAfter).not.toBe(firstReviewBefore);
  });

  test('update counter increments correctly', async ({ page }) => {
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');

    // Get initial update count
    const updateCountText = await page.locator('text=/\\d+ updates received/').textContent();
    const initialCount = parseInt(updateCountText?.match(/\d+/)?.[0] || '0');

    // Send multiple updates
    await page.evaluate(() => {
      const eventSource = new EventSource('/api/reviews/sse?movieId=550');
      
      for (let i = 0; i < 5; i++) {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'vote',
            review: { id: `review-${i}` },
            movieId: 550,
            timestamp: Date.now(),
          }),
        });
        eventSource.dispatchEvent(event);
      }
    });

    // Wait for processing
    await page.waitForTimeout(1500);

    // Count should increment
    const newCountText = await page.locator('text=/\\d+ updates received/').textContent();
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || '0');

    expect(newCount).toBeGreaterThan(initialCount);
  });
});
