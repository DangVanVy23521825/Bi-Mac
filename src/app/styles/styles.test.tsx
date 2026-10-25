import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StyleDetailPage from './[slug]/page'
import StylesPage from './page'

describe('trang styles', () => {
  it('trang styles cho mỗi style một link tới trang chi tiết', async () => {
    render(await StylesPage())
    expect(screen.getByRole('link', { name: /Quiet Luxury/ })).toHaveAttribute(
      'href',
      '/styles/quiet-luxury',
    )
  })

  // Fix wave review item 8: mỗi thẻ style từng bọc trong một <Link> trần,
  // không có <article> — mất landmark so với CategoryItemRow (dùng ở
  // trang category), nơi <article> bọc ngoài và <Link> chỉ bọc phần nội
  // dung bấm được. Test này khoá đúng số landmark khớp số style.
  it('mỗi style là một landmark article, khớp CategoryItemRow', async () => {
    render(await StylesPage())
    expect(screen.getAllByRole('article').length).toBe(5)
  })
})

describe('trang style detail', () => {
  it('render palette, item chủ chốt, công thức phối và look', async () => {
    render(await StyleDetailPage({ params: Promise.resolve({ slug: 'minimalist' }) }))
    for (const heading of [/Bảng màu/, /Món chủ chốt/, /Công thức phối/, /Look mẫu/]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('item chủ chốt link tới trang item thật', async () => {
    render(await StyleDetailPage({ params: Promise.resolve({ slug: 'minimalist' }) }))
    expect(screen.getByRole('link', { name: /Quần âu/ })).toHaveAttribute(
      'href',
      '/wardrobe/bottoms/quan-au',
    )
  })

  it('có CTA sang AI phối đồ', async () => {
    render(await StyleDetailPage({ params: Promise.resolve({ slug: 'minimalist' }) }))
    expect(screen.getByRole('link', { name: /AI phối đồ/ })).toHaveAttribute('href', '/stylist')
  })

  it('404 khi slug style không tồn tại', async () => {
    await expect(StyleDetailPage({
      params: Promise.resolve({ slug: 'khong-ton-tai' }),
    })).rejects.toThrow()
  })
})
