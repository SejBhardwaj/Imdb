/**
 * Profanity Filter
 * 
 * Content moderation for review submissions
 * Can be extended with external moderation APIs
 */

// Common profanity patterns (expandable)
const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/gi,
  /\bs+h+i+t+/gi,
  /\ba+s+s+h+o+l+e+/gi,
  /\bb+i+t+c+h+/gi,
  /\bd+a+m+n+/gi,
  /\bh+e+l+l+/gi,
  /\bc+r+a+p+/gi,
  /\bp+i+s+s+/gi,
];

// Replacement character
const REPLACEMENT = '*****';

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  filteredText: string;
  detectedWords: string[];
  severity: 'none' | 'mild' | 'moderate' | 'severe';
}

/**
 * Check text for profanity and return filtered version
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  let filteredText = text;
  const detectedWords: string[] = [];

  for (const pattern of PROFANITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        if (!detectedWords.includes(match.toLowerCase())) {
          detectedWords.push(match.toLowerCase());
        }
      });
      filteredText = filteredText.replace(pattern, REPLACEMENT);
    }
  }

  const hasProfanity = detectedWords.length > 0;
  const severity = getSeverity(detectedWords.length);

  return {
    hasProfanity,
    filteredText,
    detectedWords,
    severity,
  };
}

/**
 * Check if text contains profanity (boolean only)
 */
export function hasProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Filter profanity from text
 */
export function filterProfanity(text: string): string {
  let filtered = text;
  for (const pattern of PROFANITY_PATTERNS) {
    filtered = filtered.replace(pattern, REPLACEMENT);
  }
  return filtered;
}

/**
 * Get severity level based on detected count
 */
function getSeverity(count: number): 'none' | 'mild' | 'moderate' | 'severe' {
  if (count === 0) return 'none';
  if (count === 1) return 'mild';
  if (count <= 3) return 'moderate';
  return 'severe';
}

/**
 * Advanced moderation (placeholder for external API)
 * 
 * In production, integrate with:
 * - OpenAI Moderation API
 * - Azure Content Moderator
 * - Google Perspective API
 * - AWS Comprehend
 */
export async function moderateContent(text: string): Promise<{
  safe: boolean;
  categories: string[];
  confidence: number;
}> {
  // TODO: Integrate external moderation service
  // For now, use local profanity filter
  const result = checkProfanity(text);

  return {
    safe: !result.hasProfanity,
    categories: result.hasProfanity ? ['profanity'] : [],
    confidence: result.hasProfanity ? 0.9 : 1.0,
  };
}

/**
 * Check if content should be auto-rejected
 */
export function shouldAutoReject(text: string): boolean {
  const result = checkProfanity(text);
  return result.severity === 'severe';
}

/**
 * Check if content should be auto-flagged for manual review
 */
export function shouldAutoFlag(text: string): boolean {
  const result = checkProfanity(text);
  return result.severity === 'moderate';
}
