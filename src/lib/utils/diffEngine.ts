/**
 * Diff Engine for Review Revisions
 * 
 * Stores only changes between revisions instead of full copies
 * Similar to Git's diff algorithm
 */

export interface DiffResult {
  type: 'addition' | 'deletion' | 'unchanged';
  value: string;
  position: number;
}

export interface ReviewDiff {
  titleDiff?: string;
  contentDiff?: string;
  ratingChange?: [number, number]; // [old, new]
}

/**
 * Generate simple diff between two texts
 * 
 * This is a simplified Myers diff algorithm
 * For production, consider using a library like 'diff' or 'fast-diff'
 */
export function generateTextDiff(oldText: string, newText: string): string {
  if (oldText === newText) {
    return ''; // No changes
  }

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const diff: string[] = [];

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine === newLine) {
      diff.push(`  ${newLine}`); // Unchanged
    } else if (oldLine && newLine) {
      diff.push(`- ${oldLine}`); // Deleted
      diff.push(`+ ${newLine}`); // Added
    } else if (oldLine) {
      diff.push(`- ${oldLine}`); // Deleted
    } else if (newLine) {
      diff.push(`+ ${newLine}`); // Added
    }
  }

  return diff.join('\n');
}

/**
 * Generate diff for review edit
 */
export function generateReviewDiff(
  oldReview: { title: string; content: string; rating: number },
  newReview: { title: string; content: string; rating: number }
): ReviewDiff {
  const diff: ReviewDiff = {};

  // Title diff
  if (oldReview.title !== newReview.title) {
    diff.titleDiff = generateTextDiff(oldReview.title, newReview.title);
  }

  // Content diff
  if (oldReview.content !== newReview.content) {
    diff.contentDiff = generateTextDiff(oldReview.content, newReview.content);
  }

  // Rating change
  if (oldReview.rating !== newReview.rating) {
    diff.ratingChange = [oldReview.rating, newReview.rating];
  }

  return diff;
}

/**
 * Apply diff to reconstruct text
 */
export function applyTextDiff(originalText: string, diff: string): string {
  if (!diff) {
    return originalText;
  }

  const lines = diff.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith('+ ')) {
      result.push(line.substring(2)); // Add new line
    } else if (line.startsWith('  ')) {
      result.push(line.substring(2)); // Keep unchanged
    }
    // Skip deleted lines (start with '- ')
  }

  return result.join('\n');
}

/**
 * Calculate edit distance (Levenshtein distance)
 */
export function calculateEditDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * Calculate similarity percentage
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const distance = calculateEditDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) {
    return 100;
  }

  return ((maxLength - distance) / maxLength) * 100;
}

/**
 * Check if edit is significant (>10% changed)
 */
export function isSignificantEdit(oldText: string, newText: string): boolean {
  const similarity = calculateSimilarity(oldText, newText);
  return similarity < 90; // More than 10% changed
}

/**
 * Get diff summary
 */
export function getDiffSummary(diff: ReviewDiff): string {
  const changes: string[] = [];

  if (diff.titleDiff) {
    changes.push('title');
  }

  if (diff.contentDiff) {
    changes.push('content');
  }

  if (diff.ratingChange) {
    changes.push(`rating (${diff.ratingChange[0]} → ${diff.ratingChange[1]})`);
  }

  return changes.length > 0 ? `Changed ${changes.join(', ')}` : 'No changes';
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text: string): number {
  const wordCount = countWords(text);
  const wordsPerMinute = 200; // Average reading speed
  return Math.ceil(wordCount / wordsPerMinute);
}
