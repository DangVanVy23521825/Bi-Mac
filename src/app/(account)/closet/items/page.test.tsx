import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireUserId } = vi.hoisted(() => ({ requireUserId: vi.fn() }))
vi.mock('@/features/account/guard', () => ({ requireUserId }))

const { createSupabaseServerClient } = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }))

const { listClosetItems } = vi.hoisted(() => ({ listClosetItems: vi.fn() }))
vi.mock('@/features/closet/repository', () => ({ listClosetItems }))

const { signClosetImage } = vi.hoisted(() => ({ signClosetImage: vi.fn() }))
vi.mock('@/features/closet/images', () => ({ signClosetImage }))

// `AddItemForm` (client component) gọi `useRouter()`, thứ cần app router
// được mount thật — cùng mock như trong `AddItemForm.test.tsx`.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

// Ba Server Action của trang: mock vì `actions.ts` kéo `next/cache` và
// `next/headers`, những thứ chỉ chạy được trong một render thật.
vi.mock('./actions', () => ({
  createItemAction: vi.fn(),
  updateItemAction: vi.fn(),
  deleteItemAction: vi.fn(),
}))

import ClosetItemsPage from './page'

// Review toàn nhánh, Important #3: `listClosetItems` trả `[]` cho cả lỗi
// đọc lẫn tủ rỗng thật, và trang rẽ vào `EmptyCloset` ngay ở
// `items.length === 0` — nên một người có bốn mươi món, gặp đúng một lần
// đọc lỗi chớp nhoáng, được thông báo rằng họ chưa có món nào và được mời
// thêm món đầu tiên. Triết lý của cả nhánh là "vẫn dùng được, và nói thật
// đường nào đã chạy"; đây là chỗ duy nhất nó nói sai về dữ liệu của chính
// người dùng. Hai test dưới đây khoá cả hai phía: lỗi phải ra lỗi, còn tủ
// rỗng thật vẫn phải ra lời mời thêm món.
describe('/closet/items', () => {
  beforeEach(() => {
    requireUserId.mockReset().mockResolvedValue('u1')
    createSupabaseServerClient.mockReset().mockResolvedValue({ from: vi.fn() })
    listClosetItems.mockReset()
    signClosetImage.mockReset().mockResolvedValue(null)
  })

  it('đọc tủ đồ lỗi thì nói là chưa tải được, KHÔNG nói là tủ đang trống', async () => {
    listClosetItems.mockRejectedValue(new Error('Không đọc được tủ đồ.'))

    render(await ClosetItemsPage())

    expect(screen.getByText(/chưa tải được tủ đồ/i)).toBeInTheDocument()
    expect(screen.queryByText(/tủ đồ của bạn đang trống/i)).not.toBeInTheDocument()
  })

  it('tủ rỗng thật thì vẫn là lời mời thêm món đầu tiên, không phải báo lỗi', async () => {
    listClosetItems.mockResolvedValue([])

    render(await ClosetItemsPage())

    expect(screen.getByText(/tủ đồ của bạn đang trống/i)).toBeInTheDocument()
    expect(screen.queryByText(/chưa tải được tủ đồ/i)).not.toBeInTheDocument()
  })
})
