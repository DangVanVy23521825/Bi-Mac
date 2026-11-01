import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseBrowserClient } = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
}))
vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient }))

import { SaveButton } from './SaveButton'

describe('SaveButton', () => {
  beforeEach(() => {
    createSupabaseBrowserClient.mockReset()
  })

  it('chưa đăng nhập: dẫn đi đăng nhập, không ẩn control đi', () => {
    render(<SaveButton slug="ao-lua" initialSaved={false} isSignedIn={false} onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: /đăng nhập để lưu/i })).toBeInTheDocument()
  })

  it('chưa đăng nhập: bấm nút gọi signInWithOAuth bằng Google, không gọi onToggle', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null })
    createSupabaseBrowserClient.mockReturnValue({ auth: { signInWithOAuth } })
    const onToggle = vi.fn()

    render(<SaveButton slug="ao-lua" initialSaved={false} isSignedIn={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập để lưu/i }))

    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('đã đăng nhập, chưa lưu: hiện nút lưu, bấm vào gọi onToggle rồi chuyển sang trạng thái đã lưu', async () => {
    const onToggle = vi.fn().mockResolvedValue({ ok: true, saved: true })

    render(<SaveButton slug="ao-lua" initialSaved={false} isSignedIn={true} onToggle={onToggle} />)

    const button = screen.getByRole('button', { name: /lưu vào tủ đồ của tôi/i })
    await userEvent.click(button)

    expect(onToggle).toHaveBeenCalledWith('ao-lua')
    expect(await screen.findByRole('button', { name: /đã lưu/i })).toBeInTheDocument()
  })

  it('đã đăng nhập, đang lưu sẵn: bấm vào bỏ lưu, chuyển lại về trạng thái chưa lưu', async () => {
    const onToggle = vi.fn().mockResolvedValue({ ok: true, saved: false })

    render(<SaveButton slug="ao-lua" initialSaved={true} isSignedIn={true} onToggle={onToggle} />)

    const button = screen.getByRole('button', { name: /đã lưu/i })
    await userEvent.click(button)

    expect(onToggle).toHaveBeenCalledWith('ao-lua')
    expect(await screen.findByRole('button', { name: /lưu vào tủ đồ của tôi/i })).toBeInTheDocument()
  })

  it('onToggle báo lỗi thì hiện lỗi, không âm thầm đổi trạng thái đã lưu', async () => {
    const onToggle = vi.fn().mockResolvedValue({ ok: false, error: 'Không thể lưu lựa chọn này. Vui lòng thử lại.' })

    render(<SaveButton slug="ao-lua" initialSaved={false} isSignedIn={true} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /lưu vào tủ đồ của tôi/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu lựa chọn này')
    expect(screen.getByRole('button', { name: /lưu vào tủ đồ của tôi/i })).toBeInTheDocument()
  })
})
