import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseBrowserClient } = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient }))

import { AuthMenu } from './AuthMenu'

describe('AuthMenu', () => {
  beforeEach(() => {
    createSupabaseBrowserClient.mockReset()
  })

  it('không hiện nút đăng nhập khi Supabase chưa cấu hình', () => {
    render(<AuthMenu authState={{ status: 'unconfigured' }} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('hiện nút đăng nhập bằng Google khi đã đăng xuất', () => {
    render(<AuthMenu authState={{ status: 'signed-out' }} />)
    expect(screen.getByRole('button', { name: /đăng nhập bằng google/i })).toBeInTheDocument()
  })

  it('hiện nút đăng xuất khi đã đăng nhập', () => {
    render(<AuthMenu authState={{ status: 'signed-in', displayName: 'Vy Nguyễn' }} />)
    expect(screen.getByRole('button', { name: /đăng xuất/i })).toBeInTheDocument()
    expect(screen.getByText('Vy Nguyễn')).toBeInTheDocument()
  })

  it('bấm đăng nhập gọi signInWithOAuth với provider google', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null })
    createSupabaseBrowserClient.mockReturnValue({ auth: { signInWithOAuth } })

    render(<AuthMenu authState={{ status: 'signed-out' }} />)
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập bằng google/i }))

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    )
  })
})
