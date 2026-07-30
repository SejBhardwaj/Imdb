/**
 * EXAMPLE: How to integrate ReviewsSection into movie details page
 * 
 * This shows the complete integration with the movie details page
 */

'use client';

import { Suspense } from 'react';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import { ReviewsProvider } from '@/providers/ReviewsProvider';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook

interface MovieDetailsPageProps {
  params: {
    id: string;
  };
}

export default function MovieDetailsPageWithReviews({ params }: MovieDetailsPageProps) {
  const movieId = parseInt(params.id);
  
  // Get current user from your auth system
  const { user } = useAuth();

  return (
    <ReviewsProvider>
      <div className="container mx-auto px-6 py-12">
        {/* Your existing movie details content */}
        <div className="space-y-12">
          {/* Movie Hero, Trailer, Cast, etc. */}
          
          {/* Reviews Section */}
          <section id="reviews" className="scroll-mt-20">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
              </div>
            }>
              <ReviewsSection
                movieId={movieId}
                user={user ? {
                  uid: user.uid,
                  displayName: user.displayName || 'Anonymous',
                  photoURL: user.photoURL,
                } : undefined}
              />
            </Suspense>
          </section>
        </div>
      </div>
    </ReviewsProvider>
  );
}

/**
 * ALTERNATIVE: Server Component approach
 * 
 * If using React Server Components, you can fetch initial reviews on server
 */

// export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
//   const movieId = parseInt(params.id);
//   
//   // Fetch initial reviews on server
//   const initialReviews = await fetch(
//     `${process.env.NEXT_PUBLIC_API_URL}/api/reviews?movieId=${movieId}`,
//     { cache: 'no-store' }
//   ).then(r => r.json());
//
//   return (
//     <ReviewsProvider>
//       <ClientReviewsSection 
//         movieId={movieId} 
//         initialReviews={initialReviews}
//       />
//     </ReviewsProvider>
//   );
// }
