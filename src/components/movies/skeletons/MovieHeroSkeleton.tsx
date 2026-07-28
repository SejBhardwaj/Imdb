/**
 * Movie Hero Loading Skeleton
 */

export default function MovieHeroSkeleton() {
  return (
    <div className="relative bg-white/5">
      <div className="container mx-auto px-6 py-24 md:py-32">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Skeleton */}
          <div className="flex-shrink-0 w-64 hidden md:block">
            <div className="aspect-[2/3] bg-white/10 rounded-lg animate-pulse" />
          </div>

          {/* Info Skeleton */}
          <div className="flex-1 space-y-6">
            {/* Title */}
            <div className="space-y-3">
              <div className="h-12 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-6 w-1/2 bg-white/10 rounded animate-pulse" />
            </div>

            {/* Meta */}
            <div className="flex gap-4">
              <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse" />
              <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse" />
            </div>

            {/* Genres */}
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-20 bg-white/10 rounded-full animate-pulse"
                />
              ))}
            </div>

            {/* Overview */}
            <div className="space-y-2">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <div className="h-12 w-40 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-12 w-32 bg-white/10 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
