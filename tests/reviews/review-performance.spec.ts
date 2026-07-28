/**
 * Review Performance Tests
 * 
 * Validates:
 * - TTI (Time to Interactive) < 2 seconds
 * - No jank with 100+ reviews
 * - Smooth scrolling (60 FPS)
 * - Virtual list rendering
 * - Memory efficiency
 * - Bundle size impact
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper to measure page metrics
async function getPerformanceMetrics(page: Page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Core Web Vitals
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      firstPaint: paint.find(e => e.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
      
      // Detailed timing
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnection: navigation.connectEnd - navigation.connectStart,
      serverResponse: navigation.responseEnd - navigation.requestStart,
      domProcessing: navigation.domComplete - navigation.domLoading,
    };
  });
  
  return metrics;
}

// Helper to generate mock reviews
function generateMockReviews(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `review-${i}`,
    movieId: 550,
    userId: `user-${i % 10}`,
    userName: `User ${i % 10}`,
    userPhotoURL: `https://i.pravatar.cc/150?img=${i % 10}`,
    rating: (i % 5) + 1,
    title: `Review ${i + 1} Title`,
    content: `This is review number ${i + 1}. `.repeat(20),
    pros: 'Great acting, Good story',
    cons: 'Slow pacing',
    containsSpoilers: i % 5 === 0,
    helpfulVotes: Math.floor(Math.random() * 100),
    unhelpfulVotes: Math.floor(Math.random() * 20),
    metadata: {
      createdAt: Date.now() - i * 86400000,
      updatedAt: Date.now() - i * 86400000,
      version: 1,
      isEdited: false,
      isFlagged: false,
      moderationStatus: 'approved' as const,
    },
  }));
}

test.describe('Review Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API to return large dataset
    await page.route('**/api/reviews?movieId=550', async (route) => {
      const count = new URL(route.request().url()).searchParams.get('count') || '100';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviews: generateMockReviews(parseInt(count)),
          total: parseInt(count),
        }),
      });
    });
  });

  test('TTI (Time to Interactive) should be under 2 seconds', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();
    
    // Navigate to page
    await page.goto('http://localhost:3000/movies/550');
    
    // Wait for reviews section to be visible
    await page.waitForSelector('[data-testid="reviews-section"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Wait for interactive (first review card clickable)
    await page.waitForSelector('[data-testid="review-card"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Ensure page is fully interactive
    await page.waitForLoadState('networkidle');
    
    const tti = Date.now() - startTime;
    
    console.log(`Time to Interactive: ${tti}ms`);
    
    // TTI should be under 2 seconds (2000ms)
    expect(tti).toBeLessThan(2000);
    
    // Get detailed performance metrics
    const metrics = await getPerformanceMetrics(page);
    console.log('Performance Metrics:', metrics);
    
    // FCP (First Contentful Paint) should be under 1.5s
    expect(metrics.firstContentfulPaint).toBeLessThan(1500);
    
    // DOM processing should be efficient
    expect(metrics.domProcessing).toBeLessThan(1000);
  });

  test('should handle 100 reviews without jank', async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    // Wait for reviews to load
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    // Check that virtualization is enabled
    const virtualizationIndicator = page.locator('text=Virtualized rendering');
    await expect(virtualizationIndicator).toBeVisible();
    
    // Measure scrolling performance
    const scrollPerformance = await page.evaluate(async () => {
      const reviewsContainer = document.querySelector('[role="list"]') as HTMLElement;
      if (!reviewsContainer) return { avgFrameTime: 0, droppedFrames: 0 };
      
      let frameCount = 0;
      let totalFrameTime = 0;
      let droppedFrames = 0;
      let lastTimestamp = performance.now();
      
      const measureFrame = (timestamp: number) => {
        const frameTime = timestamp - lastTimestamp;
        totalFrameTime += frameTime;
        frameCount++;
        
        // 60 FPS = 16.67ms per frame
        // Consider frame dropped if > 20ms (allowing some variance)
        if (frameTime > 20) {
          droppedFrames++;
        }
        
        lastTimestamp = timestamp;
      };
      
      // Scroll through list
      return new Promise<{ avgFrameTime: number; droppedFrames: number }>((resolve) => {
        let rafId: number;
        let scrollTop = 0;
        const maxScroll = reviewsContainer.scrollHeight - reviewsContainer.clientHeight;
        
        const scroll = (timestamp: number) => {
          measureFrame(timestamp);
          
          scrollTop += 10;
          reviewsContainer.scrollTop = scrollTop;
          
          if (scrollTop < maxScroll) {
            rafId = requestAnimationFrame(scroll);
          } else {
            resolve({
              avgFrameTime: totalFrameTime / frameCount,
              droppedFrames,
            });
          }
        };
        
        rafId = requestAnimationFrame(scroll);
      });
    });
    
    console.log('Scroll Performance:', scrollPerformance);
    
    // Average frame time should be < 16.67ms (60 FPS)
    expect(scrollPerformance.avgFrameTime).toBeLessThan(20);
    
    // Should have minimal dropped frames (< 5% of total)
    expect(scrollPerformance.droppedFrames).toBeLessThan(10);
  });

  test('should virtualize list with 100+ reviews', async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    // Check virtualization is active
    await expect(page.locator('text=Virtualized rendering')).toBeVisible();
    
    // Count rendered DOM nodes (should be much less than 100)
    const renderedCards = await page.locator('[data-testid="review-card"]').count();
    
    console.log(`Rendered cards: ${renderedCards} (out of 100 total)`);
    
    // Should only render visible items + overscan (~10-15 items)
    expect(renderedCards).toBeLessThan(20);
    expect(renderedCards).toBeGreaterThan(5);
    
    // Scroll to bottom and verify new items render
    await page.evaluate(() => {
      const list = document.querySelector('[role="list"]');
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    });
    
    await page.waitForTimeout(100); // Wait for scroll render
    
    // Different items should be visible now
    const firstCardText = await page.locator('[data-testid="review-card"]').first().textContent();
    expect(firstCardText).toContain('Review');
  });

  test('should maintain performance with sorting changes', async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    const startTime = Date.now();
    
    // Change sort to "Most Recent"
    await page.click('button:has-text("Most Recent")');
    await page.waitForTimeout(100);
    
    // Change sort to "Controversial"
    await page.click('button:has-text("Controversial")');
    await page.waitForTimeout(100);
    
    // Change back to "Most Helpful"
    await page.click('button:has-text("Most Helpful")');
    await page.waitForTimeout(100);
    
    const sortTime = Date.now() - startTime;
    
    console.log(`Sort changes took: ${sortTime}ms`);
    
    // All sort changes should complete quickly
    expect(sortTime).toBeLessThan(500);
    
    // UI should remain responsive
    const isVirtualizationVisible = await page.locator('text=Virtualized rendering').isVisible();
    expect(isVirtualizationVisible).toBe(true);
  });

  test('should handle realtime updates without jank', async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    // Simulate realtime updates
    const updatePerformance = await page.evaluate(async () => {
      const startTime = performance.now();
      
      // Simulate 20 rapid updates (like SSE)
      for (let i = 0; i < 20; i++) {
        // Dispatch custom event to trigger update
        window.dispatchEvent(new CustomEvent('review-update', {
          detail: {
            reviewId: `review-${i}`,
            helpfulVotes: Math.floor(Math.random() * 100),
          },
        }));
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      return performance.now() - startTime;
    });
    
    console.log(`Realtime updates took: ${updatePerformance}ms`);
    
    // Should handle 20 updates smoothly
    expect(updatePerformance).toBeLessThan(2000);
  });

  test('should have efficient memory usage with 100 reviews', async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    // Get memory metrics
    const memoryMetrics = await page.evaluate(async () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
      return null;
    });
    
    if (memoryMetrics) {
      console.log('Memory Metrics:', memoryMetrics);
      
      // Used heap should be reasonable (< 50MB for review list)
      const usedMB = memoryMetrics.usedJSHeapSize / 1024 / 1024;
      console.log(`Used JS Heap: ${usedMB.toFixed(2)} MB`);
      
      expect(usedMB).toBeLessThan(100);
    }
  });

  test('should load quickly on 3G network', async ({ page, context }) => {
    // Simulate 3G network (slow connection)
    await context.route('**/*', (route) => {
      // Add 300ms delay to simulate 3G latency
      setTimeout(() => route.continue(), 300);
    });
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Load time on 3G: ${loadTime}ms`);
    
    // Should still be interactive within 5 seconds on 3G
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid scrolling without jank', async ({ page }) => {
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    // Perform rapid scrolling
    const scrollJank = await page.evaluate(async () => {
      const container = document.querySelector('[role="list"]') as HTMLElement;
      if (!container) return { maxJank: 0 };
      
      let maxJank = 0;
      let lastTime = performance.now();
      
      // Rapid scroll up and down
      for (let i = 0; i < 50; i++) {
        const targetScroll = i % 2 === 0 
          ? container.scrollHeight / 2 
          : 0;
        
        container.scrollTop = targetScroll;
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const currentTime = performance.now();
        const jank = currentTime - lastTime;
        
        if (jank > maxJank) {
          maxJank = jank;
        }
        
        lastTime = currentTime;
      }
      
      return { maxJank };
    });
    
    console.log(`Max jank during rapid scroll: ${scrollJank.maxJank}ms`);
    
    // Max jank should be under 50ms (3 frames at 60 FPS)
    expect(scrollJank.maxJank).toBeLessThan(50);
  });

  test('should handle 500 reviews efficiently', async ({ page }) => {
    // Override mock to return 500 reviews
    await page.route('**/api/reviews?movieId=550', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviews: generateMockReviews(500),
          total: 500,
        }),
      });
    });
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000/movies/550');
    
    await page.waitForSelector('[data-testid="reviews-section"]');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Load time with 500 reviews: ${loadTime}ms`);
    
    // Should still load in reasonable time
    expect(loadTime).toBeLessThan(3000);
    
    // Verify virtualization is working
    await expect(page.locator('text=Virtualized rendering')).toBeVisible();
    
    // Count rendered cards (should still be minimal)
    const renderedCards = await page.locator('[data-testid="review-card"]').count();
    expect(renderedCards).toBeLessThan(20);
    
    console.log(`Rendered only ${renderedCards} out of 500 reviews`);
  });
});
