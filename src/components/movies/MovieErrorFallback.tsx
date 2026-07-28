/**
 * Movie Error Fallback Component
 * 
 * Specialized error fallback for movie-related errors.
 */

'use client';

import { AlertCircle, Home, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MovieErrorFallbackProps {
  error?: Error | null;
  reset?: () => void;
  type?: 'not-found' | 'load-error' | 'network-error' | 'rate-limit' | 'generic';
}

export function MovieErrorFallback({ error, reset, type = 'generic' }: MovieErrorFallbackProps) {
  const errorConfig = getErrorConfig(type, error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              {errorConfig.icon}
            </div>
            <div>
              <CardTitle>{errorConfig.title}</CardTitle>
              <CardDescription>{errorConfig.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggestions */}
          {errorConfig.suggestions.length > 0 && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">Try the following:</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {errorConfig.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-mono">{error.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {reset && (
              <Button onClick={reset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}

            <Button asChild variant="outline">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/movies">
                <Search className="mr-2 h-4 w-4" />
                Browse Movies
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Get error configuration based on error type
 */
function getErrorConfig(type: string, error?: Error | null) {
  const icon = <AlertCircle className="h-6 w-6 text-destructive" />;

  switch (type) {
    case 'not-found':
      return {
        icon,
        title: 'Movie Not Found',
        description: "The movie you're looking for doesn't exist or has been removed.",
        suggestions: [
          'Check if the movie ID is correct',
          'Search for the movie by title',
          'Browse popular movies',
        ],
      };
    case 'load-error':
      return {
        icon,
        title: 'Failed to Load Movie',
        description: "We couldn't load the movie details. This might be a temporary issue.",
        suggestions: [
          'Try refreshing the page',
          'Check your internet connection',
          'Wait a moment and try again',
        ],
      };
    case 'network-error':
      return {
        icon,
        title: 'Network Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists',
        ],
      };
    case 'rate-limit':
      return {
        icon,
        title: 'Too Many Requests',
        description: "You've made too many requests. Please wait a moment before trying again.",
        suggestions: [
          'Wait a few seconds before trying again',
          'Avoid refreshing the page repeatedly',
          'Try again later',
        ],
      };
    default:
      return {
        icon,
        title: 'Something Went Wrong',
        description: error?.message || 'An unexpected error occurred while loading the movie.',
        suggestions: [
          'Try refreshing the page',
          'Go back to the home page',
          'Contact support if the problem persists',
        ],
      };
  }
}

/**
 * Detect error type from error object
 */
export function detectErrorType(error: any): MovieErrorFallbackProps['type'] {
  if (!error) return 'generic';

  const message = error.message?.toLowerCase() || '';
  const statusCode = error.statusCode || error.status;

  if (statusCode === 404 || message.includes('not found')) {
    return 'not-found';
  }

  if (statusCode === 429 || message.includes('rate limit') || message.includes('too many')) {
    return 'rate-limit';
  }

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return 'network-error';
  }

  if (message.includes('load') || message.includes('timeout')) {
    return 'load-error';
  }

  return 'generic';
}
