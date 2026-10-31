import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { ClosetItemCard } from './ClosetItemCard'
import type { ClosetItem } from '@/types/closet'

const item: ClosetItem = {
  id: 'item-1',
  userId: 'u1',
  name: 'Áo sơ mi trắng',
  imagePath: 'u1/raw-path-ao.jpg',
  category: 'tops',
  colorSlugs: ['kem'],
  styleSlugs: ['modern-classic'],
  occasions: ['work'],
  fit: 'fitted',
  attributes: [],
  note: null,
  labelSource: 'ai',
  createdAt: '2026-10-01T00:00:00.000Z',
}

describe('ClosetItemCard', () => {
  it('hiện ảnh bằng signed URL, không bằng đường dẫn thô', () => {
    const signedUrl = 'https://supabase.example.com/storage/v1/object/sign/closet/u1/raw-path-ao.jpg?token=abc'
    render(
      <ClosetItemCard item={item} imageUrl={signedUrl} index={0} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    )

    const image = screen.getByRole('img', { name: item.name })
    expect(image).toHaveAttribute('src', signedUrl)
    expect(image.getAttribute('src')).not.toBe(item.imagePath)
  })

  it('hỏi xác nhận trước khi xoá', async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true })
    render(
      <ClosetItemCard
        item={item}
        imageUrl="https://example.com/signed.jpg"
        index={0}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^Xoá$/i }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText(/Xoá.*khỏi tủ đồ/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Xác nhận xoá/i }))
    expect(onDelete).toHaveBeenCalledWith(item.id)
  })
})
