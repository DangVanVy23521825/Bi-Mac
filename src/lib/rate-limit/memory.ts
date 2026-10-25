export type RateLimitDecision = { allowed: boolean; remaining: number; retryAfterMs: number }
export type RateLimiter = { check(key: string): Promise<RateLimitDecision> }

// `createMemoryRateLimiter`'s return type, narrowed beyond `RateLimiter`.
// `size()` is introspection for tests only (it proves eviction actually
// happens) — it is deliberately not on the `RateLimiter` interface itself,
// because that interface is also the seam a future Upstash/Redis
// implementation satisfies (see `./index.ts`), and "how many keys are
// resident" is meaningless for a backend that isn't an in-process Map.
export type MemoryRateLimiter = RateLimiter & { size(): number }

interface MemoryRateLimiterOptions {
  limit: number
  windowMs: number
  now?: () => number
}

// How many resident keys a single `check()` call will inspect for eviction
// before giving up for that call. A fixed, small batch keeps the sweep
// O(1)-amortized per call (no `await` is introduced, so the "parallel
// calls to the same key don't under-count" guarantee pinned by the
// "nhiều lượt gọi song song cùng key không đếm thiếu" test is untouched)
// while still guaranteeing every key is eventually revisited — the cursor
// below resumes where the previous call left off instead of always
// starting at the Map's first key, so no region of the key space starves
// just because it sorts late in iteration order.
const SWEEP_BATCH_SIZE = 20

export function createMemoryRateLimiter(opts: MemoryRateLimiterOptions): MemoryRateLimiter {
  const { limit, windowMs } = opts
  const now = opts.now ?? (() => Date.now())

  const timestamps = new Map<string, number[]>()
  let sweepCursor: IterableIterator<string> | null = null

  // Evicts up to `SWEEP_BATCH_SIZE` keys whose every timestamp has fallen
  // out of the window, resuming from wherever the last sweep stopped.
  // Keys visited but not yet expired are left alone (not re-filtered here)
  // — `check()` itself always filters its own key's array on every call,
  // so a key's entry is never stale by more than one sweep pass once it
  // stops being checked directly.
  function sweepExpired(currentTime: number): void {
    const windowStart = currentTime - windowMs
    for (let i = 0; i < SWEEP_BATCH_SIZE; i += 1) {
      if (!sweepCursor) {
        if (timestamps.size === 0) {
          return
        }
        sweepCursor = timestamps.keys()
      }
      const next = sweepCursor.next()
      if (next.done) {
        sweepCursor = null
        continue
      }
      const candidateKey = next.value
      const candidateTimestamps = timestamps.get(candidateKey)
      if (candidateTimestamps === undefined) {
        continue
      }
      const stillLive = candidateTimestamps.some((ts) => ts > windowStart)
      if (!stillLive) {
        timestamps.delete(candidateKey)
      }
    }
  }

  return {
    check: async (key: string): Promise<RateLimitDecision> => {
      const currentTime = now()
      const windowStart = currentTime - windowMs

      // Evict expired keys first (bounded sweep — see `sweepExpired`).
      // This is what actually prevents unbounded growth: a key that is
      // never checked again still eventually gets collected because every
      // call sweeps a few more entries, not just the key being checked
      // right now.
      sweepExpired(currentTime)

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

      // Store the filtered (and possibly extended) array back, or drop the
      // key entirely when it has nothing left — this keeps the key this
      // call touched from lingering, on top of the background sweep above.
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
    size: () => timestamps.size,
  }
}
