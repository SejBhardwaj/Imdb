/**
 * ReviewList Component
 * 
 * Main review list with:
 * - Sorting (Helpful, Recent, Controversial)
 * - Realtime updates
 * - Framer Motion animations
 * - List virtualization for 100+ reviews (react-window)
 * - Loading states
 * - Empty states
 */

'use client';

import { useState, useRef, useEffect } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList } from 'react-window';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReviewCard from './ReviewCard';
import { useMovieReviews } from '@/hooks/useReviews';
import { useRealtimeReviews } from '@/hooks/useRealtimeReviews';
import { sortReviewsByScore } from '@/lib/utils/wilsonScore';
import type { Review, ReviewSortOption } from '@/types/review';

interface ReviewListProps {
  movieId: number;
  currentUserId?: string;
  onWriteReview?: () => void;
  onEditReview?: (review: Review) => void;
  onViewHistory?: (reviewId: string) => void;
  onFlagReview?: (reviewId: string) => void;
}

// Virtualization thresholds
const VIRTUALIZATION_THRESHOLD = 20; // Use virtualization if more than 20 reviews
const REVIEW_CARD_HEIGHT = 280; // Estimated height of each review card in pixels
const LIST_MAX_HEIGHT = 2000; // Max height of virtualized list

export default function ReviewList({
  movieId,
  currentUserId,
  onWriteReview,
  onEditReview,
  onViewHistory,
  onFlagReview,
}: ReviewListProps) {
  const [sortBy, setSortBy] = useState<ReviewSortOption>('helpful');
  const [listHeight, setListHeight] = useState(LIST_MAX_HEIGHT);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch reviews
  const { data: reviews = [], isLoading, error } = useMovieReviews(movieId);

  // Realtime updates
  const { isConnected, updateCount, bufferSize } = useRealtimeReviews({
    movieId,
    enabled: true,
  });

  // Calculate optimal list height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const availableHeight = viewportHeight - rect.top - 100; // 100px bottom padding
        setListHeight(Math.min(LIST_MAX_HEIGHT, Math.max(600, availableHeight)));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Sort reviews
  const sortedReviews = (() => {
    if (sortBy === 'helpful') {
      return sortReviewsByScore(reviews, 'helpful');
    } else if (sortBy === 'recent') {
      return [...reviews].sort(
        (a, b) => b.metadata.createdAt - a.metadata.createdAt
      );
    } else if (sortBy === 'controversial') {
      return sortReviewsByScore(reviews, 'controversial');
    }
    return reviews;
  })();

  // Determine if we should use virtualization
  const useVirtualization = sortedReviews.length > VIRTUALIZATION_THRESHOLD;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
        <p className="text-red-400">Failed to load reviews. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Reviews ({reviews.length})
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {isConnected && (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live updates • {updateCount} updates received
                {bufferSize > 0 && ` • ${bufferSize} buffered`}
              </span>
            )}
            {useVirtualization && (
              <span className="ml-2 text-xs text-blue-400">
                ⚡ Virtualized rendering
              </span>
            )}
          </p>
        </div>

        {currentUserId && onWriteReview && (
          <Button
            onClick={onWriteReview}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Write a Review
          </Button>
        )}
      </div>

      {/* Sort Tabs */}
      <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as ReviewSortOption)}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="helpful" className="data-[state=active]:bg-red-600">
            Most Helpful
          </TabsTrigger>
          <TabsTrigger value="recent" className="data-[state=active]:bg-red-600">
            Most Recent
          </TabsTrigger>
          <TabsTrigger value="controversial" className="data-[state=active]:bg-red-600">
            Controversial
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Review List */}
      {sortedReviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-lg p-12 text-center space-y-4"
        >
          <MessageSquare className="w-16 h-16 mx-auto text-gray-600" />
          <div>
            <h3 className="text-xl font-semibold text-white">No reviews yet</h3>
            <p className="text-gray-400 mt-2">
              Be the first to share your thoughts about this movie!
            </p>
          </div>
          {currentUserId && onWriteReview && (
            <Button
              onClick={onWriteReview}
              className="bg-red-600 hover:bg-red-700 text-white mt-4"
            >
              Write the First Review
            </Button>
          )}
        </motion.div>
      ) : useVirtualization ? (
        // Virtualized list for 100+ reviews
        <VirtualizedReviewList
          reviews={sortedReviews}
          currentUserId={currentUserId}
          listHeight={listHeight}
          onEdit={onEditReview}
          onViewHistory={onViewHistory}
          onFlag={onFlagReview}
        />
      ) : (
        // Regular list with animations for < 20 reviews
        <LayoutGroup>
          <motion.div layout className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sortedReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={currentUserId}
                  onEdit={onEditReview}
                  onViewHistory={onViewHistory}
                  onFlag={onFlagReview}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

      {/* Load More (pagination placeholder) */}
      {sortedReviews.length > 0 && sortedReviews.length >= 20 && !useVirtualization && (
        <div className="text-center pt-6">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * VirtualizedReviewList - Windowed list for 100+ reviews
 * 
 * Uses react-window for efficient rendering:
 * - Only renders visible items + overscan
 * - Maintains 60 FPS scrolling performance
 * - Reduces memory footprint for large lists
 */
interface VirtualizedReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  listHeight: number;
  onEdit?: (review: Review) => void;
  onViewHistory?: (reviewId: string) => void;
  onFlag?: (reviewId: string) => void;
}

function VirtualizedReviewList({
  reviews,
  currentUserId,
  listHeight,
  onEdit,
  onViewHistory,
  onFlag,
}: VirtualizedReviewListProps) {
  const listRef = useRef<any>(null);

  // Row renderer for virtualized list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const review = reviews[index];
    
    return (
      <div style={style} className="px-2 pb-4">
        <ReviewCard
          review={review}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onViewHistory={onViewHistory}
          onFlag={onFlag}
        />
      </div>
    );
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <FixedSizeList
        ref={listRef}
        height={listHeight}
        itemCount={reviews.length}
        itemSize={REVIEW_CARD_HEIGHT}
        width="100%"
        overscanCount={3} // Render 3 extra items above/below viewport
        className="scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {Row}
      </FixedSizeList>
      
      {/* Virtualization info footer */}
      <div className="bg-white/5 px-4 py-2 text-xs text-gray-400 text-center border-t border-white/10">
        Showing {reviews.length} reviews • Virtualized for optimal performance
      </div>
    </div>
  );
}
