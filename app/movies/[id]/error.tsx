'use client';

/**
 * Error boundary for Movie Details page
 * Provides graceful error handling
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Movie page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🎬</div>
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="text-gray-400">
          We couldn't load this movie. This might be a temporary issue.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
          >
            Go Back
          </Button>
        </div>

        {error.message && (
          <details className="text-left text-sm text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">
              Technical details
            </summary>
            <pre className="mt-2 p-4 bg-white/5 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
