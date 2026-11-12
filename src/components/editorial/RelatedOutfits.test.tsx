import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: vi.fn() }))

import { RelatedOutfits } from './RelatedOutfits'
import type { RelatedOutfit } from '@/data'
import type { Outfit } from '@/types/content'

function outfit(overrides: Partial<Outfit> = {}): Outfit {
  return {
    slug: 'look-a',
    name: 'Look A',
    whyItWorks: 'Hợp vì...',
    image: null,
    itemSlugs: [],
    styleSlugs: [],
    occasions: ['casual'],
    ...overrides,
  }
}

describe('RelatedOutfits', () => {
  it('không truyền `save`: không render control lưu nào trên bất kỳ look nào', () => {
    const related: RelatedOutfit[] = [{ outfit: outfit(), relation: 'contains-item' }]

    render(<RelatedOutfits related={related} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('có `save`: mỗi look nhận đúng initialSaved theo savedSlugs của chính nó, không phải chung một giá trị', async () => {
    const onToggle = vi.fn().mockResolvedValue({ ok: true, saved: true })
    const related: RelatedOutfit[] = [
      { outfit: outfit({ slug: 'look-a', name: 'Look A' }), relation: 'contains-item' },
      { outfit: outfit({ slug: 'look-b', name: 'Look B' }), relation: 'same-style' },
    ]

    render(
      <RelatedOutfits
        related={related}
        save={{ isSignedIn: true, onToggle, savedSlugs: new Set(['look-a']) }}
      />,
    )

    // look-a đã lưu -> nút hiện "Đã lưu"; look-b chưa lưu -> nút hiện "Lưu".
    expect(screen.getAllByRole('button', { name: /đã lưu/i })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /lưu vào tủ đồ của tôi/i })).toHaveLength(1)
  })
})
