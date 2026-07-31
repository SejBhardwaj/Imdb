/**
 * Movie Carousel Skeleton
 */

interface MovieCarouselSkeletonProps {
  title: string;
}

export function MovieCarouselSkeleton({ title }: MovieCarouselSkeletonProps) {
  return (
    <section className="py-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-surface))] animate-pulse" />
          <div>
            <div className="h-6 w-48 bg-[rgb(var(--color-surface))] rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[rgb(var(--color-surface))] rounded animate-pulse" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg bg-[rgb(var(--color-surface))] animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
