export type { RateLimitDecision, RateLimiter } from './memory'
export { createMemoryRateLimiter } from './memory'

/**
 * Rate limiting seam for in-memory sliding-window counter.
 *
 * This is the integration point for swapping rate-limit implementations.
 * To replace with Upstash Redis or another backend, provide a different
 * implementation of `RateLimiter` with the same interface—no call-site changes needed.
 *
 * Known limitation: the in-memory counter is per-instance. On a multi-instance platform
 * like Vercel, the effective rate limit is `limit × number of instances`. This is an
 * accepted trade-off for M0 and should be revisited if this becomes a problem in
 * production.
 */
