import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { getAuthState } = vi.hoisted(() => ({ getAuthState: vi.fn() }))
vi.mock('@/features/account/guard', () => ({ getAuthState }))

import AccountLayout from './layout'

// This is the test the Important finding asked for: proof the boundary is
// enforced, not just present. A test that only checked "AccountLayout
// calls getAuthState()" would restate the mock; these instead assert what
// actually reaches the screen for each state — children leak through only
// when signed in, and `/closet`'s own content never renders for a visitor
// who hasn't signed in, which is exactly the gap the review found in
// `src/app/closet/page.tsx` before this fix (0 calls to any guard
// function, rendered unconditionally).
describe('AccountLayout — ranh giới vùng cần tài khoản (/closet và các route con)', () => {
  it('render children khi đã đăng nhập — không chặn nội dung của trang', async () => {
    getAuthState.mockResolvedValue({ status: 'signed-in', displayName: 'Vy' })

    render(await AccountLayout({ children: <p>Nội dung tủ đồ</p> }))

    expect(screen.getByText('Nội dung tủ đồ')).toBeInTheDocument()
  })

  it('CHẶN children khi chưa đăng nhập — đây là phần chứng minh ranh giới có tác dụng, không chỉ tồn tại', async () => {
    getAuthState.mockResolvedValue({ status: 'signed-out' })

    render(await AccountLayout({ children: <p>Nội dung tủ đồ</p> }))

    expect(screen.queryByText('Nội dung tủ đồ')).not.toBeInTheDocument()
    expect(screen.getByText('Đăng nhập để xem nội dung này.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /đăng nhập bằng google/i })).toBeInTheDocument()
  })

  it('chưa cấu hình: chặn children nhưng KHÔNG redirect/lỗi — chỉ hiện thông báo', async () => {
    getAuthState.mockResolvedValue({ status: 'unconfigured' })

    render(await AccountLayout({ children: <p>Nội dung tủ đồ</p> }))

    expect(screen.queryByText('Nội dung tủ đồ')).not.toBeInTheDocument()
    expect(screen.getByText(/chưa có/i)).toBeInTheDocument()
    // AuthMenu tự ẩn hoàn toàn ở trạng thái unconfigured (Review Focus #1
    // gốc) — layout không được tự vẽ thêm một nút đăng nhập không chạy được.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
