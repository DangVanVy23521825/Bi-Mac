import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: vi.fn() }))

import { OutfitLook } from './OutfitLook'
import type { Outfit } from '@/types/content'

const outfit: Outfit = {
  slug: 'look-cuoi-tuan',
  name: 'Look cuối tuần',
  whyItWorks: 'Thoải mái mà vẫn chỉn chu.',
  image: null,
  itemSlugs: [],
  styleSlugs: [],
  occasions: ['casual'],
}

describe('OutfitLook', () => {
  it('không truyền `save`: không render control lưu nào — đúng hành vi hiện tại của trang chủ', () => {
    render(<OutfitLook outfit={outfit} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('có `save`: render SaveButton và gọi đúng onToggle với slug của outfit', async () => {
    const onToggle = vi.fn().mockResolvedValue({ ok: true, saved: true })

    render(
      <OutfitLook
        outfit={outfit}
        save={{ initialSaved: false, isSignedIn: true, onToggle }}
      />,
    )

    const button = screen.getByRole('button', { name: /lưu vào tủ đồ của tôi/i })
    await userEvent.click(button)

    expect(onToggle).toHaveBeenCalledWith('look-cuoi-tuan')
    expect(await screen.findByRole('button', { name: /đã lưu/i })).toBeInTheDocument()
  })

  it('có `save` nhưng chưa đăng nhập: dẫn đi đăng nhập, không gọi onToggle', async () => {
    const onToggle = vi.fn()

    render(
      <OutfitLook
        outfit={outfit}
        save={{ initialSaved: false, isSignedIn: false, onToggle }}
      />,
    )

    expect(screen.getByRole('button', { name: /đăng nhập để lưu/i })).toBeInTheDocument()
    expect(onToggle).not.toHaveBeenCalled()
  })
})
