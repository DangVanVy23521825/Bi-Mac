import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CategoryItemRow } from '@/components/wardrobe/CategoryItemRow'
import { allItems } from '@/data'
import CategoryPage from './[category]/page'
import WardrobePage from './page'

describe('trang tủ đồ', () => {
  it('trang tủ đồ cho mỗi category một link', async () => {
    render(await WardrobePage())
    expect(screen.getByRole('link', { name: /Váy liền/ })).toHaveAttribute(
      'href',
      '/wardrobe/dresses',
    )
  })
})

describe('trang category', () => {
  it('trang category render cả 3 item, mỗi item một link tới trang chi tiết', async () => {
    render(await CategoryPage({ params: Promise.resolve({ category: 'dresses' }) }))
    expect(screen.getByRole('link', { name: /Shirt dress/ })).toHaveAttribute(
      'href',
      '/wardrobe/dresses/shirt-dress',
    )
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })
})

describe('CategoryItemRow', () => {
  it('hàng item so le theo chỉ số chẵn/lẻ', () => {
    const item = allItems.find((candidate) => candidate.slug === 'shirt-dress') ?? allItems[0]
    if (!item) {
      throw new Error('fixture item không tồn tại')
    }
    const { container } = render(<CategoryItemRow item={item} index={1} />)
    expect(container.querySelector('[data-offset="1"]')).not.toBeNull()
  })
})
