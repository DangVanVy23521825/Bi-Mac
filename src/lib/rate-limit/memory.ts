export type RateLimitDecision = { allowed: boolean; remaining: number; retryAfterMs: number }
export type RateLimiter = { check(key: string): Promise<RateLimitDecision> }

interface MemoryRateLimiterOptions {
  limit: number
  windowMs: number
  now?: () => number
}

export function createMemoryRateLimiter(opts: MemoryRateLimiterOptions): RateLimiter {
  const { limit, windowMs } = opts
  const now = opts.now ?? (() => Date.now())

  const timestamps = new Map<string, number[]>()

  return {
    check: async (key: string): Promise<RateLimitDecision> => {
      const currentTime = now()
      const windowStart = currentTime - windowMs

      // Get or initialize timestamps for this key
      let keyTimestamps = timestamps.get(key) ?? []

      // Expire old timestamps (filter before comparing)
      keyTimestamps = keyTimestamps.filter((ts) => ts > windowStart)

      // Check if allowed
      const allowed = keyTimestamps.length < limit

      // Add current timestamp if allowed
      if (allowed) {
        keyTimestamps.push(currentTime)
      }

      // Update or delete key to prevent unbounded growth
      if (keyTimestamps.length === 0) {
        timestamps.delete(key)
      } else {
        timestamps.set(key, keyTimestamps)
      }

      // Calculate remaining and retryAfterMs
      const remaining = Math.max(0, limit - keyTimestamps.length)
      const oldestTimestamp = keyTimestamps[0]
      const retryAfterMs = oldestTimestamp !== undefined ? oldestTimestamp + windowMs - currentTime : 0

      return { allowed, remaining, retryAfterMs }
    },
  }
}
