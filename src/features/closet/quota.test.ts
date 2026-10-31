import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

// Imported after the mock, same reasoning as `images.test.ts`: `server.ts`
// pulls in `next/headers`, which only resolves inside a real request render.
import { consumeTagQuota, TAG_DAILY_LIMIT } from './quota'

// Minimal stand-in for the one query shape `quota.ts` actually issues:
// `.from('ai_usage').select('count').eq(...).eq(...).maybeSingle()` to read
// today's row, then `.from('ai_usage').upsert({...}, { onConflict })` to
// write it back. Each call is recorded so a test can assert the upsert was
// never attempted once the limit is already hit — that is the behavior
// that actually protects the budget, not just the boolean return value.
function createFakeSupabaseClient(opts: {
  existingCount?: number
  selectError?: Error
  upsertError?: Error
}) {
  const maybeSingle = vi.fn().mockResolvedValue(
    opts.selectError
      ? { data: null, error: opts.selectError }
      : { data: opts.existingCount === undefined ? null : { count: opts.existingCount }, error: null },
  )
  const upsert = vi.fn().mockResolvedValue({ data: null, error: opts.upsertError ?? null })
  const eq2 = vi.fn().mockReturnValue({ maybeSingle })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  const from = vi.fn().mockReturnValue({ select, upsert })
  return { client: { from }, select, eq1, eq2, upsert }
}

describe('consumeTagQuota', () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TAG_DAILY_LIMIT là 60', () => {
    expect(TAG_DAILY_LIMIT).toBe(60)
  })

  it('trả true khi Supabase chưa cấu hình — không có nơi lưu hạn mức để chặn', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(true)
  })

  it('cho qua và tăng count khi chưa có hàng nào hôm nay', async () => {
    const { client, upsert } = createFakeSupabaseClient({})
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(true)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', count: 1 }),
      expect.objectContaining({ onConflict: 'user_id,day' }),
    )
  })

  it('cho qua và tăng count khi còn dưới hạn mức', async () => {
    const { client, upsert } = createFakeSupabaseClient({ existingCount: TAG_DAILY_LIMIT - 1 })
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(true)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ count: TAG_DAILY_LIMIT }),
      expect.anything(),
    )
  })

  // Test này hỏng nếu code xoá nhánh kiểm `currentCount >= TAG_DAILY_LIMIT`
  // trước khi gọi upsert: thiếu nhánh đó, upsert vẫn được gọi (chỉ với số
  // lớn hơn limit) và `allowed` có thể vẫn đúng `false` nếu ai đó áp limit
  // ở phía khác — assert "upsert không được gọi" mới thật sự bắt được việc
  // mất nhánh chặn trước khi ghi.
  it('chặn và KHÔNG gọi upsert khi đã đạt hạn mức hôm nay', async () => {
    const { client, upsert } = createFakeSupabaseClient({ existingCount: TAG_DAILY_LIMIT })
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('chặn (fail-closed) khi đọc hạn mức hôm nay bị lỗi', async () => {
    const { client, upsert } = createFakeSupabaseClient({ selectError: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('chặn (fail-closed) khi ghi hạn mức hôm nay bị lỗi', async () => {
    const { client } = createFakeSupabaseClient({ existingCount: 0, upsertError: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue(client)

    const allowed = await consumeTagQuota('u1')

    expect(allowed).toBe(false)
  })

  it('đọc đúng user_id và đúng bảng ai_usage', async () => {
    const { client, select, eq1 } = createFakeSupabaseClient({})
    createSupabaseServerClient.mockResolvedValue(client)

    await consumeTagQuota('u-42')

    expect(client.from).toHaveBeenCalledWith('ai_usage')
    expect(select).toHaveBeenCalledWith('count')
    expect(eq1).toHaveBeenCalledWith('user_id', 'u-42')
  })

  it('không log lỗi hay giá trị nào ra console', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const errSpy = vi.spyOn(console, 'error')
    const { client } = createFakeSupabaseClient({ selectError: new Error('boom') })
    createSupabaseServerClient.mockResolvedValue(client)

    await consumeTagQuota('u1')

    expect(logSpy).not.toHaveBeenCalled()
    expect(errSpy).not.toHaveBeenCalled()
  })
})
