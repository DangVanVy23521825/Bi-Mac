import { describe, expect, it } from 'vitest'

import type { ClosetItemDraft } from '@/types/closet'

import { createClosetItem, deleteClosetItem, listClosetItems, updateClosetItem } from './repository'

// A minimal in-memory stand-in for the PostgREST query builder
// `@supabase/supabase-js` returns from `.from(table)`. It is deliberately
// NOT a "return whatever I was told to return" stub: every `.eq(col, val)`
// call is recorded and actually applied as a filter against the row store
// before a select/update/delete runs. That is the point — if
// `repository.ts` ever dropped the `.eq('user_id', userId)` filter (the
// one thing Review Focus #2 cares about), a test against a naive stub
// that just returns its configured value would keep passing; this fake
// would instead let the wrong row through, because it is simulating what
// "no user_id filter" actually does to a query, the same way RLS would
// reject it in production.
//
// Each test asserts on `client.calls` (what query the repository built)
// in addition to the eventual mapped result, so these tests fail if
// `repository.ts` ever stops filtering by `user_id`, even if some other
// compensating bug happened to make the final data line up by accident.
function createFakeSupabaseClient(seedRows: Record<string, unknown>[]) {
  let rows = seedRows.map((row) => ({ ...row }))
  const calls: Array<{ method: string; args: unknown[] }> = []
  let nextId = rows.length + 1

  function matchesAllFilters(row: Record<string, unknown>, filters: Array<[string, unknown]>) {
    return filters.every(([col, val]) => row[col] === val)
  }

  function from(table: string) {
    const filters: Array<[string, unknown]> = []
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: Record<string, unknown> | null = null
    let rowLimit: number | undefined

    const builder = {
      select(columns: string) {
        calls.push({ method: 'select', args: [table, columns] })
        return builder
      },
      eq(column: string, value: unknown) {
        calls.push({ method: 'eq', args: [table, column, value] })
        filters.push([column, value])
        return builder
      },
      order(column: string, opts: unknown) {
        calls.push({ method: 'order', args: [table, column, opts] })
        return builder
      },
      limit(count: number) {
        calls.push({ method: 'limit', args: [table, count] })
        rowLimit = count
        return builder
      },
      insert(row: Record<string, unknown>) {
        calls.push({ method: 'insert', args: [table, row] })
        op = 'insert'
        payload = row
        return builder
      },
      update(patch: Record<string, unknown>) {
        calls.push({ method: 'update', args: [table, patch] })
        op = 'update'
        payload = patch
        return builder
      },
      delete() {
        calls.push({ method: 'delete', args: [table] })
        op = 'delete'
        return builder
      },
      async single() {
        const result = await run()
        if (result.error || result.data.length !== 1) {
          return { data: null, error: result.error ?? new Error('expected exactly one row') }
        }
        return { data: result.data[0], error: null }
      },
      async maybeSingle() {
        const result = await run()
        if (result.error) return { data: null, error: result.error }
        return { data: result.data[0] ?? null, error: null }
      },
      then(
        onFulfilled: (value: { data: unknown[]; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return run().then(onFulfilled, onRejected)
      },
    }

    async function run(): Promise<{ data: Record<string, unknown>[]; error: unknown }> {
      if (op === 'insert' && payload) {
        const newRow = {
          id: `generated-${nextId++}`,
          created_at: '2026-10-31T00:00:00.000Z',
          ...payload,
        }
        rows.push(newRow)
        return { data: [newRow], error: null }
      }

      const matched = rows.filter((row) => matchesAllFilters(row, filters))

      if (op === 'update' && payload) {
        matched.forEach((row) => Object.assign(row, payload))
        return { data: matched, error: null }
      }

      if (op === 'delete') {
        rows = rows.filter((row) => !matchesAllFilters(row, filters))
        return { data: matched, error: null }
      }

      return { data: rowLimit !== undefined ? matched.slice(0, rowLimit) : matched, error: null }
    }

    return builder
  }

  return {
    client: { from } as unknown as import('@supabase/supabase-js').SupabaseClient,
    calls,
    getRows: () => rows,
  }
}

function dbRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-1',
    user_id: 'user-a',
    name: 'Áo sơ mi trắng',
    image_path: 'user-a/ao-so-mi.jpg',
    category: 'tops',
    color_slugs: ['kem'],
    style_slugs: ['modern-classic'],
    occasions: ['work'],
    fit: null,
    attributes: [],
    note: null,
    label_source: 'user',
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

function draft(overrides: Partial<ClosetItemDraft> = {}): ClosetItemDraft {
  return {
    name: 'Áo sơ mi trắng',
    imagePath: 'user-a/ao-so-mi.jpg',
    category: 'tops',
    colorSlugs: ['kem'],
    styleSlugs: ['modern-classic'],
    occasions: ['work'],
    fit: null,
    attributes: [],
    note: null,
    labelSource: 'user',
    ...overrides,
  }
}

describe('listClosetItems', () => {
  it('lọc theo đúng user_id, không trả hàng của người khác', async () => {
    const { client, calls } = createFakeSupabaseClient([
      dbRow({ id: 'item-a', user_id: 'user-a' }),
      dbRow({ id: 'item-b', user_id: 'user-b' }),
    ])

    const result = await listClosetItems(client, 'user-a')

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('item-a')
    expect(result[0]!.userId).toBe('user-a')
    // The call that matters for Review Focus #2: the repository itself
    // issued `.eq('user_id', 'user-a')`, not just "happened to return the
    // right row".
    expect(calls).toContainEqual({ method: 'eq', args: ['closet_items', 'user_id', 'user-a'] })
  })

  it('map đúng snake_case sang camelCase', async () => {
    const { client } = createFakeSupabaseClient([
      dbRow({ fit: 'fitted', attributes: ['cropped'], note: 'hơi chật ở eo' }),
    ])

    const [item] = await listClosetItems(client, 'user-a')

    expect(item).toMatchObject({
      id: 'item-1',
      userId: 'user-a',
      imagePath: 'user-a/ao-so-mi.jpg',
      colorSlugs: ['kem'],
      styleSlugs: ['modern-classic'],
      occasions: ['work'],
      fit: 'fitted',
      attributes: ['cropped'],
      note: 'hơi chật ở eo',
      labelSource: 'user',
      createdAt: '2026-10-01T00:00:00.000Z',
    })
  })

  it('trả mảng rỗng khi user không có món nào', async () => {
    const { client } = createFakeSupabaseClient([dbRow({ user_id: 'user-b' })])

    const result = await listClosetItems(client, 'user-a')

    expect(result).toEqual([])
  })

  // Task 11 follow-up (review finding): a caller that only needs a few
  // items (the AI Stylist route) can pass `limit` to bound the query
  // itself, instead of fetching every row the user owns and discarding
  // most of them downstream.
  it('không truyền limit thì lấy hết; truyền limit thì repository tự giới hạn số dòng', async () => {
    const { client, calls } = createFakeSupabaseClient([
      dbRow({ id: 'item-a' }),
      dbRow({ id: 'item-b' }),
      dbRow({ id: 'item-c' }),
    ])

    const all = await listClosetItems(client, 'user-a')
    expect(all).toHaveLength(3)

    const capped = await listClosetItems(client, 'user-a', { limit: 2 })
    expect(capped).toHaveLength(2)
    expect(calls).toContainEqual({ method: 'limit', args: ['closet_items', 2] })
  })
})

describe('createClosetItem', () => {
  it('đặt labelSource theo draft và gắn đúng user_id', async () => {
    const { client, calls } = createFakeSupabaseClient([])

    const created = await createClosetItem(client, 'user-a', draft({ labelSource: 'ai' }))

    expect(created.labelSource).toBe('ai')
    expect(created.userId).toBe('user-a')
    expect(created.imagePath).toBe('user-a/ao-so-mi.jpg')
    const insertCall = calls.find((call) => call.method === 'insert')
    expect(insertCall?.args[1]).toMatchObject({ label_source: 'ai', user_id: 'user-a' })
  })
})

describe('updateClosetItem', () => {
  it('trả null khi id thuộc user khác, và không sửa hàng đó', async () => {
    const { client, getRows } = createFakeSupabaseClient([dbRow({ id: 'item-b', user_id: 'user-b', name: 'Áo của B' })])

    const result = await updateClosetItem(client, 'user-a', 'item-b', { name: 'Chiếm đoạt' })

    expect(result).toBeNull()
    expect(getRows().find((row) => row.id === 'item-b')?.name).toBe('Áo của B')
  })

  it('cập nhật đúng hàng khi id và user_id khớp', async () => {
    const { client } = createFakeSupabaseClient([dbRow({ id: 'item-a', user_id: 'user-a', name: 'Cũ' })])

    const result = await updateClosetItem(client, 'user-a', 'item-a', { name: 'Mới' })

    expect(result?.name).toBe('Mới')
  })

  it('luôn kèm cả hai điều kiện lọc id và user_id', async () => {
    const { client, calls } = createFakeSupabaseClient([dbRow({ id: 'item-a', user_id: 'user-a' })])

    await updateClosetItem(client, 'user-a', 'item-a', { name: 'Mới' })

    expect(calls).toContainEqual({ method: 'eq', args: ['closet_items', 'id', 'item-a'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['closet_items', 'user_id', 'user-a'] })
  })
})

describe('deleteClosetItem', () => {
  it('trả false khi id thuộc user khác, và không xoá hàng đó', async () => {
    const { client, getRows } = createFakeSupabaseClient([dbRow({ id: 'item-b', user_id: 'user-b' })])

    const result = await deleteClosetItem(client, 'user-a', 'item-b')

    expect(result).toBe(false)
    expect(getRows()).toHaveLength(1)
  })

  it('trả true và xoá đúng hàng khi id và user_id khớp', async () => {
    const { client, getRows } = createFakeSupabaseClient([dbRow({ id: 'item-a', user_id: 'user-a' })])

    const result = await deleteClosetItem(client, 'user-a', 'item-a')

    expect(result).toBe(true)
    expect(getRows()).toHaveLength(0)
  })
})
