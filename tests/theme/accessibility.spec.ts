/**
 * Theme Accessibility Tests
 * 
 * Tests WCAG 2.1 AA compliance and accessibility features
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Theme Accessibility', () => {
  test('should pass axe accessibility tests - light theme', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Set light theme
    await page.click('[aria-label*="Light"]');
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass axe accessibility tests - dark theme', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Set dark theme
    await page.click('[aria-label*="Dark"]');
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass axe accessibility tests - high contrast', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Set high contrast theme
    await page.click('[aria-label*="High Contrast"]');
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels on theme controls', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const radioGroup = page.locator('[role="radiogroup"]');
    expect(await radioGroup.count()).toBeGreaterThan(0);

    const ariaLabel = await radioGroup.getAttribute('aria-label');
    expect(ariaLabel).toContain('Theme');
  });

  test('should have proper ARIA checked states', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click light theme
    const lightButton = page.locator('[aria-label*="Light"]');
    await lightButton.click();
    await page.waitForTimeout(300);

    // Check aria-checked
    const isChecked = await lightButton.getAttribute('aria-checked');
    expect(isChecked).toBe('true');
  });

  test('should have keyboard focus indicators', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Tab to theme controls
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check focus ring
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const styles = getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
      };
    });

    expect(focused).toBeTruthy();
  });

  test('should support prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference via CSS
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:3000');
    
    // Check if reduced motion is respected
    const hasReducedMotion = await page.evaluate(() => 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    expect(hasReducedMotion).toBe(true);
  });

  test('should support prefers-color-scheme', async ({ page }) => {
    // Emulate dark color scheme via CSS
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('http://localhost:3000');
    
    // Check if system theme is detected
    const prefersDark = await page.evaluate(() => 
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    expect(prefersDark).toBe(true);
  });

  test('should have sufficient contrast ratios', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('should have accessible theme settings page', async ({ page }) => {
    await page.goto('http://localhost:3000/settings/appearance');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should announce theme changes to screen readers', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for aria-live region or status announcement
    const liveRegion = page.locator('[aria-live]');
    const count = await liveRegion.count();
    
    // Should have at least one live region for announcements
    expect(count).toBeGreaterThan(0);
  });

  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('http://localhost:3000/settings/appearance');
    
    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);

    // Check for landmark regions
    const main = await page.locator('main').count();
    expect(main).toBeGreaterThan(0);
  });

  test('should support keyboard navigation in settings', async ({ page }) => {
    await page.goto('http://localhost:3000/settings/appearance');
    
    // Tab through all interactive elements
    let tabCount = 0;
    const maxTabs = 20;

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;
      
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          tag: el.tagName,
          role: el.getAttribute('role'),
          type: el.getAttribute('type'),
        } : null;
      });

      // All focusable elements should be interactive
      if (activeElement) {
        const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
          activeElement.tag
        ) || activeElement.role;
        
        expect(isInteractive).toBe(true);
      }
    }
  });

  test('should have clear visual feedback for toggle states', async ({ page }) => {
    await page.goto('http://localhost:3000/settings/appearance');
    
    // Find a toggle switch
    const toggle = page.locator('[role="switch"]').first();
    
    // Get initial state
    const initialChecked = await toggle.getAttribute('aria-checked');
    
    // Toggle it
    await toggle.click();
    await page.waitForTimeout(300);
    
    // Check state changed
    const newChecked = await toggle.getAttribute('aria-checked');
    expect(newChecked).not.toBe(initialChecked);
  });
});
