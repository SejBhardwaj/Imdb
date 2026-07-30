/**
 * Loading state for Movie Details page
 */

import MovieHeroSkeleton from '@/components/movies/skeletons/MovieHeroSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <MovieHeroSkeleton />
      
      {/* Trailer skeleton */}
      <section className="container mx-auto px-6 py-12">
        <div className="h-8 w-48 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="h-64 bg-white/5 rounded-lg animate-pulse" />
      </section>

      {/* Credits skeleton */}
      <section className="container mx-auto px-6 py-12">
        <div className="h-8 w-48 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-white/5 rounded-lg animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
