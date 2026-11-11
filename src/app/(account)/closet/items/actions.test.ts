import { beforeEach, describe, expect, it, vi } from 'vitest'
import { allColors, allStyles } from '@/data'
import type { ClosetItemDraft } from '@/types/closet'

const { requireUserId } = vi.hoisted(() => ({ requireUserId: vi.fn() }))
vi.mock('@/features/account/guard', () => ({ requireUserId }))

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

const { createClosetItem, updateClosetItem, deleteClosetItem } = vi.hoisted(() => ({
  createClosetItem: vi.fn(),
  updateClosetItem: vi.fn(),
  deleteClosetItem: vi.fn(),
}))
vi.mock('@/features/closet/repository', () => ({ createClosetItem, updateClosetItem, deleteClosetItem }))

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath }))

// Nhập sau mọi mock ở trên — cùng lý do với `images.test.ts`/`guard.test.ts`:
// `server.ts` (qua `@/lib/supabase/server`) kéo `next/headers`, thứ chỉ chạy
// được trong render thật.
import { createItemAction, deleteItemAction, updateItemAction } from './actions'

const FAKE_SUPABASE = { from: vi.fn() } as never

function validDraft(): ClosetItemDraft {
  return {
    name: 'Áo sơ mi trắng',
    imagePath: 'u1/ao-so-mi.jpg',
    category: 'tops',
    colorSlugs: [allColors[0]!.slug],
    styleSlugs: [allStyles[0]!.slug],
    occasions: ['work'],
    fit: null,
    attributes: [],
    note: null,
    labelSource: 'ai',
  }
}

describe('createItemAction', () => {
  beforeEach(() => {
    requireUserId.mockReset()
    createSupabaseServerClient.mockReset()
    createClosetItem.mockReset()
    revalidatePath.mockReset()

    requireUserId.mockResolvedValue('u1')
    createSupabaseServerClient.mockResolvedValue(FAKE_SUPABASE)
  })

  it('lưu draft hợp lệ, gọi createClosetItem với đúng userId và revalidate /closet/items', async () => {
    createClosetItem.mockResolvedValue({ id: 'item-1' })

    const result = await createItemAction(validDraft())

    expect(result).toEqual({ ok: true })
    expect(createClosetItem).toHaveBeenCalledWith(FAKE_SUPABASE, 'u1', expect.objectContaining({ name: 'Áo sơ mi trắng' }))
    expect(revalidatePath).toHaveBeenCalledWith('/closet/items')
  })

  it('từ chối draft có colorSlugs ngoài catalog, không gọi createClosetItem', async () => {
    const result = await createItemAction({ ...validDraft(), colorSlugs: ['khong-ton-tai'] })

    expect(result.ok).toBe(false)
    expect(createClosetItem).not.toHaveBeenCalled()
  })

  it('Supabase chưa cấu hình thì báo lỗi, không gọi createClosetItem', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const result = await createItemAction(validDraft())

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Supabase') })
    expect(createClosetItem).not.toHaveBeenCalled()
  })

  // Review toàn nhánh: `createClosetItem` throw trên MỌI lỗi insert
  // (`repository.ts`), và action này là action duy nhất trong ba action
  // không bắt — hai action kia đều trả `{ ok: false }`. Lỗi bay thẳng qua
  // Server Action làm `AddItemForm` treo nút "Đang lưu…" vĩnh viễn, không
  // hiện lỗi nào, và bỏ lại một ảnh đã lên bucket mà không có dòng DB nào
  // trỏ tới. Một lỗi Supabase chớp nhoáng là đủ để chạm vào đường này, trên
  // đúng thao tác quan trọng nhất của milestone.
  it('createClosetItem throw (lỗi Supabase chớp nhoáng) thì trả ok:false, không revalidate', async () => {
    createClosetItem.mockRejectedValue(new Error('insert thất bại'))

    const result = await createItemAction(validDraft())

    expect(result.ok).toBe(false)
    expect(result).toEqual({ ok: false, error: expect.stringContaining('thử lại') })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('updateItemAction', () => {
  beforeEach(() => {
    requireUserId.mockReset()
    createSupabaseServerClient.mockReset()
    updateClosetItem.mockReset()
    revalidatePath.mockReset()

    requireUserId.mockResolvedValue('u1')
    createSupabaseServerClient.mockResolvedValue(FAKE_SUPABASE)
  })

  it('sửa draft hợp lệ, gọi updateClosetItem với đúng id/userId và revalidate', async () => {
    updateClosetItem.mockResolvedValue({ id: 'item-1' })

    const result = await updateItemAction('item-1', { ...validDraft(), name: 'Tên mới' })

    expect(result).toEqual({ ok: true })
    expect(updateClosetItem).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      'u1',
      'item-1',
      expect.objectContaining({ name: 'Tên mới' }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/closet/items')
  })

  // Khoá lại đúng gap mà review chỉ ra: trước fix, `updateItemAction` gọi
  // `updateClosetItem` thẳng, không qua `closetItemDraftSchema` như
  // `createItemAction`. Test này phải FAIL nếu ai gỡ dòng validate đi —
  // một `styleSlugs` không có trong catalog (không có check constraint ở
  // DB) phải bị chặn ở đây, trước khi chạm `updateClosetItem`.
  it('từ chối draft có styleSlugs ngoài catalog, không gọi updateClosetItem', async () => {
    const result = await updateItemAction('item-1', { ...validDraft(), styleSlugs: ['khong-ton-tai'] })

    expect(result.ok).toBe(false)
    expect(updateClosetItem).not.toHaveBeenCalled()
  })

  it('updateClosetItem trả null (không tìm thấy/không đúng chủ) thì báo lỗi', async () => {
    updateClosetItem.mockResolvedValue(null)

    const result = await updateItemAction('item-khong-ton-tai', validDraft())

    expect(result.ok).toBe(false)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('Supabase chưa cấu hình thì báo lỗi, không gọi updateClosetItem', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const result = await updateItemAction('item-1', validDraft())

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Supabase') })
    expect(updateClosetItem).not.toHaveBeenCalled()
  })
})

describe('deleteItemAction', () => {
  beforeEach(() => {
    requireUserId.mockReset()
    createSupabaseServerClient.mockReset()
    deleteClosetItem.mockReset()
    revalidatePath.mockReset()

    requireUserId.mockResolvedValue('u1')
    createSupabaseServerClient.mockResolvedValue(FAKE_SUPABASE)
  })

  it('xoá thành công thì revalidate /closet/items', async () => {
    deleteClosetItem.mockResolvedValue(true)

    const result = await deleteItemAction('item-1')

    expect(result).toEqual({ ok: true })
    expect(deleteClosetItem).toHaveBeenCalledWith(FAKE_SUPABASE, 'u1', 'item-1')
    expect(revalidatePath).toHaveBeenCalledWith('/closet/items')
  })

  it('deleteClosetItem trả false (không tìm thấy/không đúng chủ) thì báo lỗi, không revalidate', async () => {
    deleteClosetItem.mockResolvedValue(false)

    const result = await deleteItemAction('item-khong-ton-tai')

    expect(result.ok).toBe(false)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('Supabase chưa cấu hình thì báo lỗi, không gọi deleteClosetItem', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const result = await deleteItemAction('item-1')

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Supabase') })
    expect(deleteClosetItem).not.toHaveBeenCalled()
  })
})
