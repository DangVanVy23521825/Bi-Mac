import { describe, expect, it } from 'vitest'
import { createMemoryRateLimiter } from './memory'

describe('createMemoryRateLimiter', () => {
  it('cho qua tới đúng hạn mức', async () => {
    const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 1000, now: () => 0 })
    for (let i = 0; i < 3; i += 1) expect((await limiter.check('ip')).allowed).toBe(true)
    expect((await limiter.check('ip')).allowed).toBe(false)
  })

  it('đếm riêng theo key', async () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect((await limiter.check('a')).allowed).toBe(true)
    expect((await limiter.check('b')).allowed).toBe(true)
  })

  it('cửa sổ trôi thì mở lại', async () => {
    let t = 0
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
    expect((await limiter.check('ip')).allowed).toBe(true)
    expect((await limiter.check('ip')).allowed).toBe(false)
    t = 1001
    expect((await limiter.check('ip')).allowed).toBe(true)
  })

  it('báo remaining và retryAfterMs đúng', async () => {
    const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 })
    expect((await limiter.check('ip')).remaining).toBe(1)
    await limiter.check('ip')
    const blocked = await limiter.check('ip')
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBe(1000)
  })

  it('nhiều lượt gọi song song cùng key không đếm thiếu', async () => {
    const limiter = createMemoryRateLimiter({ limit: 5, windowMs: 1000, now: () => 0 })
    const results = await Promise.all(Array.from({ length: 8 }, () => limiter.check('ip')))
    expect(results.filter((r) => r.allowed)).toHaveLength(5)
  })

  it('không giữ key đã hết hạn', async () => {
    let t = 0
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 100, now: () => t })
    for (let i = 0; i < 500; i += 1) {
      await limiter.check(`ip-${i}`)
      t += 1
    }
    t += 1000
    expect((await limiter.check('ip-0')).allowed).toBe(true)
  })
})
