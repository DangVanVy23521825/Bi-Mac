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

  // Trước đây test này đếm heading cấp 3, nhưng `ItemFacts` luôn render
  // đúng 3 heading h3 ("Style phù hợp", "Dịp mặc", "Màu đi cùng") bất kể có
  // outfit liên quan nào hay không — test pass ngay cả khi không có một
  // look nào. Chỗ duy nhất trên trang render `<article>` là mỗi
  // `OutfitLook`, nên đếm role 'article' mới thật sự bám vào số look hiển
  // thị, không bám vào một phần nội dung không liên quan.
  it('luôn có ít nhất 2 look liên quan, kể cả với váy liền', async () => {
    render(await ItemDetailPage({
      params: Promise.resolve({ category: 'dresses', slug: 'slip-dress' }),
    }))
    expect(screen.getAllByRole('article').length).toBeGreaterThanOrEqual(2)
  })
})
