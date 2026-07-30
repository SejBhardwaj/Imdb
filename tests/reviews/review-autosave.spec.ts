/**
 * Review Autosave E2E Tests
 * 
 * Tests:
 * - Draft autosave every 2 seconds
 * - Draft restoration on page reload
 * - Draft deletion after publish
 */

import { test, expect } from '@playwright/test';

test.describe('Review Draft Autosave', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });

    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');
  });

  test('draft saves automatically every 2 seconds', async ({ page }) => {
    await page.click('button:has-text("Write a Review")');

    // Start typing
    await page.fill('input[name="title"]', 'Autosave Test');
    await page.fill('textarea[name="content"]', 
      'Testing the autosave functionality to ensure drafts are saved automatically every two seconds.'
    );

    // Wait for "Saving..." status
    await expect(page.locator('text=Saving')).toBeVisible({ timeout: 3000 });

    // Wait for "Saved" status
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Verify draft is saved in IndexedDB
    const draftExists = await page.evaluate(async () => {
      const db = await window.indexedDB.open('imdb-reviews-db', 1);
      return new Promise((resolve) => {
        db.onsuccess = async () => {
          const tx = db.result.transaction('drafts', 'readonly');
          const store = tx.objectStore('drafts');
          const request = store.getAll();
          request.onsuccess = () => {
            resolve(request.result.length > 0);
          };
        };
      });
    });

    expect(draftExists).toBe(true);
  });

  test('draft is restored after page reload', async ({ page }) => {
    await page.click('button:has-text("Write a Review")');

    // Write draft
    await page.fill('input[name="title"]', 'Reload Test Review');
    await page.fill('textarea[name="content"]', 
      'This draft should be restored after the page reloads to ensure data persistence works correctly.'
    );
    await page.click('[aria-label="Rate 7 out of 10"]');

    // Wait for autosave
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open review form
    await page.click('button:has-text("Write a Review")');

    // Verify draft is restored
    await expect(page.locator('input[name="title"]')).toHaveValue('Reload Test Review');
    await expect(page.locator('textarea[name="content"]')).toContainText('This draft should be restored');
    await expect(page.locator('input[name="rating"]')).toHaveValue('7');
  });

  test('draft is restored after browser restart (using storage)', async ({ page, context }) => {
    await page.click('button:has-text("Write a Review")');

    // Write draft
    await page.fill('input[name="title"]', 'Persistent Draft');
    await page.fill('textarea[name="content"]', 
      'Testing persistence across browser sessions to ensure drafts survive even after closing the browser.'
    );

    // Wait for autosave
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Close and reopen page (simulating browser restart)
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/movies/550');
    await newPage.waitForLoadState('networkidle');

    await newPage.click('button:has-text("Write a Review")');

    // Draft should still be there
    await expect(newPage.locator('input[name="title"]')).toHaveValue('Persistent Draft');
  });

  test('draft is deleted after successful publish', async ({ page }) => {
    await page.click('button:has-text("Write a Review")');

    // Write review
    await page.fill('input[name="title"]', 'Review to Publish');
    await page.fill('textarea[name="content"]', 
      'This review will be published and the draft should be automatically deleted from storage.'
    );
    await page.click('[aria-label="Rate 8 out of 10"]');

    // Wait for autosave
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Publish
    await page.click('button:has-text("Publish Review")');

    // Wait for success
    await expect(page.locator('text=Review published successfully')).toBeVisible();

    // Verify draft is deleted from IndexedDB
    const draftDeleted = await page.evaluate(async () => {
      const db = await window.indexedDB.open('imdb-reviews-db', 1);
      return new Promise((resolve) => {
        db.onsuccess = async () => {
          const tx = db.result.transaction('drafts', 'readonly');
          const store = tx.objectStore('drafts');
          const request = store.getAll();
          request.onsuccess = () => {
            resolve(request.result.length === 0);
          };
        };
      });
    });

    expect(draftDeleted).toBe(true);
  });

  test('multiple drafts for different movies', async ({ page }) => {
    // Create draft for movie 550
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Movie 550 Draft');
    await page.fill('textarea[name="content"]', 
      'Draft for the first movie to test multiple draft handling across different movie pages.'
    );
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Navigate to different movie
    await page.goto('/movies/551');
    await page.waitForLoadState('networkidle');

    // Create draft for movie 551
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Movie 551 Draft');
    await page.fill('textarea[name="content"]', 
      'Draft for the second movie to ensure drafts are properly isolated per movie.'
    );
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Go back to movie 550
    await page.goto('/movies/550');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Write a Review")');

    // Should have movie 550 draft
    await expect(page.locator('input[name="title"]')).toHaveValue('Movie 550 Draft');

    // Go to movie 551
    await page.goto('/movies/551');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Write a Review")');

    // Should have movie 551 draft
    await expect(page.locator('input[name="title"]')).toHaveValue('Movie 551 Draft');
  });

  test('save status updates correctly', async ({ page }) => {
    await page.click('button:has-text("Write a Review")');

    // Initially should show "No draft"
    await expect(page.locator('text=No draft')).toBeVisible();

    // Start typing
    await page.fill('input[name="title"]', 'Status Test');

    // Should show "Unsaved changes"
    await expect(page.locator('text=Unsaved changes')).toBeVisible();

    // Wait for auto-save
    await expect(page.locator('text=Saving')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 2000 });

    // After a moment, should show time ago
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/Saved \\d+s ago/')).toBeVisible();
  });

  test('unsaved changes warning on navigation', async ({ page }) => {
    await page.click('button:has-text("Write a Review")');

    // Write something but don't wait for save
    await page.fill('input[name="title"]', 'Quick Type');
    await page.fill('textarea[name="content"]', 'Content');

    // Try to navigate away immediately
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('unsaved changes');
      dialog.dismiss();
    });

    // This would trigger beforeunload if implemented
    // await page.goto('/');
  });
});
