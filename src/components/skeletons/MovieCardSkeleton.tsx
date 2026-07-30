/**
 * MovieCard Skeleton
 * 
 * Loading skeleton for movie cards.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function MovieCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Poster Skeleton */}
      <Skeleton className="aspect-[2/3] w-full" />

      {/* Content Skeleton */}
      <CardContent className="p-4 space-y-2">
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />

        {/* Metadata */}
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MovieCard Grid Skeleton
 */
export function MovieCardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
