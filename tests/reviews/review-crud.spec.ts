/**
 * Review CRUD E2E Tests
 * 
 * Tests:
 * - Authenticated CRUD operations
 * - Guest read-only access
 * - Authorization checks
 */

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Review CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to movie page
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');
  });

  test('guest users can read reviews but not create', async ({ page }) => {
    // Check that reviews are visible
    const reviewsList = page.locator('[data-testid="reviews-list"]');
    await expect(reviewsList).toBeVisible();

    // Write review button should not be visible for guests
    const writeButton = page.locator('button:has-text("Write a Review")');
    await expect(writeButton).not.toBeVisible();
  });

  test('authenticated users can create review', async ({ page }) => {
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click write review button
    await page.click('button:has-text("Write a Review")');

    // Fill review form
    await page.fill('input[name="title"]', 'Amazing movie!');
    await page.fill('textarea[name="content"]', 
      'This is a detailed review with more than fifty characters to meet the minimum requirement for content length.'
    );

    // Set rating
    await page.click('[aria-label="Rate 9 out of 10"]');

    // Wait for autosave
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Submit review
    await page.click('button:has-text("Publish Review")');

    // Verify review appears in list
    await expect(page.locator('text=Amazing movie!')).toBeVisible();
    await expect(page.locator('text=This is a detailed review')).toBeVisible();
  });

  test('users can edit their own reviews', async ({ page }) => {
    // Setup: Create a review first
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.reload();

    // Create review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Original Title');
    await page.fill('textarea[name="content"]', 
      'Original content with enough characters to meet minimum requirements for the review system validation.'
    );
    await page.click('[aria-label="Rate 8 out of 10"]');
    await page.click('button:has-text("Publish Review")');

    // Wait for review to appear
    await page.waitForSelector('text=Original Title');

    // Open actions menu
    await page.click('[aria-label="Review actions"]');

    // Click edit
    await page.click('text=Edit Review');

    // Update review
    await page.fill('input[name="title"]', 'Updated Title');
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await expect(page.locator('text=Updated Title')).toBeVisible();
    await expect(page.locator('text=Edited')).toBeVisible();
  });

  test('users can delete their own reviews with undo', async ({ page }) => {
    // Setup
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.reload();

    // Create review
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Review to Delete');
    await page.fill('textarea[name="content"]', 
      'This review will be deleted as part of the test to verify deletion functionality works correctly.'
    );
    await page.click('button:has-text("Publish Review")');

    await page.waitForSelector('text=Review to Delete');

    // Delete review
    await page.click('[aria-label="Review actions"]');
    
    // Confirm deletion
    page.once('dialog', dialog => dialog.accept());
    await page.click('text=Delete Review');

    // Verify undo toast appears
    await expect(page.locator('text=Review deleted')).toBeVisible();
    await expect(page.locator('button:has-text("Undo")')).toBeVisible();

    // Review should be removed from list
    await expect(page.locator('text=Review to Delete')).not.toBeVisible();

    // Test undo
    await page.click('button:has-text("Undo")');

    // Review should reappear
    await expect(page.locator('text=Review to Delete')).toBeVisible();
  });

  test('users cannot edit or delete other users reviews', async ({ page }) => {
    // Create review as user 1
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'User One',
      }));
    });

    await page.reload();

    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'User One Review');
    await page.fill('textarea[name="content"]', 
      'This review belongs to user one and should not be editable by other users in the system.'
    );
    await page.click('button:has-text("Publish Review")');

    await page.waitForSelector('text=User One Review');

    // Switch to user 2
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-2',
        displayName: 'User Two',
      }));
    });

    await page.reload();

    // Open actions menu on user 1's review
    await page.click('[aria-label="Review actions"]');

    // Should only see "Report Review" option, not "Edit" or "Delete"
    await expect(page.locator('text=Edit Review')).not.toBeVisible();
    await expect(page.locator('text=Delete Review')).not.toBeVisible();
    await expect(page.locator('text=Report Review')).toBeVisible();
  });

  test('review form validates input', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.reload();

    await page.click('button:has-text("Write a Review")');

    // Try to submit empty form
    const publishButton = page.locator('button:has-text("Publish Review")');
    await expect(publishButton).toBeDisabled();

    // Fill title only (should still be invalid)
    await page.fill('input[name="title"]', 'Title');
    await expect(publishButton).toBeDisabled();

    // Fill content but too short
    await page.fill('textarea[name="content"]', 'Too short');
    await expect(publishButton).toBeDisabled();

    // Fill valid content
    await page.fill('textarea[name="content"]', 
      'This is now a proper review with enough content to meet the validation requirements.'
    );

    // Should now be enabled
    await expect(publishButton).toBeEnabled();
  });

  test('accessibility: review form is keyboard navigable', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.reload();

    await page.click('button:has-text("Write a Review")');

    // Tab through form elements
    await page.keyboard.press('Tab'); // Rating input
    await page.keyboard.type('8');

    await page.keyboard.press('Tab'); // Title input
    await page.keyboard.type('Keyboard Test Review');

    await page.keyboard.press('Tab'); // Content textarea
    await page.keyboard.type('Testing keyboard navigation through the review form to ensure accessibility compliance.');

    // Verify values were entered
    await expect(page.locator('input[name="title"]')).toHaveValue('Keyboard Test Review');
  });

  test('accessibility: no violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
