/**
 * Lightweight in-process sliding-window rate limiter.
 *
 * Each API route creates its own RateLimiter instance with its own
 * window/limit settings.  The store is keyed by client IP so it stays
 * completely isolated between routes.
 *
 * ⚠️  This works great for single-process deployments (serverless, local dev).
 *     For horizontally-scaled deployments consider Redis-backed rate limiting.
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private store = new Map<string, WindowEntry>();
  private readonly limit: number;
  private readonly windowMs: number;

  /**
   * @param limit    Maximum requests allowed per window.
   * @param windowMs Window duration in milliseconds. Default 60 s.
   */
  constructor(limit: number, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check whether `key` is within the allowed rate.
   * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
   */
  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      // Start a new window
      this.store.set(key, { count: 1, windowStart: now });
      this._cleanup(now);
      return { allowed: true };
    }

    if (entry.count < this.limit) {
      entry.count++;
      return { allowed: true };
    }

    const retryAfterMs = this.windowMs - (now - entry.windowStart);
    return { allowed: false, retryAfterMs };
  }

  /** Prune stale entries to avoid unbounded memory growth. */
  private _cleanup(now: number) {
    for (const [key, entry] of this.store) {
      if (now - entry.windowStart >= this.windowMs) {
        this.store.delete(key);
      }
    }
  }
}

// ── Shared limiters per route ─────────────────────────────────────────────────
// Keep these at module scope so they persist across requests in the same process.

/** Analyze / Compare / Roadmap / Brief — expensive AI calls. */
export const aiLimiter = new RateLimiter(20, 60_000); // 20 req / min

/** Extract (file parsing) — cheaper but still I/O heavy. */
export const extractLimiter = new RateLimiter(30, 60_000); // 30 req / min

/** Q&A copilot — chatty by nature, slightly more generous. */
export const qaLimiter = new RateLimiter(40, 60_000); // 40 req / min

/**
 * Resolve the client IP from a Next.js request.
 * Respects standard proxy headers so it works behind Vercel / Cloudflare.
 */
export function getClientIp(request: Request): string {
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];
  for (const h of headers) {
    const val = (request as { headers: { get(name: string): string | null } }).headers.get(h);
    if (val) return val.split(",")[0].trim();
  }
  return "unknown";
}
