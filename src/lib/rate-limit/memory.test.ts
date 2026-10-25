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

  // Trước đây test này chỉ xác nhận cửa sổ mở lại cho `ip-0` — điều một
  // test khác ("cửa sổ trôi thì mở lại") đã kiểm rồi, và không nói gì về
  // việc bộ nhớ có được dọn hay không. Giờ test thẳng vào thuộc tính dọn
  // dẹp: dùng `size()` (introspection dành cho test, xem `memory.ts`) để
  // xác nhận key đã hết hạn thực sự biến mất khỏi Map, không chỉ "còn
  // dùng được lại" — một implementation giữ mọi key mãi mãi (bug cũ) vẫn
  // qua được bài kiểm "mở lại cửa sổ" nhưng phải fail bài kiểm này.
  it('dọn key đã hết hạn khỏi bộ nhớ, không giữ mãi để phình không giới hạn', async () => {
    let t = 0
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 100, now: () => t })
    const STALE_KEY_COUNT = 50

    for (let i = 0; i < STALE_KEY_COUNT; i += 1) {
      await limiter.check(`stale-${i}`)
    }
    expect(limiter.size()).toBe(STALE_KEY_COUNT)

    // Mọi key trên giờ đã hết hạn (windowMs=100, trôi xa hơn nhiều).
    t += 1000

    // Sweep bị giới hạn theo lượt (SWEEP_BATCH_SIZE trong memory.ts), nên
    // cần vài lượt check bất kỳ — không nhất thiết đúng những key cũ — để
    // quét hết toàn bộ 50 key. 10 lượt dư sức (10 × SWEEP_BATCH_SIZE=20
    // bước quét, trong khi chỉ có 50 key cũ cần dọn).
    for (let i = 0; i < 10; i += 1) {
      await limiter.check(`flush-${i}`)
    }

    // Chỉ còn tối đa 10 key flush vừa thêm; toàn bộ 50 key cũ phải đã bị
    // dọn, không phải "vẫn còn nhưng mở lại cửa sổ".
    expect(limiter.size()).toBeLessThanOrEqual(10)
  })
})
