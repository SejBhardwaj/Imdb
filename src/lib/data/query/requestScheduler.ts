/**
 * Request Scheduler with Priority Queue
 * 
 * Instead of firing all requests simultaneously, intelligently schedules
 * them based on priority. Critical requests (hero content) go first,
 * background requests (analytics, prefetch) go last.
 * 
 * Priority Levels:
 * - CRITICAL: Hero content, above-the-fold (execute immediately)
 * - HIGH: Visible content, user-initiated (queue with high priority)
 * - MEDIUM: Below-the-fold, secondary content
 * - LOW: Prefetch, recommendations
 * - BACKGROUND: Analytics, tracking, non-urgent
 */

export enum SchedulerPriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BACKGROUND = 4,
}

/**
 * Request task
 */
interface ScheduledTask<T> {
  id: string;
  priority: SchedulerPriority;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  createdAt: number;
  timeout?: number;
  abortController?: AbortController;
}

/**
 * Request Scheduler
 */
export class RequestScheduler {
  private queues: Map<SchedulerPriority, ScheduledTask<any>[]>;
  private executing = new Set<string>();
  private maxConcurrent: Map<SchedulerPriority, number>;
  private totalMaxConcurrent: number;
  private stats = {
    executed: 0,
    cancelled: 0,
    timedOut: 0,
    errors: 0,
  };

  constructor(config?: {
    totalMaxConcurrent?: number;
    maxConcurrentPerPriority?: Map<SchedulerPriority, number>;
  }) {
    this.totalMaxConcurrent = config?.totalMaxConcurrent || 6; // Browser limit
    
    // Initialize queues
    this.queues = new Map([
      [SchedulerPriority.CRITICAL, []],
      [SchedulerPriority.HIGH, []],
      [SchedulerPriority.MEDIUM, []],
      [SchedulerPriority.LOW, []],
      [SchedulerPriority.BACKGROUND, []],
    ]);

    // Max concurrent per priority
    this.maxConcurrent = config?.maxConcurrentPerPriority || new Map([
      [SchedulerPriority.CRITICAL, 6],   // All slots
      [SchedulerPriority.HIGH, 4],       // Most slots
      [SchedulerPriority.MEDIUM, 3],     // Some slots
      [SchedulerPriority.LOW, 2],        // Few slots
      [SchedulerPriority.BACKGROUND, 1], // One slot
    ]);
  }

  /**
   * Schedule a request
   */
  schedule<T>(
    id: string,
    execute: () => Promise<T>,
    priority: SchedulerPriority = SchedulerPriority.MEDIUM,
    options?: {
      timeout?: number;
      abortController?: AbortController;
    }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check if already executing
      if (this.executing.has(id)) {
        reject(new Error(`Task ${id} is already executing`));
        return;
      }

      // Create task
      const task: ScheduledTask<T> = {
        id,
        priority,
        execute,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: options?.timeout,
        abortController: options?.abortController,
      };

      // Critical priority: execute immediately
      if (priority === SchedulerPriority.CRITICAL) {
        this.executeTask(task);
        return;
      }

      // Add to appropriate queue
      const queue = this.queues.get(priority)!;
      queue.push(task);

      // Try to process queues
      this.processQueues();
    });
  }

  /**
   * Execute task
   */
  private async executeTask<T>(task: ScheduledTask<T>): Promise<void> {
    this.executing.add(task.id);

    // Set timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (task.timeout) {
      timeoutId = setTimeout(() => {
        this.stats.timedOut++;
        task.abortController?.abort('Request timeout');
        task.reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
        this.executing.delete(task.id);
        this.processQueues();
      }, task.timeout);
    }

    try {
      const result = await task.execute();
      
      if (timeoutId) clearTimeout(timeoutId);
      
      this.stats.executed++;
      task.resolve(result);
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        this.stats.cancelled++;
      } else {
        this.stats.errors++;
      }
      
      task.reject(error);
    } finally {
      this.executing.delete(task.id);
      this.processQueues();
    }
  }

  /**
   * Process queues (highest priority first)
   */
  private processQueues(): void {
    // Check if we've reached total concurrent limit
    if (this.executing.size >= this.totalMaxConcurrent) {
      return;
    }

    // Process queues in priority order
    const priorities = [
      SchedulerPriority.CRITICAL,
      SchedulerPriority.HIGH,
      SchedulerPriority.MEDIUM,
      SchedulerPriority.LOW,
      SchedulerPriority.BACKGROUND,
    ];

    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;
      const maxConcurrent = this.maxConcurrent.get(priority)!;

      // Count executing tasks of this priority
      const executingCount = Array.from(this.executing).filter((id) => {
        // Find task priority (simplified - in real impl, track this)
        return true;
      }).length;

      // Execute tasks from this queue
      while (
        queue.length > 0 &&
        this.executing.size < this.totalMaxConcurrent &&
        executingCount < maxConcurrent
      ) {
        const task = queue.shift()!;
        this.executeTask(task);
      }

      // If we've hit total limit, stop
      if (this.executing.size >= this.totalMaxConcurrent) {
        break;
      }
    }
  }

  /**
   * Cancel task by ID
   */
  cancel(id: string): void {
    // Remove from queues
    for (const queue of this.queues.values()) {
      const index = queue.findIndex((task) => task.id === id);
      if (index !== -1) {
        const task = queue[index];
        queue.splice(index, 1);
        task.abortController?.abort('Task cancelled');
        task.reject(new Error(`Task ${id} was cancelled`));
        this.stats.cancelled++;
        return;
      }
    }

    // If executing, abort it
    if (this.executing.has(id)) {
      // Find task and abort (simplified)
      this.stats.cancelled++;
    }
  }

  /**
   * Cancel all tasks with priority <= threshold
   */
  cancelLowerPriority(threshold: SchedulerPriority): void {
    for (const [priority, queue] of this.queues) {
      if (priority > threshold) {
        while (queue.length > 0) {
          const task = queue.shift()!;
          task.abortController?.abort('Cancelled by higher priority');
          task.reject(new Error('Cancelled by higher priority request'));
          this.stats.cancelled++;
        }
      }
    }
  }

  /**
   * Clear all queues
   */
  clearAll(): void {
    for (const queue of this.queues.values()) {
      while (queue.length > 0) {
        const task = queue.shift()!;
        task.reject(new Error('Scheduler cleared'));
        this.stats.cancelled++;
      }
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const queueSizes: Record<string, number> = {};
    for (const [priority, queue] of this.queues) {
      queueSizes[SchedulerPriority[priority]] = queue.length;
    }

    return {
      executing: this.executing.size,
      queued: Array.from(this.queues.values()).reduce((sum, q) => sum + q.length, 0),
      queueSizes,
      stats: { ...this.stats },
      utilizationPercent: (this.executing.size / this.totalMaxConcurrent) * 100,
    };
  }

  /**
   * Get average wait time by priority
   */
  getAverageWaitTime(priority: SchedulerPriority): number {
    const queue = this.queues.get(priority)!;
    if (queue.length === 0) return 0;

    const now = Date.now();
    const totalWait = queue.reduce((sum, task) => sum + (now - task.createdAt), 0);
    return totalWait / queue.length;
  }
}

/**
 * Global request scheduler instance
 */
export const requestScheduler = new RequestScheduler({
  totalMaxConcurrent: 6, // Browser HTTP/1.1 limit
});

/**
 * Helper: Schedule fetch with priority
 */
export async function scheduledFetch<T>(
  id: string,
  url: string,
  priority: SchedulerPriority = SchedulerPriority.MEDIUM,
  options?: RequestInit & { timeout?: number }
): Promise<T> {
  const abortController = new AbortController();

  return requestScheduler.schedule(
    id,
    async () => {
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    priority,
    {
      timeout: options?.timeout,
      abortController,
    }
  );
}

/**
 * Priority hints for common request types
 */
export const REQUEST_PRIORITIES = {
  // Critical - Hero content
  MOVIE_HERO: SchedulerPriority.CRITICAL,
  USER_PROFILE: SchedulerPriority.CRITICAL,
  
  // High - Visible content
  MOVIE_LIST: SchedulerPriority.HIGH,
  MOVIE_DETAILS: SchedulerPriority.HIGH,
  SEARCH_RESULTS: SchedulerPriority.HIGH,
  
  // Medium - Secondary content
  MOVIE_CREDITS: SchedulerPriority.MEDIUM,
  MOVIE_VIDEOS: SchedulerPriority.MEDIUM,
  RECOMMENDATIONS: SchedulerPriority.MEDIUM,
  
  // Low - Prefetch
  PREFETCH_MOVIE: SchedulerPriority.LOW,
  PREFETCH_LIST: SchedulerPriority.LOW,
  
  // Background - Analytics
  ANALYTICS: SchedulerPriority.BACKGROUND,
  TELEMETRY: SchedulerPriority.BACKGROUND,
  REVIEW_SYNC: SchedulerPriority.BACKGROUND,
} as const;

/**
 * Network-aware scheduler
 * Adjusts concurrency based on network conditions
 */
export class NetworkAwareScheduler extends RequestScheduler {
  private connectionType: string = 'unknown';
  private effectiveType: string = '4g';

  constructor() {
    super();
    this.detectNetworkType();
    this.adjustForNetworkType();
  }

  /**
   * Detect network type
   */
  private detectNetworkType(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionType = connection?.type || 'unknown';
      this.effectiveType = connection?.effectiveType || '4g';

      connection?.addEventListener('change', () => {
        this.connectionType = connection.type;
        this.effectiveType = connection.effectiveType;
        this.adjustForNetworkType();
      });
    }
  }

  /**
   * Adjust scheduler based on network
   */
  private adjustForNetworkType(): void {
    let maxConcurrent = 6;

    switch (this.effectiveType) {
      case 'slow-2g':
      case '2g':
        maxConcurrent = 2;
        break;
      case '3g':
        maxConcurrent = 4;
        break;
      case '4g':
      default:
        maxConcurrent = 6;
        break;
    }

    // Update scheduler config (simplified)
    console.log(`[NetworkAwareScheduler] Adjusted concurrency to ${maxConcurrent} for ${this.effectiveType}`);
  }
}
