/**
 * Wilson Score Confidence Interval
 * 
 * Statistical ranking algorithm used by Reddit, IMDb, and Amazon
 * Better than raw upvote percentage because it accounts for sample size
 * 
 * A review with 95% upvotes from 500 votes ranks higher than
 * a review with 100% upvotes from 1 vote
 */

export interface WilsonScoreOptions {
  upvotes: number;
  downvotes: number;
  confidence?: number; // Default 0.95 (95% confidence)
}

/**
 * Calculate Wilson Score Lower Bound
 * 
 * Formula from Edwin B. Wilson (1927)
 * https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
 */
export function calculateWilsonScore({
  upvotes,
  downvotes,
  confidence = 0.95,
}: WilsonScoreOptions): number {
  const n = upvotes + downvotes;

  // No votes = score 0
  if (n === 0) {
    return 0;
  }

  // Z-score for confidence level
  // 95% confidence = 1.96
  // 90% confidence = 1.645
  // 99% confidence = 2.576
  const z = getZScore(confidence);

  // Positive rating proportion
  const phat = upvotes / n;

  // Wilson score formula
  const numerator =
    phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);

  const denominator = 1 + (z * z) / n;

  const score = numerator / denominator;

  return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
}

/**
 * Get Z-score for confidence level
 */
function getZScore(confidence: number): number {
  // Standard z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.8: 1.282,
    0.85: 1.44,
    0.9: 1.645,
    0.95: 1.96,
    0.98: 2.326,
    0.99: 2.576,
  };

  return zScores[confidence] ?? 1.96; // Default to 95%
}

/**
 * Calculate controversial score
 * 
 * Reviews with balanced up/down votes rank higher
 * Used for "Controversial" sort option
 */
export function calculateControversialScore(upvotes: number, downvotes: number): number {
  const total = upvotes + downvotes;

  if (total === 0) {
    return 0;
  }

  // Perfect balance = highest score
  // Formula: (smaller_value / larger_value) * total_votes
  const balance = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes, 1);

  return balance * total;
}

/**
 * Batch calculate Wilson scores
 */
export function batchCalculateWilsonScores(
  reviews: Array<{ upvotes: number; downvotes: number }>,
  confidence = 0.95
): number[] {
  return reviews.map((review) =>
    calculateWilsonScore({
      upvotes: review.upvotes,
      downvotes: review.downvotes,
      confidence,
    })
  );
}

/**
 * Sort reviews by ranking algorithm
 */
export function sortReviewsByScore<T extends { votes: { upvotes: number; downvotes: number; wilsonScore?: number } }>(
  reviews: T[],
  sortBy: 'helpful' | 'controversial'
): T[] {
  if (sortBy === 'helpful') {
    return [...reviews].sort((a, b) => {
      const scoreA = a.votes.wilsonScore ?? calculateWilsonScore({
        upvotes: a.votes.upvotes,
        downvotes: a.votes.downvotes,
      });
      const scoreB = b.votes.wilsonScore ?? calculateWilsonScore({
        upvotes: b.votes.upvotes,
        downvotes: b.votes.downvotes,
      });
      return scoreB - scoreA; // Higher score first
    });
  } else {
    return [...reviews].sort((a, b) => {
      const scoreA = calculateControversialScore(a.votes.upvotes, a.votes.downvotes);
      const scoreB = calculateControversialScore(b.votes.upvotes, b.votes.downvotes);
      return scoreB - scoreA;
    });
  }
}

/**
 * Get review ranking tier
 */
export function getReviewTier(wilsonScore: number): 'top' | 'good' | 'average' | 'low' {
  if (wilsonScore >= 0.7) return 'top';
  if (wilsonScore >= 0.5) return 'good';
  if (wilsonScore >= 0.3) return 'average';
  return 'low';
}
