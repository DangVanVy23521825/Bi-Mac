import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireUserId } = vi.hoisted(() => ({ requireUserId: vi.fn() }))
vi.mock('@/features/account/guard', () => ({ requireUserId }))

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

const { toggleSavedItem, toggleSavedOutfit, toggleSavedStyle } = vi.hoisted(() => ({
  toggleSavedItem: vi.fn(),
  toggleSavedOutfit: vi.fn(),
  toggleSavedStyle: vi.fn(),
}))
vi.mock('@/features/closet/saved', () => ({ toggleSavedItem, toggleSavedOutfit, toggleSavedStyle }))

// Nhập sau mọi mock ở trên — cùng lý do với `actions.test.ts` của Task 7:
// `server.ts` (qua `@/lib/supabase/server`) kéo `next/headers`, thứ chỉ
// chạy được trong render thật.
import { toggleSavedItemAction, toggleSavedOutfitAction, toggleSavedStyleAction } from './savedActions'

const FAKE_SUPABASE = { from: vi.fn() } as never

describe('toggleSavedItemAction', () => {
  beforeEach(() => {
    requireUserId.mockReset()
    createSupabaseServerClient.mockReset()
    toggleSavedItem.mockReset()

    requireUserId.mockResolvedValue('u1')
    createSupabaseServerClient.mockResolvedValue(FAKE_SUPABASE)
  })

  it('gọi toggleSavedItem với đúng userId lấy từ requireUserId, không tin tham số từ client', async () => {
    toggleSavedItem.mockResolvedValue(true)

    const result = await toggleSavedItemAction('ao-lua')

    expect(result).toEqual({ ok: true, saved: true })
    expect(toggleSavedItem).toHaveBeenCalledWith(FAKE_SUPABASE, 'u1', 'ao-lua')
  })

  it('trả saved: false khi toggleSavedItem bỏ lưu', async () => {
    toggleSavedItem.mockResolvedValue(false)

    const result = await toggleSavedItemAction('ao-lua')

    expect(result).toEqual({ ok: true, saved: false })
  })

  it('toggleSavedItem ném lỗi (slug không có trong catalog) thì trả ok:false kèm đúng message, không nuốt lỗi thành generic', async () => {
    toggleSavedItem.mockRejectedValue(new Error('Món đồ này không còn trong catalog của Bí Mặc.'))

    const result = await toggleSavedItemAction('khong-ton-tai')

    expect(result).toEqual({ ok: false, error: 'Món đồ này không còn trong catalog của Bí Mặc.' })
  })

  it('Supabase chưa cấu hình thì báo lỗi, không gọi toggleSavedItem', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const result = await toggleSavedItemAction('ao-lua')

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Supabase') })
    expect(toggleSavedItem).not.toHaveBeenCalled()
  })
})

describe('toggleSavedStyleAction', () => {
  beforeEach(() => {
    requireUserId.mockReset()
    createSupabaseServerClient.mockReset()
    toggleSavedStyle.mockReset()

    requireUserId.mockResolvedValue('u1')
    createSupabaseServerClient.mockResolvedValue(FAKE_SUPABASE)
  })

  it('gọi toggleSavedStyle với đúng userId và styleSlug', async () => {
    toggleSavedStyle.mockResolvedValue(true)

    const result = await toggleSavedStyleAction('minimalist')

    expect(result).toEqual({ ok: true, saved: true })
    expect(toggleSavedStyle).toHaveBeenCalledWith(FAKE_SUPABASE, 'u1', 'minimalist')
  })

  it('Supabase chưa cấu hình thì báo lỗi, không gọi toggleSavedStyle', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const result = await toggleSavedStyleAction('minimalist')

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Supabase') })
    expect(toggleSavedStyle).not.toHaveBeenCalled()
  })
})

describe('toggleSavedOutfitAction', () => {
  beforeEach(() => {
    requireUserId.mockReset()
    createSupabaseServerClient.mockReset()
    toggleSavedOutfit.mockReset()

    requireUserId.mockResolvedValue('u1')
    createSupabaseServerClient.mockResolvedValue(FAKE_SUPABASE)
  })

  it('gọi toggleSavedOutfit với đúng userId và outfitSlug', async () => {
    toggleSavedOutfit.mockResolvedValue(true)

    const result = await toggleSavedOutfitAction('look-cuoi-tuan')

    expect(result).toEqual({ ok: true, saved: true })
    expect(toggleSavedOutfit).toHaveBeenCalledWith(FAKE_SUPABASE, 'u1', 'look-cuoi-tuan')
  })

  it('toggleSavedOutfit ném lỗi thì trả ok:false kèm đúng message', async () => {
    toggleSavedOutfit.mockRejectedValue(new Error('Look này không còn trong catalog của Bí Mặc.'))

    const result = await toggleSavedOutfitAction('khong-ton-tai')

    expect(result).toEqual({ ok: false, error: 'Look này không còn trong catalog của Bí Mặc.' })
  })

  it('Supabase chưa cấu hình thì báo lỗi, không gọi toggleSavedOutfit', async () => {
    createSupabaseServerClient.mockResolvedValue(null)

    const result = await toggleSavedOutfitAction('look-cuoi-tuan')

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Supabase') })
    expect(toggleSavedOutfit).not.toHaveBeenCalled()
  })
})
