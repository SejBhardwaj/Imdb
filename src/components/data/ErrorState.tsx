/**
 * Error State Component
 */

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <section className="py-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-error))]/20 flex items-center justify-center">
            <AlertCircle size={20} className="text-[rgb(var(--color-error))]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[rgb(var(--color-foreground))]">
              {title}
            </h2>
            <p className="text-sm text-[rgb(var(--color-foreground-muted))]">
              Failed to load content
            </p>
          </div>
        </div>

        {/* Error Card */}
        <div className="rounded-xl bg-[rgb(var(--color-error))]/10 border border-[rgb(var(--color-error))]/20 p-8 text-center">
          <AlertCircle size={48} className="text-[rgb(var(--color-error))] mx-auto mb-4" />
          <p className="text-[rgb(var(--color-foreground))] mb-4">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[rgb(var(--color-primary))] text-white rounded-lg hover:bg-[rgb(var(--color-primary-hover))] transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
