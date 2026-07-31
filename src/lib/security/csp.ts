/**
 * Content Security Policy (CSP) with Nonce Support
 * Prevents XSS attacks while allowing inline theme scripts
 */

import { randomBytes } from 'crypto';

/**
 * Generate cryptographic nonce for CSP
 */
export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * Build CSP header with nonce
 */
export function buildCSP(nonce: string): string {
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      'https:',
      ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS libraries
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://image.tmdb.org',
    ],
    'connect-src': [
      "'self'",
      'https://api.themoviedb.org',
      ...(process.env.NODE_ENV === 'development' ? ['ws:', 'wss:'] : []),
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * CSP Middleware for Next.js
 */
export function applyCSP(response: Response, nonce: string): Response {
  const csp = buildCSP(nonce);
  
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Store nonce for access in components
  response.headers.set('X-Theme-Nonce', nonce);
  
  return response;
}

/**
 * Extract nonce from headers
 */
export function extractNonce(headers: Headers): string | null {
  return headers.get('X-Theme-Nonce');
}

/**
 * Validate nonce format
 */
export function isValidNonce(nonce: string): boolean {
  return /^[A-Za-z0-9+/]{22}==$/.test(nonce);
}
