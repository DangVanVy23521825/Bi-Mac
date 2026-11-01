import { describe, expect, it } from 'vitest'

import { allItems, allOutfits, allStyles } from '@/data'

import {
  isItemSaved,
  isStyleSaved,
  listSavedItems,
  listSavedOutfits,
  listSavedStyles,
  toggleSavedItem,
  toggleSavedOutfit,
  toggleSavedStyle,
} from './saved'

// A minimal in-memory stand-in for the PostgREST query builder, shaped
// like `repository.test.ts`'s fake but keyed by table so one client
// instance can host `saved_items`/`saved_outfits`/`saved_styles` at once
// without one table's rows leaking into another's query.
function createFakeSupabaseClient(seed: Record<string, Record<string, unknown>[]> = {}) {
  const store: Record<string, Record<string, unknown>[]> = {}
  for (const [table, rows] of Object.entries(seed)) {
    store[table] = rows.map((row) => ({ ...row }))
  }

  function matches(row: Record<string, unknown>, filters: Array<[string, unknown]>) {
    return filters.every(([col, val]) => row[col] === val)
  }

  function from(table: string) {
    const filters: Array<[string, unknown]> = []
    let op: 'select' | 'insert' | 'delete' = 'select'
    let insertPayload: Record<string, unknown> | null = null

    const builder = {
      select() {
        return builder
      },
      eq(column: string, value: unknown) {
        filters.push([column, value])
        return builder
      },
      order() {
        return builder
      },
      insert(row: Record<string, unknown>) {
        op = 'insert'
        insertPayload = row
        return builder
      },
      delete() {
        op = 'delete'
        return builder
      },
      async maybeSingle() {
        const result = await run()
        if (result.error) return { data: null, error: result.error }
        return { data: result.data[0] ?? null, error: null }
      },
      then(
        onFulfilled: (value: { data: unknown[] | null; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return run().then(onFulfilled, onRejected)
      },
    }

    async function run(): Promise<{ data: Record<string, unknown>[]; error: unknown }> {
      const rows = store[table] ?? (store[table] = [])

      if (op === 'insert' && insertPayload) {
        const newRow = { created_at: '2026-10-31T00:00:00.000Z', ...insertPayload }
        rows.push(newRow)
        return { data: [newRow], error: null }
      }

      const matched = rows.filter((row) => matches(row, filters))

      if (op === 'delete') {
        store[table] = rows.filter((row) => !matches(row, filters))
        return { data: matched, error: null }
      }

      return { data: matched, error: null }
    }

    return builder
  }

  return {
    client: { from } as unknown as import('@supabase/supabase-js').SupabaseClient,
    getRows: (table: string) => store[table] ?? [],
  }
}

const realItemSlug = allItems[0]!.slug
const otherRealItemSlug = allItems[1]!.slug
const realStyleSlug = allStyles[0]!.slug
const realOutfitSlug = allOutfits[0]!.slug
const staleSlug = 'slug-da-bi-xoa'

describe('listSavedItems', () => {
  it('bỏ qua slug không còn trong fixtures, không ném lỗi', async () => {
    const { client } = createFakeSupabaseClient({
      saved_items: [
        { user_id: 'u1', item_slug: realItemSlug, created_at: '2026-10-01T00:00:00.000Z' },
        { user_id: 'u1', item_slug: staleSlug, created_at: '2026-10-02T00:00:00.000Z' },
      ],
    })

    const result = await listSavedItems(client, 'u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.slug).toBe(realItemSlug)
  })

  it('trả mảng rỗng khi chưa lưu gì', async () => {
    const { client } = createFakeSupabaseClient({ saved_items: [] })

    const result = await listSavedItems(client, 'u1')

    expect(result).toEqual([])
  })
})

describe('listSavedOutfits', () => {
  it('bỏ qua slug không còn trong fixtures', async () => {
    const { client } = createFakeSupabaseClient({
      saved_outfits: [
        { user_id: 'u1', outfit_slug: realOutfitSlug, created_at: '2026-10-01T00:00:00.000Z' },
        { user_id: 'u1', outfit_slug: staleSlug, created_at: '2026-10-02T00:00:00.000Z' },
      ],
    })

    const result = await listSavedOutfits(client, 'u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.slug).toBe(realOutfitSlug)
  })
})

describe('listSavedStyles', () => {
  it('bỏ qua slug không còn trong fixtures', async () => {
    const { client } = createFakeSupabaseClient({
      saved_styles: [
        { user_id: 'u1', style_slug: realStyleSlug, created_at: '2026-10-01T00:00:00.000Z' },
        { user_id: 'u1', style_slug: staleSlug, created_at: '2026-10-02T00:00:00.000Z' },
      ],
    })

    const result = await listSavedStyles(client, 'u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.slug).toBe(realStyleSlug)
  })
})

describe('toggleSavedItem', () => {
  it('lưu rồi bỏ lưu đúng một lần mỗi lượt', async () => {
    const { client, getRows } = createFakeSupabaseClient({ saved_items: [] })

    const afterFirstCall = await toggleSavedItem(client, 'u1', realItemSlug)
    expect(afterFirstCall).toBe(true)
    expect(getRows('saved_items')).toHaveLength(1)

    const afterSecondCall = await toggleSavedItem(client, 'u1', realItemSlug)
    expect(afterSecondCall).toBe(false)
    expect(getRows('saved_items')).toHaveLength(0)
  })

  it('không đụng tới món đã lưu của người khác', async () => {
    const { client, getRows } = createFakeSupabaseClient({
      saved_items: [{ user_id: 'u2', item_slug: realItemSlug, created_at: '2026-10-01T00:00:00.000Z' }],
    })

    const saved = await toggleSavedItem(client, 'u1', realItemSlug)

    expect(saved).toBe(true)
    expect(getRows('saved_items')).toHaveLength(2)
  })

  it('từ chối slug không có trong fixtures, không ghi gì vào database', async () => {
    const { client, getRows } = createFakeSupabaseClient({ saved_items: [] })

    await expect(toggleSavedItem(client, 'u1', staleSlug)).rejects.toThrow()
    expect(getRows('saved_items')).toHaveLength(0)
  })

  it('vẫn bỏ lưu được một slug đã bị xoá khỏi fixtures (hàng cũ còn trong DB)', async () => {
    // Hệ quả Review Focus #4 ở chiều ngược lại: slug không còn hợp lệ để
    // *thêm mới*, nhưng một hàng cũ trỏ tới nó vẫn phải xoá được — validate
    // chỉ chặn nhánh insert, không chặn nhánh delete.
    const { client, getRows } = createFakeSupabaseClient({
      saved_items: [{ user_id: 'u1', item_slug: staleSlug, created_at: '2026-10-01T00:00:00.000Z' }],
    })

    const saved = await toggleSavedItem(client, 'u1', staleSlug)

    expect(saved).toBe(false)
    expect(getRows('saved_items')).toHaveLength(0)
  })
})

describe('toggleSavedOutfit', () => {
  it('lưu rồi bỏ lưu đúng một lần mỗi lượt', async () => {
    const { client, getRows } = createFakeSupabaseClient({ saved_outfits: [] })

    const afterFirstCall = await toggleSavedOutfit(client, 'u1', realOutfitSlug)
    expect(afterFirstCall).toBe(true)
    expect(getRows('saved_outfits')).toHaveLength(1)

    const afterSecondCall = await toggleSavedOutfit(client, 'u1', realOutfitSlug)
    expect(afterSecondCall).toBe(false)
    expect(getRows('saved_outfits')).toHaveLength(0)
  })

  it('không đụng tới look đã lưu của người khác', async () => {
    const { client, getRows } = createFakeSupabaseClient({
      saved_outfits: [{ user_id: 'u2', outfit_slug: realOutfitSlug, created_at: '2026-10-01T00:00:00.000Z' }],
    })

    const saved = await toggleSavedOutfit(client, 'u1', realOutfitSlug)

    expect(saved).toBe(true)
    expect(getRows('saved_outfits')).toHaveLength(2)
  })

  it('từ chối slug không có trong fixtures, không ghi gì vào database', async () => {
    const { client, getRows } = createFakeSupabaseClient({ saved_outfits: [] })

    await expect(toggleSavedOutfit(client, 'u1', staleSlug)).rejects.toThrow()
    expect(getRows('saved_outfits')).toHaveLength(0)
  })

  it('vẫn bỏ lưu được một slug đã bị xoá khỏi fixtures (hàng cũ còn trong DB)', async () => {
    const { client, getRows } = createFakeSupabaseClient({
      saved_outfits: [{ user_id: 'u1', outfit_slug: staleSlug, created_at: '2026-10-01T00:00:00.000Z' }],
    })

    const saved = await toggleSavedOutfit(client, 'u1', staleSlug)

    expect(saved).toBe(false)
    expect(getRows('saved_outfits')).toHaveLength(0)
  })
})

describe('toggleSavedStyle', () => {
  it('lưu rồi bỏ lưu đúng một lần mỗi lượt', async () => {
    const { client } = createFakeSupabaseClient({ saved_styles: [] })

    expect(await toggleSavedStyle(client, 'u1', realStyleSlug)).toBe(true)
    expect(await toggleSavedStyle(client, 'u1', realStyleSlug)).toBe(false)
  })

  it('từ chối slug không có trong fixtures', async () => {
    const { client } = createFakeSupabaseClient({ saved_styles: [] })

    await expect(toggleSavedStyle(client, 'u1', staleSlug)).rejects.toThrow()
  })
})

describe('isItemSaved / isStyleSaved', () => {
  it('isItemSaved true khi đã lưu, false khi chưa', async () => {
    const { client } = createFakeSupabaseClient({
      saved_items: [{ user_id: 'u1', item_slug: realItemSlug, created_at: '2026-10-01T00:00:00.000Z' }],
    })

    expect(await isItemSaved(client, 'u1', realItemSlug)).toBe(true)
    expect(await isItemSaved(client, 'u1', otherRealItemSlug)).toBe(false)
  })

  it('isStyleSaved false khi chưa lưu', async () => {
    const { client } = createFakeSupabaseClient({ saved_styles: [] })

    expect(await isStyleSaved(client, 'u1', realStyleSlug)).toBe(false)
  })
})
