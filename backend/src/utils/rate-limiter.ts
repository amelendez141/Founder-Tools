/**
 * Simple in-memory rate limiter for auth endpoints (SEC-7 fix).
 *
 * Uses a sliding window approach per key (IP or email).
 * Not distributed — works for single-process V1.
 */

interface RateEntry {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private store = new Map<string, RateEntry>();
  private maxRequests: number;
  private windowMs: number;

  /**
   * @param maxRequests Max requests per window
   * @param windowMs Window size in milliseconds
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if the key is rate limited. If not, record the request.
   * @returns true if allowed, false if rate limited
   */
  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Prune old timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= this.maxRequests) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }

  /** Periodic cleanup of stale entries (call on interval) */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Auth rate limiters
// 5 magic link requests per email per 15 minutes
export const magicLinkLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
// 10 verify attempts per IP per 15 minutes
export const verifyLimiter = new InMemoryRateLimiter(10, 15 * 60 * 1000);

// Cleanup every 5 minutes
setInterval(() => {
  magicLinkLimiter.cleanup();
  verifyLimiter.cleanup();
}, 5 * 60 * 1000).unref();
