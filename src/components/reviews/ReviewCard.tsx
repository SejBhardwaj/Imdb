/**
 * ReviewCard Component
 * 
 * Individual review display with:
 * - Vote buttons
 * - Edit/delete actions
 * - Revision history
 * - Flag for moderation
 * - Framer Motion animations
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Flag, Edit, Trash2, History, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useVoteReview, useUserVote } from '@/hooks/useReviewVote';
import { useDeleteReview } from '@/hooks/useReviews';
import type { Review } from '@/types/review';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onViewHistory?: (reviewId: string) => void;
  onFlag?: (reviewId: string) => void;
}

export default function ReviewCard({
  review,
  currentUserId,
  onEdit,
  onViewHistory,
  onFlag,
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const voteReview = useVoteReview();
  const deleteReview = useDeleteReview();
  const { data: userVote } = useUserVote(currentUserId || '', review.id);

  const isAuthor = currentUserId === review.userId;
  const hasVoted = userVote !== null;
  const isUpvoted = userVote === 'upvote';
  const isDownvoted = userVote === 'downvote';

  const handleVote = (voteType: 'upvote' | 'downvote') => {
    if (!currentUserId) return;

    // Toggle vote (clicking same vote removes it)
    const newVote = userVote === voteType ? null : voteType;

    voteReview.mutate({
      reviewId: review.id,
      userId: currentUserId,
      voteType: newVote,
    });
  };

  const handleDelete = () => {
    if (!confirm('Delete this review? You can undo within 5 seconds.')) return;
    deleteReview.mutate(review.id);
  };

  const contentPreview = review.content.substring(0, 300);
  const needsExpansion = review.content.length > 300;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white/5 rounded-lg p-6 space-y-4 hover:bg-white/10 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={review.author.photoURL} alt={review.author.displayName} />
            <AvatarFallback className="bg-red-600 text-white">
              {review.author.displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{review.author.displayName}</p>
              {isAuthor && (
                <Badge variant="secondary" className="text-xs">
                  You
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {formatDistanceToNow(review.metadata.createdAt, { addSuffix: true })}
              {review.metadata.editCount > 0 && ' • Edited'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rating */}
          <Badge className="bg-yellow-500 text-black font-bold">
            {review.rating}/10
          </Badge>

          {/* Actions Menu */}
          {currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  aria-label="Review actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                {isAuthor ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => onEdit?.(review)}
                      className="text-white hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Review
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewHistory?.(review.id)}
                      className="text-white hover:bg-white/10"
                    >
                      <History className="w-4 h-4 mr-2" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-400 hover:bg-white/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Review
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onFlag?.(review.id)}
                    className="text-yellow-400 hover:bg-white/10"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report Review
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white">{review.title}</h3>

      {/* Content */}
      <div className="text-gray-300 leading-relaxed">
        <p>
          {isExpanded ? review.content : contentPreview}
          {needsExpansion && !isExpanded && '...'}
        </p>
        {needsExpansion && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-red-500 hover:text-red-400 mt-2 text-sm font-semibold"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </button>
        )}
      </div>

      {/* Vote Buttons */}
      <div className="flex items-center gap-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('upvote')}
            disabled={!currentUserId || voteReview.isPending}
            className={`${
              isUpvoted
                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                : 'text-gray-400 hover:text-green-400 hover:bg-white/10'
            }`}
            aria-label="Upvote review"
            aria-pressed={isUpvoted}
          >
            <ThumbsUp className={`w-4 h-4 mr-1 ${isUpvoted ? 'fill-current' : ''}`} />
            {review.votes.upvotes}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('downvote')}
            disabled={!currentUserId || voteReview.isPending}
            className={`${
              isDownvoted
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'text-gray-400 hover:text-red-400 hover:bg-white/10'
            }`}
            aria-label="Downvote review"
            aria-pressed={isDownvoted}
          >
            <ThumbsDown className={`w-4 h-4 mr-1 ${isDownvoted ? 'fill-current' : ''}`} />
            {review.votes.downvotes}
          </Button>
        </div>

        {/* Helpful Score */}
        {review.votes.upvotes + review.votes.downvotes > 0 && (
          <p className="text-sm text-gray-400 ml-auto">
            {Math.round(review.votes.wilsonScore * 100)}% helpful
          </p>
        )}
      </div>

      {/* Moderation Flag */}
      {review.moderation.isFlagged && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-sm text-yellow-400">
          ⚠️ This review has been flagged and is under moderation review.
        </div>
      )}
    </motion.article>
  );
}
