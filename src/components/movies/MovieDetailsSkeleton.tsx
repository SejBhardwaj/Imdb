/**
 * Movie Details Loading Skeleton
 */

export default function MovieDetailsSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Skeleton */}
      <section className="relative w-full h-[90vh] min-h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 flex flex-col justify-end pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-end">
            {/* Left: Info Skeleton */}
            <div className="max-w-3xl space-y-4">
              <div className="h-16 bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="h-6 bg-gray-700 rounded animate-pulse w-1/2" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-24 bg-gray-700 rounded animate-pulse" />
              <div className="flex gap-3">
                <div className="h-12 w-40 bg-gray-700 rounded animate-pulse" />
                <div className="h-12 w-40 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>

            {/* Right: Poster Skeleton */}
            <div className="hidden lg:block w-80">
              <div className="w-full aspect-[2/3] bg-gray-700 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Cast Skeleton */}
      <section className="py-16 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="h-8 bg-gray-700 rounded animate-pulse w-32 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="w-full aspect-[2/3] bg-gray-700 rounded-lg animate-pulse mb-3" />
                <div className="h-4 bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
