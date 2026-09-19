/**
 * Simple in-memory rate limiter for API protection.
 * Uses a sliding window counter per key (typically IP).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30;

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();

  let entry = store.get(key);

  // Clean expired entry
  if (entry && now >= entry.resetAt) {
    store.delete(key);
    entry = undefined;
  }

  if (!entry) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Periodically clean up expired entries to prevent memory leaks.
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}
