/**
 * MovieDetails Skeleton
 * 
 * Loading skeleton for movie details page.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export function MovieDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Section Skeleton */}
      <div className="space-y-6">
        {/* Backdrop */}
        <Skeleton className="h-[50vh] w-full rounded-lg" />

        {/* Content */}
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Poster */}
          <Skeleton className="h-[300px] w-[200px] rounded-lg" />

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Title */}
            <Skeleton className="h-10 w-3/4" />

            {/* Tagline */}
            <Skeleton className="h-6 w-1/2" />

            {/* Metadata */}
            <div className="flex gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>

            {/* Genres */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>

            {/* Overview */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid skeleton */}
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Movie Cast Skeleton
 */
export function MovieCastSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Movie Video Skeleton
 */
export function MovieVideoSkeleton() {
  return (
    <div className="space-y-4">
      {/* Video player skeleton */}
      <Skeleton className="aspect-video w-full rounded-lg" />

      {/* Video list skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
