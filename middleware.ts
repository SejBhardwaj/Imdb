/**
 * Next.js Middleware
 * 
 * Adds security headers including CSP
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCSP, generateDevCSP } from '@/lib/utils/csp';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy
  const csp = process.env.NODE_ENV === 'production' 
    ? generateCSP() 
    : generateDevCSP();
  
  response.headers.set('Content-Security-Policy', csp);

  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Cache control for static assets
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache control for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
