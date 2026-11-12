import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StylistAnswers } from '@/types/stylist'

const { createSupabaseServerClientMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

// Imported after the mock above so `preferences.ts` picks up the mocked
// `createSupabaseServerClient` instead of the real one (which touches
// `next/headers` and throws outside a real request render).
import { loadPreferences, savePreferences } from './preferences'

function validAnswers(): StylistAnswers {
  return { occasions: ['work'], fitPreference: 'fitted', avoids: [], goal: 'style' }
}

// A minimal fake for the one chain each function actually uses —
// `.from(table).select(cols).eq(col, val).maybeSingle()` for reads,
// `.from(table).upsert(row, opts)` for writes. Every call is recorded so
// tests can assert on the query the module built (e.g. that `savePreferences`
// really issues an upsert, not an update) instead of only on the mapped
// result.
function createFakeClient(options: {
  selectResult?: { data: unknown; error: unknown }
  upsertResult?: { data: unknown; error: unknown }
} = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = []

  const client = {
    from(table: string) {
      calls.push({ method: 'from', args: [table] })
      return {
        select(columns: string) {
          calls.push({ method: 'select', args: [columns] })
          return {
            eq(column: string, value: unknown) {
              calls.push({ method: 'eq', args: [column, value] })
              return {
                async maybeSingle() {
                  return options.selectResult ?? { data: null, error: null }
                },
              }
            },
          }
        },
        async upsert(row: Record<string, unknown>, opts: unknown) {
          calls.push({ method: 'upsert', args: [row, opts] })
          return options.upsertResult ?? { data: null, error: null }
        },
      }
    },
  }

  return { client, calls }
}

describe('loadPreferences', () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset()
  })

  it('trả null khi profiles.preferences rỗng', async () => {
    const { client } = createFakeClient({ selectResult: { data: { preferences: {} }, error: null } })
    createSupabaseServerClientMock.mockResolvedValue(client)

    const result = await loadPreferences('user-a')

    expect(result).toBeNull()
  })

  it('trả null khi dữ liệu cũ không còn hợp schema', async () => {
    // Mô phỏng một occasion từng hợp lệ nhưng đã bị gỡ khỏi `OCCASIONS` —
    // không cần sửa schema thật, chỉ cần một giá trị mà schema hiện tại
    // chắc chắn không chấp nhận.
    const staleAnswers = { occasions: ['honeymoon'], fitPreference: 'fitted', avoids: [], goal: 'style' }
    const { client } = createFakeClient({ selectResult: { data: { preferences: staleAnswers }, error: null } })
    createSupabaseServerClientMock.mockResolvedValue(client)

    const result = await loadPreferences('user-a')

    // Nếu hàm bỏ qua `stylistAnswersSchema.safeParse` và trả thẳng
    // `data.preferences`, test này sẽ nhận lại `staleAnswers` (không null)
    // thay vì bị chặn ở đây — đây là điều khoá hành vi re-validate.
    expect(result).toBeNull()
  })

  it('trả đúng answers khi dữ liệu đã lưu còn hợp schema', async () => {
    const answers = validAnswers()
    const { client } = createFakeClient({ selectResult: { data: { preferences: answers }, error: null } })
    createSupabaseServerClientMock.mockResolvedValue(client)

    const result = await loadPreferences('user-a')

    expect(result).toEqual(answers)
  })

  it('trả null khi chưa đăng nhập hoặc Supabase chưa cấu hình', async () => {
    createSupabaseServerClientMock.mockResolvedValue(null)

    const result = await loadPreferences('user-a')

    expect(result).toBeNull()
  })

  it('trả null, không throw, khi client ném lỗi', async () => {
    createSupabaseServerClientMock.mockRejectedValue(new Error('network hiccup'))

    await expect(loadPreferences('user-a')).resolves.toBeNull()
  })
})

describe('savePreferences', () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset()
  })

  it('ghi đè lần trả lời trước bằng upsert, không phải update', async () => {
    const { client, calls } = createFakeClient()
    createSupabaseServerClientMock.mockResolvedValue(client)

    const newAnswers: StylistAnswers = { occasions: ['date', 'event'], fitPreference: 'oversized', avoids: ['sheer'], goal: 'outfits' }
    await savePreferences('user-a', newAnswers)

    const upsertCall = calls.find((call) => call.method === 'upsert')
    expect(upsertCall).toBeDefined()
    expect(upsertCall?.args[0]).toEqual({ id: 'user-a', preferences: newAnswers })
  })

  it('không throw khi Supabase chưa cấu hình', async () => {
    createSupabaseServerClientMock.mockResolvedValue(null)

    await expect(savePreferences('user-a', validAnswers())).resolves.toBeUndefined()
  })

  it('không throw khi ghi lỗi', async () => {
    const { client } = createFakeClient({ upsertResult: { data: null, error: new Error('boom') } })
    createSupabaseServerClientMock.mockResolvedValue(client)

    await expect(savePreferences('user-a', validAnswers())).resolves.toBeUndefined()
  })

  it('không throw khi client ném lỗi', async () => {
    createSupabaseServerClientMock.mockRejectedValue(new Error('network hiccup'))

    await expect(savePreferences('user-a', validAnswers())).resolves.toBeUndefined()
  })
})
