import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ItemDetailPage from './page'

describe('trang item detail', () => {
  it('render đủ 8 khối nội dung của trang item', async () => {
    render(await ItemDetailPage({
      params: Promise.resolve({ category: 'tops', slug: 'so-mi-trang' }),
    }))
    for (const heading of [
      /Là gì/, /Đặc điểm/, /Phối thế nào/, /Nên tránh/,
      /Style phù hợp/, /Dịp mặc/, /Màu đi cùng/, /Look có món này/,
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('404 khi category trong URL không khớp category thật của item', async () => {
    await expect(ItemDetailPage({
      params: Promise.resolve({ category: 'tops', slug: 'blazer' }),
    })).rejects.toThrow()
  })

  it('404 khi slug không tồn tại', async () => {
    await expect(ItemDetailPage({
      params: Promise.resolve({ category: 'tops', slug: 'khong-ton-tai' }),
    })).rejects.toThrow()
  })

  it('luôn có ít nhất 2 look liên quan, kể cả với váy liền', async () => {
    render(await ItemDetailPage({
      params: Promise.resolve({ category: 'dresses', slug: 'slip-dress' }),
    }))
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThanOrEqual(2)
  })
})
