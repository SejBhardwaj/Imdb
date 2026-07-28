/**
 * Content Security Policy Configuration
 * 
 * Only allows trusted sources for security
 */

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for Next.js dev
    "'unsafe-inline'", // Required for Next.js
    'https://www.youtube.com',
    'https://www.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components, Tailwind
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://image.tmdb.org',
    'https://img.youtube.com',
    'https://i.ytimg.com',
  ],
  'font-src': [
    "'self'",
    'data:',
  ],
  'connect-src': [
    "'self'",
    'https://api.themoviedb.org',
    'https://www.google-analytics.com',
  ],
  'media-src': [
    "'self'",
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
  ],
  'frame-src': [
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

/**
 * Generate CSP header string
 */
export function generateCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * CSP for development (more permissive)
 */
export function generateDevCSP(): string {
  const devDirectives = {
    ...CSP_DIRECTIVES,
    'script-src': [
      "'self'",
      "'unsafe-eval'",
      "'unsafe-inline'",
      'https://www.youtube.com',
    ],
  };

  return Object.entries(devDirectives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}
