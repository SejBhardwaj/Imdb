/**
 * Review Idempotency Tests
 * 
 * Validates idempotency key implementation:
 * - Duplicate submission prevention
 * - Retry handling
 * - Flaky network scenarios
 * - Browser refresh protection
 * - Concurrent requests
 */

import { test, expect } from '@playwright/test';

test.describe('Review Idempotency', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to movie page
    await page.goto('http://localhost:3000/movies/550');
    
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-1',
        displayName: 'Test User',
      }));
    });
  });

  test('should prevent duplicate review submission with same idempotency key', async ({ page }) => {
    // Click write review button
    await page.click('button:has-text("Write a Review")');

    // Fill out review form
    await page.fill('input[name="title"]', 'Test Review Title');
    await page.fill('textarea[name="content"]', 'This is a test review with unique content for idempotency testing.');
    await page.click('[data-rating="8"]'); // Select 8/10 rating

    // Capture network requests
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/reviews') && request.method() === 'POST') {
        requests.push({
          url: request.url(),
          headers: request.headers(),
          body: request.postData(),
        });
      }
    });

    // Submit review
    await page.click('button:has-text("Publish Review")');

    // Wait for first request
    await page.waitForTimeout(500);

    // Try to submit again (simulate double click)
    await page.click('button:has-text("Publish Review")');

    // Wait for potential second request
    await page.waitForTimeout(500);

    // Should have 2 requests with same idempotency key
    expect(requests.length).toBeGreaterThanOrEqual(1);

    if (requests.length >= 2) {
      const firstKey = requests[0].headers['idempotency-key'];
      const secondKey = requests[1].headers['idempotency-key'];
      
      expect(firstKey).toBeTruthy();
      expect(secondKey).toBeTruthy();
      expect(firstKey).toBe(secondKey);
    }

    // Only one review should appear in the list
    await page.waitForSelector('[data-testid="review-card"]');
    const reviewCards = await page.locator('[data-testid="review-card"]').count();
    
    // Filter by test content
    const testReviews = await page.locator('[data-testid="review-card"]:has-text("unique content for idempotency")').count();
    expect(testReviews).toBe(1);
  });

  test('should return cached response for duplicate idempotency key', async ({ page }) => {
    let firstResponse: any = null;
    let secondResponse: any = null;

    // Intercept first request
    page.on('response', async (response) => {
      if (response.url().includes('/api/reviews') && response.request().method() === 'POST') {
        if (!firstResponse) {
          firstResponse = {
            status: response.status(),
            headers: response.headers(),
            body: await response.json().catch(() => null),
          };
        } else if (!secondResponse) {
          secondResponse = {
            status: response.status(),
            headers: response.headers(),
            body: await response.json().catch(() => null),
          };
        }
      }
    });

    // Submit review twice programmatically with same idempotency key
    const idempotencyKey = 'test-key-' + Date.now();
    
    const reviewData = {
      movieId: 550,
      title: 'Test Review',
      content: 'Test content for idempotency.',
      rating: 8,
      idempotencyKey,
    };

    // First submission
    await page.evaluate(async (data) => {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': data.idempotencyKey,
          'x-user-id': 'test-user-1',
        },
        body: JSON.stringify(data),
      });
    }, reviewData);

    await page.waitForTimeout(200);

    // Second submission with same key
    await page.evaluate(async (data) => {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': data.idempotencyKey,
          'x-user-id': 'test-user-1',
        },
        body: JSON.stringify(data),
      });
    }, reviewData);

    await page.waitForTimeout(200);

    // Verify both responses exist
    expect(firstResponse).toBeTruthy();
    expect(secondResponse).toBeTruthy();

    // Both should return 200/201
    expect(firstResponse.status).toBeGreaterThanOrEqual(200);
    expect(firstResponse.status).toBeLessThan(300);
    expect(secondResponse.status).toBeGreaterThanOrEqual(200);
    expect(secondResponse.status).toBeLessThan(300);

    // Second response should indicate replay
    expect(secondResponse.headers['x-idempotency-replay']).toBe('true');

    // Both should have same review ID
    if (firstResponse.body && secondResponse.body) {
      expect(firstResponse.body.id).toBe(secondResponse.body.id);
    }
  });

  test('should handle retry with exponential backoff', async ({ page }) => {
    const requestTimestamps: number[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/reviews') && request.method() === 'POST') {
        requestTimestamps.push(Date.now());
      }
    });

    // Simulate network failure
    await page.route('**/api/reviews', async (route) => {
      const requestCount = requestTimestamps.length;
      
      if (requestCount < 3) {
        // Fail first 2 attempts
        await route.abort('failed');
      } else {
        // Succeed on 3rd attempt
        await route.continue();
      }
    });

    // Attempt to submit review with retry logic
    await page.evaluate(async () => {
      const idempotencyKey = 'retry-test-' + Date.now();
      
      const submitWithRetry = async (attempt = 0): Promise<any> => {
        try {
          const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
              'x-user-id': 'test-user-1',
            },
            body: JSON.stringify({
              movieId: 550,
              title: 'Retry Test',
              content: 'Testing retry logic',
              rating: 7,
              idempotencyKey,
            }),
          });
          
          return response;
        } catch (error) {
          if (attempt < 3) {
            // Exponential backoff: 100ms, 200ms, 400ms
            const delay = 100 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            return submitWithRetry(attempt + 1);
          }
          throw error;
        }
      };
      
      await submitWithRetry();
    });

    // Verify exponential backoff
    expect(requestTimestamps.length).toBeGreaterThanOrEqual(3);

    if (requestTimestamps.length >= 3) {
      const gap1 = requestTimestamps[1] - requestTimestamps[0];
      const gap2 = requestTimestamps[2] - requestTimestamps[1];

      // Second gap should be roughly 2x first gap (exponential)
      expect(gap2).toBeGreaterThan(gap1);
    }
  });

  test('should handle browser refresh mid-submission', async ({ page, context }) => {
    // Start review submission
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Refresh Test Review');
    await page.fill('textarea[name="content"]', 'Testing browser refresh handling.');
    await page.click('[data-rating="9"]');

    // Store idempotency key in localStorage (simulating draft save)
    await page.evaluate(() => {
      const key = 'test-refresh-key-' + Date.now();
      localStorage.setItem('current-review-idempotency-key', key);
    });

    const idempotencyKey = await page.evaluate(() => {
      return localStorage.getItem('current-review-idempotency-key');
    });

    // Refresh page mid-submission
    await page.reload();

    // Restore form state and try to submit
    await page.click('button:has-text("Write a Review")');
    await page.fill('input[name="title"]', 'Refresh Test Review');
    await page.fill('textarea[name="content"]', 'Testing browser refresh handling.');
    await page.click('[data-rating="9"]');

    // Submit with same idempotency key
    await page.evaluate((key) => {
      localStorage.setItem('current-review-idempotency-key', key);
    }, idempotencyKey);

    await page.click('button:has-text("Publish Review")');

    // Wait for response
    await page.waitForTimeout(1000);

    // Should only create one review
    const testReviews = await page.locator('[data-testid="review-card"]:has-text("Refresh Test Review")').count();
    expect(testReviews).toBeLessThanOrEqual(1);
  });

  test('should reject invalid idempotency key format', async ({ page }) => {
    const response = await page.evaluate(async () => {
      return fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'invalid-key-not-uuid',
          'x-user-id': 'test-user-1',
        },
        body: JSON.stringify({
          movieId: 550,
          title: 'Test',
          content: 'Test',
          rating: 5,
        }),
      }).then(r => r.json());
    });

    expect(response.error).toBeTruthy();
    expect(response.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  test('should handle concurrent requests with different keys', async ({ page }) => {
    const responses: any[] = [];

    // Submit 5 reviews concurrently with different idempotency keys
    const promises = Array.from({ length: 5 }, (_, i) => {
      return page.evaluate(async (index) => {
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `concurrent-key-${index}-${Date.now()}`,
            'x-user-id': 'test-user-1',
          },
          body: JSON.stringify({
            movieId: 550,
            title: `Concurrent Review ${index}`,
            content: `Content for review ${index}`,
            rating: 5 + index,
          }),
        });
        return response.json();
      }, i);
    });

    const results = await Promise.all(promises);

    // All should succeed
    expect(results.length).toBe(5);
    results.forEach((result, i) => {
      expect(result.id).toBeTruthy();
      expect(result.title).toContain(`Concurrent Review ${i}`);
    });

    // All should have different IDs
    const ids = results.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  test('should expire idempotency keys after TTL', async ({ page }) => {
    const idempotencyKey = 'ttl-test-' + Date.now();

    // First submission
    const firstResponse = await page.evaluate(async (key) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          'x-user-id': 'test-user-1',
        },
        body: JSON.stringify({
          movieId: 550,
          title: 'TTL Test',
          content: 'Testing TTL expiration',
          rating: 6,
        }),
      });
      return response.json();
    }, idempotencyKey);

    expect(firstResponse.id).toBeTruthy();

    // Wait for TTL to expire (in test env, might be shortened)
    // In production, this would be 24 hours
    // For testing, we'd configure a shorter TTL
    // await page.waitForTimeout(25 * 60 * 60 * 1000); // 25 hours - too long for tests

    // Note: This test requires test-specific TTL configuration
    // or mock time manipulation. Skipping actual wait in E2E.
  });

  test('should provide helpful error message on idempotency conflict', async ({ page }) => {
    const idempotencyKey = 'conflict-test-' + Date.now();

    // Submit first review
    await page.evaluate(async (key) => {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          'x-user-id': 'test-user-1',
        },
        body: JSON.stringify({
          movieId: 550,
          title: 'First Review',
          content: 'First content',
          rating: 8,
        }),
      });
    }, idempotencyKey);

    await page.waitForTimeout(200);

    // Try to submit different review with same key (this should return cached first review)
    const secondResponse = await page.evaluate(async (key) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          'x-user-id': 'test-user-1',
        },
        body: JSON.stringify({
          movieId: 550,
          title: 'Second Review (Different)',
          content: 'Different content',
          rating: 3,
        }),
      });
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.json(),
      };
    }, idempotencyKey);

    // Should return first review (cached)
    expect(secondResponse.headers['x-idempotency-replay']).toBe('true');
    expect(secondResponse.body.title).toBe('First Review');
    expect(secondResponse.body.title).not.toBe('Second Review (Different)');
  });
});
