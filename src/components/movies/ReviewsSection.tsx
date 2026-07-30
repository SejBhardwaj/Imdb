/**
 * Reviews Section - Server Component with Suspense
 * 
 * Streams reviews independently from main content
 */

import { tmdbApi } from '@/lib/tmdb/api';
import { User, Star } from 'lucide-react';
import Image from 'next/image';

interface ReviewsSectionProps {
  movieId: number;
}

export default async function ReviewsSection({ movieId }: ReviewsSectionProps) {
  let reviews;
  
  try {
    const response = await tmdbApi.movies.getReviews(movieId, 1);
    reviews = response.results;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Unable to load reviews at this time.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-red-500 hover:text-red-400"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No reviews yet. Be the first to review this movie!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.slice(0, 5).map((review: any) => (
        <article
          key={review.id}
          className="bg-white/5 rounded-lg p-6 space-y-4"
        >
          {/* Author */}
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10">
              {review.author_details?.avatar_path ? (
                <Image
                  src={
                    review.author_details.avatar_path.startsWith('/http')
                      ? review.author_details.avatar_path.substring(1)
                      : `https://image.tmdb.org/t/p/w45${review.author_details.avatar_path}`
                  }
                  alt={review.author}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold">{review.author}</p>
              {review.author_details?.rating && (
                <div className="flex items-center gap-1 text-sm text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{review.author_details.rating}/10</span>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="ml-auto text-sm text-gray-400">
              {new Date(review.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Review Content */}
          <div className="text-gray-300 leading-relaxed">
            <p className="line-clamp-6">{review.content}</p>
          </div>

          {/* Read More Link */}
          {review.content.length > 500 && (
            <button className="text-red-500 hover:text-red-400 text-sm font-semibold">
              Read Full Review →
            </button>
          )}
        </article>
      ))}

      {/* View All Reviews */}
      {reviews.length > 5 && (
        <div className="text-center">
          <button className="text-red-500 hover:text-red-400 font-semibold">
            View All Reviews ({reviews.length}) →
          </button>
        </div>
      )}
    </div>
  );
}
