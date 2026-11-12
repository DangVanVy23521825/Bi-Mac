// Hai trang công khai, chia sẻ được bằng link — `/wardrobe/[category]/[slug]`
// và `/styles/[slug]` — và một bất biến chung, nên một file test chung:
// **không trang nào trong hai trang này được gọi `getCurrentUserId()`**.
//
// Review toàn nhánh, Important #5: cả hai trang gọi `getAuthState()` rồi
// gọi thêm `getCurrentUserId()` không bọc try/catch. Hàm đó cố ý không tự
// guard `auth.getUser()` (`session.ts`, và `guard.ts` giải thích dài tại
// sao guard thuộc về từng call site), và mọi caller khác đều guard —
// `requireUserId`, `getAuthState`, trang `/stylist`, hai route API. Đúng
// hai trang này là ngoại lệ, và đúng chúng là hai trang công khai: cửa
// trước của sản phẩm, nơi một lỗi auth chớp nhoáng hiện ra thành trang lỗi.
//
// Cách test bám vào chính cái sai đó: `getCurrentUserId` ở đây được mock
// thành một hàm LUÔN throw. Trước fix, cả hai trang render vỡ. Sau fix
// (`getViewer()` trả cả `authState` lẫn `userId` từ một lượt
// `auth.getUser()` duy nhất), không trang nào còn gọi tới nó.

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getViewer, getAuthState } = vi.hoisted(() => ({
  getViewer: vi.fn(),
  getAuthState: vi.fn(),
}))
vi.mock('@/features/account/guard', () => ({ getViewer, getAuthState }))

const { getCurrentUserId } = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(() => {
    throw new Error('getCurrentUserId không được gọi từ trang công khai nữa')
  }),
}))
vi.mock('@/lib/supabase/session', () => ({ getCurrentUserId }))

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

const { isItemSaved, isStyleSaved, listSavedOutfits } = vi.hoisted(() => ({
  isItemSaved: vi.fn(),
  isStyleSaved: vi.fn(),
  listSavedOutfits: vi.fn(),
}))
vi.mock('@/features/closet/saved', () => ({ isItemSaved, isStyleSaved, listSavedOutfits }))

// `savedActions.ts` là module 'use server' và kéo `next/cache` — ở đây chỉ
// cần chúng tồn tại để truyền xuống `SaveButton` làm prop.
vi.mock('@/features/closet/savedActions', () => ({
  toggleSavedItemAction: vi.fn(),
  toggleSavedOutfitAction: vi.fn(),
  toggleSavedStyleAction: vi.fn(),
}))

import ItemDetailPage from './wardrobe/[category]/[slug]/page'
import StyleDetailPage from './styles/[slug]/page'

describe('trang công khai không gọi getCurrentUserId()', () => {
  beforeEach(() => {
    getViewer.mockReset().mockResolvedValue({
      authState: { status: 'signed-in', displayName: 'Vy' },
      userId: 'u1',
    })
    getAuthState.mockReset().mockResolvedValue({ status: 'signed-in', displayName: 'Vy' })
    createSupabaseServerClient.mockReset().mockResolvedValue({ from: vi.fn() })
    isItemSaved.mockReset().mockResolvedValue(true)
    isStyleSaved.mockReset().mockResolvedValue(true)
    listSavedOutfits.mockReset().mockResolvedValue([])
    getCurrentUserId.mockClear()
  })

  it('trang item detail render được cho khách đã đăng nhập, không chạm getCurrentUserId', async () => {
    render(
      await ItemDetailPage({ params: Promise.resolve({ category: 'tops', slug: 'so-mi-trang' }) }),
    )

    expect(screen.getByRole('heading', { name: /Là gì/ })).toBeInTheDocument()
    expect(getCurrentUserId).not.toHaveBeenCalled()
    // Và vẫn đọc đúng dữ liệu của người đang đăng nhập — fix không được
    // âm thầm biến trang thành "luôn coi như chưa lưu gì".
    expect(isItemSaved).toHaveBeenCalledWith(expect.anything(), 'u1', 'so-mi-trang')
  })

  it('trang style detail render được cho khách đã đăng nhập, không chạm getCurrentUserId', async () => {
    render(await StyleDetailPage({ params: Promise.resolve({ slug: 'modern-classic' }) }))

    expect(screen.getByRole('heading', { name: /Bảng màu/ })).toBeInTheDocument()
    expect(getCurrentUserId).not.toHaveBeenCalled()
    expect(isStyleSaved).toHaveBeenCalledWith(expect.anything(), 'u1', 'modern-classic')
  })

  it('chưa đăng nhập thì không đọc dữ liệu cá nhân nào, trang vẫn render', async () => {
    getViewer.mockResolvedValue({ authState: { status: 'signed-out' }, userId: null })
    getAuthState.mockResolvedValue({ status: 'signed-out' })

    render(
      await ItemDetailPage({ params: Promise.resolve({ category: 'tops', slug: 'so-mi-trang' }) }),
    )

    expect(screen.getByRole('heading', { name: /Là gì/ })).toBeInTheDocument()
    expect(isItemSaved).not.toHaveBeenCalled()
    expect(listSavedOutfits).not.toHaveBeenCalled()
    expect(getCurrentUserId).not.toHaveBeenCalled()
  })
})
