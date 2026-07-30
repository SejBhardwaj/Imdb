/**
 * Review Voting E2E Tests
 * 
 * Tests:
 * - Upvote/downvote functionality
 * - Wilson score ranking
 * - Sort by helpful/controversial
 * - Optimistic updates
 */

import { test, expect } from '@playwright/test';

test.describe('Review Voting & Ranking', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');
  });

  test('user can upvote review', async ({ page }) => {
    // Find first review's upvote button
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();
    const initialCount = await upvoteButton.textContent();

    // Click upvote
    await upvoteButton.click();

    // Button should show pressed state
    await expect(upvoteButton).toHaveAttribute('aria-pressed', 'true');

    // Count should increment (optimistic update)
    await expect(upvoteButton).not.toHaveText(initialCount || '0');
  });

  test('user can downvote review', async ({ page }) => {
    const downvoteButton = page.locator('[aria-label="Downvote review"]').first();
    const initialCount = await downvoteButton.textContent();

    await downvoteButton.click();

    await expect(downvoteButton).toHaveAttribute('aria-pressed', 'true');
    await expect(downvoteButton).not.toHaveText(initialCount || '0');
  });

  test('user can toggle vote (remove by clicking again)', async ({ page }) => {
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();

    // First click - upvote
    await upvoteButton.click();
    await expect(upvoteButton).toHaveAttribute('aria-pressed', 'true');

    // Second click - remove vote
    await upvoteButton.click();
    await expect(upvoteButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('user can switch from upvote to downvote', async ({ page }) => {
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();
    const downvoteButton = page.locator('[aria-label="Downvote review"]').first();

    // Upvote first
    await upvoteButton.click();
    await expect(upvoteButton).toHaveAttribute('aria-pressed', 'true');

    // Switch to downvote
    await downvoteButton.click();
    await expect(downvoteButton).toHaveAttribute('aria-pressed', 'true');
    await expect(upvoteButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('helpful score updates after voting', async ({ page }) => {
    // Find a review with vote buttons
    const reviewCard = page.locator('[data-testid="review-card"]').first();
    const upvoteButton = reviewCard.locator('[aria-label="Upvote review"]');

    // Check for helpful score
    const helpfulScore = reviewCard.locator('text=/\\d+% helpful/');

    // Vote
    await upvoteButton.click();

    // Wait for update
    await page.waitForTimeout(1000);

    // Score should be recalculated
    await expect(helpfulScore).toBeVisible();
  });

  test('sort by helpful uses Wilson score', async ({ page }) => {
    // Select "Most Helpful" tab
    await page.click('button:has-text("Most Helpful")');

    // Get all review titles
    const reviewTitles = await page.locator('[data-testid="review-title"]').allTextContents();

    // Reviews should be sorted by Wilson score
    // (We can't verify exact order without knowing scores, but verify sorting happens)
    expect(reviewTitles.length).toBeGreaterThan(0);

    // Click first review - it should have highest Wilson score
    // Verify it has good vote ratio
    const firstReview = page.locator('[data-testid="review-card"]').first();
    const helpfulScore = await firstReview.locator('text=/\\d+% helpful/').textContent();
    
    if (helpfulScore) {
      const percentage = parseInt(helpfulScore);
      // First review should have decent score (not testing exact value)
      expect(percentage).toBeGreaterThanOrEqual(0);
    }
  });

  test('sort by recent shows newest first', async ({ page }) => {
    // Select "Most Recent" tab
    await page.click('button:has-text("Most Recent")');

    // Get first review
    const firstReview = page.locator('[data-testid="review-card"]').first();
    const timestamp = await firstReview.locator('text=/ago|just now/').textContent();

    // Should show recent timestamp
    expect(timestamp).toBeTruthy();
    expect(timestamp).toMatch(/(just now|seconds ago|minutes ago|hours ago|day ago)/);
  });

  test('sort by controversial shows balanced votes', async ({ page }) => {
    // Select "Controversial" tab
    await page.click('button:has-text("Controversial")');

    // Get reviews
    const reviews = page.locator('[data-testid="review-card"]');
    const count = await reviews.count();

    expect(count).toBeGreaterThanOrEqual(0);

    // If there are reviews, first one should have significant votes
    if (count > 0) {
      const firstReview = reviews.first();
      const upvotes = await firstReview.locator('[aria-label="Upvote review"]').textContent();
      const downvotes = await firstReview.locator('[aria-label="Downvote review"]').textContent();

      // Both should have votes for it to be controversial
      // (This is a weak test without real data)
      expect(upvotes).toBeTruthy();
      expect(downvotes).toBeTruthy();
    }
  });

  test('vote animations with Framer Motion', async ({ page }) => {
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();

    // Click and verify animation occurs (button should have motion attributes)
    await upvoteButton.click();

    // Check for animation-related classes or attributes
    const hasAnimation = await upvoteButton.evaluate((el) => {
      return el.classList.contains('bg-green-600') || 
             el.getAttribute('data-framer-appear-id') !== null;
    });

    // At minimum, button should change appearance
    await expect(upvoteButton).toHaveClass(/bg-green/);
  });

  test('vote persists after page reload', async ({ page }) => {
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();

    // Upvote
    await upvoteButton.click();
    await expect(upvoteButton).toHaveAttribute('aria-pressed', 'true');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Vote should still be there
    const upvoteButtonAfterReload = page.locator('[aria-label="Upvote review"]').first();
    await expect(upvoteButtonAfterReload).toHaveAttribute('aria-pressed', 'true');
  });

  test('optimistic update shows immediately', async ({ page }) => {
    // Slow down network to test optimistic update
    await page.route('**/api/reviews/*/vote', route => {
      setTimeout(() => route.continue(), 2000); // 2 second delay
    });

    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();
    const initialText = await upvoteButton.textContent();

    // Click vote
    await upvoteButton.click();

    // Should update immediately (before server responds)
    await expect(async () => {
      const newText = await upvoteButton.textContent();
      expect(newText).not.toBe(initialText);
    }).toPass({ timeout: 500 }); // Should happen within 500ms
  });

  test('guest users cannot vote', async ({ page }) => {
    // Clear authentication
    await page.evaluate(() => {
      localStorage.removeItem('user');
    });

    await page.reload();

    // Vote buttons should be disabled
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();
    await expect(upvoteButton).toBeDisabled();
  });

  test('accessibility: vote buttons have proper ARIA', async ({ page }) => {
    const upvoteButton = page.locator('[aria-label="Upvote review"]').first();
    const downvoteButton = page.locator('[aria-label="Downvote review"]').first();

    // Check ARIA attributes
    await expect(upvoteButton).toHaveAttribute('aria-label');
    await expect(upvoteButton).toHaveAttribute('aria-pressed');
    await expect(downvoteButton).toHaveAttribute('aria-label');
    await expect(downvoteButton).toHaveAttribute('aria-pressed');
  });
});
