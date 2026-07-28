/**
 * ReviewRevisionHistory Component
 * 
 * Shows revision history with diff view
 */

'use client';

import { motion } from 'framer-motion';
import { Clock, Edit } from 'lucide-react';
import { useRevisionHistory } from '@/hooks/useReviews';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { getDiffSummary } from '@/lib/utils/diffEngine';

interface ReviewRevisionHistoryProps {
  reviewId: string;
}

export default function ReviewRevisionHistory({ reviewId }: ReviewRevisionHistoryProps) {
  const { data: revisions = [], isLoading } = useRevisionHistory(reviewId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No revision history available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {revisions.map((revision, index) => (
        <motion.div
          key={revision.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white/5 rounded-lg p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-white">Version {revision.version}</span>
              {index === 0 && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {formatDistanceToNow(revision.createdAt, { addSuffix: true })}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-400">Rating</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-black">{revision.rating}/10</Badge>
                {revision.diff?.ratingChange && (
                  <span className="text-xs text-gray-400">
                    (changed from {revision.diff.ratingChange[0]} to {revision.diff.ratingChange[1]})
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">Title</p>
              <p className="text-white">{revision.title}</p>
              {revision.diff?.titleDiff && (
                <details className="mt-1">
                  <summary className="text-xs text-blue-400 cursor-pointer">Show diff</summary>
                  <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-x-auto">
                    {revision.diff.titleDiff}
                  </pre>
                </details>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-400">Content</p>
              <p className="text-white line-clamp-3">{revision.content}</p>
              {revision.diff?.contentDiff && (
                <details className="mt-1">
                  <summary className="text-xs text-blue-400 cursor-pointer">Show diff</summary>
                  <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {revision.diff.contentDiff}
                  </pre>
                </details>
              )}
            </div>

            {revision.diff && (
              <p className="text-xs text-gray-500 italic">
                {getDiffSummary(revision.diff)}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
