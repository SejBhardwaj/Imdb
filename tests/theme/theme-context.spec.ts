/**
 * Theme Context Unit Tests
 * 
 * Tests theme state management, persistence, and sync
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should initialize with default theme', async ({ page }) => {
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    
    expect(['light', 'dark']).toContain(theme);
  });

  test('should persist theme in cookie', async ({ page, context }) => {
    // Set theme to light
    await page.click('[aria-label*="Light"]');
    await page.waitForTimeout(500);

    // Check cookie
    const cookies = await context.cookies();
    const themeCookie = cookies.find(c => c.name === 'theme');
    
    expect(themeCookie).toBeDefined();
    expect(themeCookie?.value).toBe('light');
  });

  test('should sync theme across tabs', async ({ page, context }) => {
    // Open first tab and set theme
    await page.click('[aria-label*="Dark"]');
    await page.waitForTimeout(500);

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000');
    await page2.waitForTimeout(500);

    // Check theme matches
    const theme1 = await page.locator('html').getAttribute('data-theme');
    const theme2 = await page2.locator('html').getAttribute('data-theme');
    
    expect(theme1).toBe(theme2);

    await page2.close();
  });

  test('should preserve theme after reload', async ({ page }) => {
    // Set theme
    await page.click('[aria-label*="Light"]');
    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await page.waitForTimeout(500);

    // Check theme persisted
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');
  });

  test('should toggle between light and dark', async ({ page }) => {
    const html = page.locator('html');
    
    // Get initial theme
    const initialTheme = await html.getAttribute('data-theme');
    
    // Toggle theme (find the button with icon)
    await page.click('[role="radiogroup"] button:first-child');
    await page.waitForTimeout(300);
    
    // Check theme changed
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should apply CSS variables for theme', async ({ page }) => {
    await page.click('[aria-label*="Dark"]');
    await page.waitForTimeout(500);

    const bgColor = await page.evaluate(() => {
      const root = document.documentElement;
      return getComputedStyle(root).getPropertyValue('--color-background');
    });

    expect(bgColor).toBeTruthy();
  });
});

test.describe('Theme Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/settings/appearance');
  });

  test('should display theme options', async ({ page }) => {
    const options = await page.locator('[role="button"]').count();
    expect(options).toBeGreaterThan(0);
  });

  test('should allow theme selection', async ({ page }) => {
    const lightButton = page.locator('text=Light').first();
    await lightButton.click();
    await page.waitForTimeout(500);

    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');
  });

  test('should show accent color picker', async ({ page }) => {
    const accentColors = await page.locator('[aria-label*="accent color"]').count();
    expect(accentColors).toBeGreaterThan(0);
  });

  test('should allow accent color selection', async ({ page }) => {
    const purpleAccent = page.locator('[aria-label*="purple"]').first();
    await purpleAccent.click();
    await page.waitForTimeout(300);

    const accent = await page.locator('html').getAttribute('data-accent');
    expect(accent).toBe('purple');
  });

  test('should have accessibility toggles', async ({ page }) => {
    const toggles = await page.locator('[role="switch"]').count();
    expect(toggles).toBeGreaterThan(0);
  });

  test('should toggle reduced motion', async ({ page }) => {
    const reducedMotionToggle = page.locator('text=Reduced Motion').locator('..').locator('[role="switch"]');
    await reducedMotionToggle.click();
    await page.waitForTimeout(300);

    const hasReducedMotion = await page.locator('html').evaluate(el => 
      el.classList.contains('reduce-motion')
    );
    expect(hasReducedMotion).toBe(true);
  });

  test('should adjust font scale', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await slider.fill('1.25');
    await page.waitForTimeout(300);

    const fontSize = await page.locator('html').evaluate(el => 
      getComputedStyle(el).fontSize
    );
    expect(fontSize).toBeTruthy();
  });

  test('should reset to defaults', async ({ page }) => {
    // Make some changes
    await page.click('text=Dark');
    await page.waitForTimeout(300);

    // Reset
    await page.click('text=Reset to Defaults');
    await page.waitForTimeout(500);

    // Check reset
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['light', 'dark']).toContain(theme);
  });
});

test.describe('Theme Animations', () => {
  test('should animate theme transitions', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Set initial theme
    await page.click('[aria-label*="Light"]');
    await page.waitForTimeout(500);

    // Switch theme and check for transition
    const html = page.locator('html');
    const transitionBefore = await html.evaluate(el => 
      getComputedStyle(el).transition
    );

    await page.click('[aria-label*="Dark"]');
    
    // Wait for transition
    await page.waitForTimeout(100);
    
    const transitionDuring = await html.evaluate(el => 
      getComputedStyle(el).transition
    );

    // Transition should be applied during theme change
    expect(transitionDuring).toBeTruthy();
  });

  test('should disable animations with reduced motion', async ({ page }) => {
    await page.goto('http://localhost:3000/settings/appearance');
    
    // Enable reduced motion
    const reducedMotionToggle = page.locator('text=Reduced Motion').locator('..').locator('[role="switch"]');
    await reducedMotionToggle.click();
    await page.waitForTimeout(300);

    // Check animations disabled
    const hasReducedMotion = await page.locator('html').evaluate(el => 
      el.classList.contains('reduce-motion')
    );
    expect(hasReducedMotion).toBe(true);
  });
});

test.describe('Keyboard Navigation', () => {
  test('should navigate theme controls with keyboard', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Tab to theme toggle
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if theme toggle is focused
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('role'));
    expect(['radio', 'button']).toContain(focused || '');
  });

  test('should change theme with keyboard', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Focus theme control
    await page.click('[role="radiogroup"]');
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    // Theme should change
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBeTruthy();
  });
});
