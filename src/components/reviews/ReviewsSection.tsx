/**
 * ReviewsSection - Main container component
 * 
 * Integrates all review functionality:
 * - Review list with sorting
 * - Review form (create/edit)
 * - Revision history modal
 * - Flag modal
 * - Complete review system
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';
import ReviewRevisionHistory from './ReviewRevisionHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Review } from '@/types/review';

interface ReviewsSectionProps {
  movieId: number;
  user?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
}

export default function ReviewsSection({ movieId, user }: ReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [historyReviewId, setHistoryReviewId] = useState<string | null>(null);
  const [flagReviewId, setFlagReviewId] = useState<string | null>(null);

  const handleWriteReview = () => {
    setEditingReview(null);
    setShowForm(true);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReview(null);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingReview(null);
  };

  const handleViewHistory = (reviewId: string) => {
    setHistoryReviewId(reviewId);
  };

  const handleFlagReview = (reviewId: string) => {
    setFlagReviewId(reviewId);
  };

  return (
    <div className="space-y-8">
      {/* Review Form Dialog */}
      <AnimatePresence>
        {showForm && user && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-3xl bg-[#1a1a1a] border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingReview ? 'Edit Review' : 'Write a Review'}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseForm}
                  className="absolute right-4 top-4 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </DialogHeader>
              <ReviewForm
                movieId={movieId}
                user={user}
                onSuccess={handleSuccess}
                onCancel={handleCloseForm}
              />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Revision History Modal */}
      <AnimatePresence>
        {historyReviewId && (
          <Dialog open={!!historyReviewId} onOpenChange={() => setHistoryReviewId(null)}>
            <DialogContent className="max-w-4xl bg-[#1a1a1a] border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Revision History</DialogTitle>
              </DialogHeader>
              <ReviewRevisionHistory reviewId={historyReviewId} />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Flag Review Modal */}
      <AnimatePresence>
        {flagReviewId && (
          <Dialog open={!!flagReviewId} onOpenChange={() => setFlagReviewId(null)}>
            <DialogContent className="max-w-lg bg-[#1a1a1a] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Report Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-400">
                  Please select a reason for reporting this review:
                </p>
                <div className="space-y-2">
                  {['Spam', 'Offensive', 'Inappropriate', 'Misleading'].map((reason) => (
                    <Button
                      key={reason}
                      variant="outline"
                      className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                      onClick={() => {
                        // TODO: Submit flag
                        console.log('Flag review:', flagReviewId, reason);
                        setFlagReviewId(null);
                      }}
                    >
                      {reason}
                    </Button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Review List */}
      <ReviewList
        movieId={movieId}
        currentUserId={user?.uid}
        onWriteReview={user ? handleWriteReview : undefined}
        onEditReview={handleEditReview}
        onViewHistory={handleViewHistory}
        onFlagReview={handleFlagReview}
      />
    </div>
  );
}
