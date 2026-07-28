/**
 * Cursor Pagination Types
 * 
 * True cursor-based pagination implementation for infinite scroll.
 * Unlike offset pagination (page 1, 2, 3...), cursor pagination uses
 * opaque tokens that point to specific positions in the result set.
 * 
 * Benefits:
 * - No duplicate/missing items when data changes
 * - Better performance (no offset counting)
 * - Works with real-time data
 * - Consistent results
 */

/**
 * Cursor encoding/decoding utilities
 */
export class CursorEncoder {
  /**
   * Encode cursor data to base64 string
   */
  static encode(data: Record<string, any>): string {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decode base64 cursor string to data
   */
  static decode(cursor: string): Record<string, any> {
    try {
      const json = Buffer.from(cursor, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (error) {
      throw new Error(`Invalid cursor: ${cursor}`);
    }
  }

  /**
   * Create cursor from item (for ID-based pagination)
   */
  static fromItem(item: { id: number | string; [key: string]: any }): string {
    return this.encode({
      id: item.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Create cursor with offset fallback (for APIs that need it)
   */
  static fromOffset(offset: number): string {
    return this.encode({
      offset,
      type: 'offset',
    });
  }

  /**
   * Check if cursor is valid
   */
  static isValid(cursor: string): boolean {
    try {
      this.decode(cursor);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Cursor pagination request
 */
export interface CursorPaginationRequest {
  /** Cursor pointing to where to start */
  cursor?: string;
  /** Number of items to fetch */
  limit: number;
  /** Sort direction */
  direction?: 'forward' | 'backward';
}

/**
 * Cursor pagination metadata
 */
export interface CursorPageInfo {
  /** Cursor for next page */
  nextCursor: string | null;
  /** Cursor for previous page */
  previousCursor: string | null;
  /** Whether there are more items */
  hasNextPage: boolean;
  /** Whether there are previous items */
  hasPreviousPage: boolean;
  /** Total count (optional, expensive to compute) */
  totalCount?: number;
  /** Start cursor of current page */
  startCursor: string | null;
  /** End cursor of current page */
  endCursor: string | null;
}

/**
 * Cursor-based paginated response
 */
export interface CursorPaginatedResponse<T> {
  /** Items in this page */
  results: T[];
  /** Pagination metadata */
  pageInfo: CursorPageInfo;
}

/**
 * Cursor pagination helper
 */
export class CursorPaginator<T extends { id: number | string }> {
  /**
   * Create paginated response from items
   */
  static paginate<T extends { id: number | string }>(
    items: T[],
    request: CursorPaginationRequest,
    totalAvailable?: number
  ): CursorPaginatedResponse<T> {
    const { limit } = request;
    
    // Take one extra to check if there's more
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    const startCursor = pageItems.length > 0 
      ? CursorEncoder.fromItem(pageItems[0]) 
      : null;
    
    const endCursor = pageItems.length > 0 
      ? CursorEncoder.fromItem(pageItems[pageItems.length - 1]) 
      : null;

    const nextCursor = hasMore ? endCursor : null;

    return {
      results: pageItems,
      pageInfo: {
        nextCursor,
        previousCursor: request.cursor || null,
        hasNextPage: hasMore,
        hasPreviousPage: !!request.cursor,
        totalCount: totalAvailable,
        startCursor,
        endCursor,
      },
    };
  }

  /**
   * Merge multiple pages for infinite scroll
   */
  static mergePages<T extends { id: number | string }>(
    pages: CursorPaginatedResponse<T>[]
  ): T[] {
    const seen = new Set<number | string>();
    const merged: T[] = [];

    for (const page of pages) {
      for (const item of page.results) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }

    return merged;
  }

  /**
   * Extract cursor from last item in page
   */
  static getNextCursor<T extends { id: number | string }>(
    page: CursorPaginatedResponse<T>
  ): string | undefined {
    return page.pageInfo.nextCursor || undefined;
  }
}
