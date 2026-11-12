import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

// Imported after the mock, same reasoning as `images.test.ts`: `server.ts`
// pulls in `next/headers`, which only resolves inside a real request render.
import { consumeTagQuota, TAG_DAILY_LIMIT } from './quota'

// Fake for the *current* implementation: one `.rpc('increment_ai_usage', …)`
// call per `consumeTagQuota()` call, nothing else. Each call increments a
// shared in-closure counter and resolves with the post-increment value —
// standing in for `increment_ai_usage`'s single `insert … on conflict …
// do update set count = count + 1 returning count`.
//
// The increment happens synchronously, before the returned Promise ever
// settles — there is no `await` between "read the current count" and
// "write the new one" inside this fake, same as there is none inside a
// single Postgres UPDATE on one row (the row lock makes the whole
// read-modify-write indivisible from any other transaction's point of
// view). That is what makes the concurrency test below a faithful stand-in
// for the database, not just a unit test of arithmetic.
function createFakeSupabaseClient(initialCount = 0) {
  let count = initialCount
  const rpc = vi.fn(() => {
    count += 1
    return Promise.resolve({ data: count, error: null })
  })
  return { client: { rpc }, rpc, getCount: () => count }
}

describe('consumeTagQuota', () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset()
  })

  it('TAG_DAILY_LIMIT là 60', () => {
    expect(TAG_DAILY_LIMIT).toBe(60)
  })

  it('trả true khi Supabase chưa cấu hình — không có nơi lưu hạn mức để chặn', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(true)
  })

  it('gọi increment_ai_usage với đúng user_id và day dạng YYYY-MM-DD', async () => {
    const { client, rpc } = createFakeSupabaseClient(0)
    createSupabaseServerClient.mockResolvedValue(client)

    await consumeTagQuota('u-42')

    expect(rpc).toHaveBeenCalledWith('increment_ai_usage', {
      p_user_id: 'u-42',
      p_day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })

  it('cho qua khi count sau khi tăng còn trong hạn mức', async () => {
    const { client } = createFakeSupabaseClient(TAG_DAILY_LIMIT - 1)
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(true)
  })

  it('chặn khi count sau khi tăng đã vượt hạn mức', async () => {
    const { client } = createFakeSupabaseClient(TAG_DAILY_LIMIT)
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(false)
  })

  it('chặn (fail-closed) khi RPC báo lỗi', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue({ rpc })

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(false)
  })

  it('chặn (fail-closed) khi RPC trả về dữ liệu không phải số', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    createSupabaseServerClient.mockResolvedValue({ rpc })

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(false)
  })

  it('không log lỗi hay giá trị nào ra console', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const errSpy = vi.spyOn(console, 'error')
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue({ rpc })

    await consumeTagQuota('u1')

    expect(logSpy).not.toHaveBeenCalled()
    expect(errSpy).not.toHaveBeenCalled()
  })

  // Regression test for the race a review caught in the first version of
  // this file (select-today's-count, then upsert count + 1, as two
  // separate `await`s). Reproduced at the exact boundary: one slot left in
  // the day's quota, two requests arrive "at the same time" via
  // `Promise.all`.
  //
  // Against the OLD implementation this is a real failure, not a
  // hypothetical one: both calls' `select` would resolve with
  // `count: TAG_DAILY_LIMIT - 1` before either call's `upsert` had a
  // chance to run (nothing serializes two independent round trips against
  // a fake/real backend that itself has no cross-call locking), so both
  // would see `currentCount < TAG_DAILY_LIMIT` and both would return
  // `true` — two calls allowed through a one-call-wide gap.
  //
  // Against the CURRENT implementation, each call does exactly one `.rpc`
  // call, and this fake's `rpc` mock increments its shared counter
  // synchronously (no `await` before the mutation) — mirroring a single
  // Postgres row-level UPDATE, which the database itself serializes. So
  // exactly one of the two concurrent calls can observe (and return)
  // `true`; the test fails if a future change reintroduces a read/write
  // gap that lets both through.
  it('đồng thời, đúng tại biên hạn mức: 2 request song song chỉ đúng 1 được cho qua', async () => {
    const { client, getCount } = createFakeSupabaseClient(TAG_DAILY_LIMIT - 1)
    createSupabaseServerClient.mockResolvedValue(client)

    const [first, second] = await Promise.all([consumeTagQuota('u1'), consumeTagQuota('u1')])

    const results = [first, second]
    expect(results.filter((allowed) => allowed === true)).toHaveLength(1)
    expect(results.filter((allowed) => allowed === false)).toHaveLength(1)
    // Cả hai lượt gọi vẫn tăng count — hàm Postgres tăng vô điều kiện, chỉ
    // quyết định cho-qua/chặn dựa trên giá trị trả về sau khi tăng (xem
    // comment trong quota.ts và trong 0002_ai_usage.sql).
    expect(getCount()).toBe(TAG_DAILY_LIMIT + 1)
  })

  // Cùng race, quy mô lớn hơn một chút để không phải "may mắn đúng 2": bắn
  // nhiều hơn hạn mức một khoảng dư, từ 0, và kiểm đúng số lượng được cho
  // qua bằng chính TAG_DAILY_LIMIT, không hơn — dù tất cả cùng "đến" trong
  // một `Promise.all`.
  it('đồng thời, từ đầu ngày: đúng TAG_DAILY_LIMIT request được cho qua trong N request song song, không hơn', async () => {
    const { client, getCount } = createFakeSupabaseClient(0)
    createSupabaseServerClient.mockResolvedValue(client)

    const requestCount = TAG_DAILY_LIMIT + 5
    const results = await Promise.all(
      Array.from({ length: requestCount }, () => consumeTagQuota('u1')),
    )

    expect(results.filter((allowed) => allowed === true)).toHaveLength(TAG_DAILY_LIMIT)
    expect(results.filter((allowed) => allowed === false)).toHaveLength(5)
    expect(getCount()).toBe(requestCount)
  })
})
