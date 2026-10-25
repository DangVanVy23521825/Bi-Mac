import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('trang chủ', () => {
  it('render đủ tám khối theo docs/02', async () => {
    render(await Home())

    for (const heading of [
      'Đang được mặc nhiều',
      'Bảng màu của mùa',
      'Những món làm nền cho tủ đồ',
      'Outfit gợi ý',
      'Hướng style nào giống bạn?',
      'Không biết bắt đầu từ đâu?',
      'Đọc thêm',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }

    expect(
      screen.getByRole('heading', { level: 1, name: /sắc trung tính mới/ }),
    ).toBeInTheDocument()
  })

  it('CTA stylist trỏ sang /stylist', async () => {
    render(await Home())
    expect(screen.getByRole('link', { name: 'Thử AI phối đồ' })).toHaveAttribute('href', '/stylist')
  })

  it('thẻ style ở homepage trỏ tới đúng style, không trỏ về index', async () => {
    render(await Home())
    expect(screen.getByRole('link', { name: /Quiet Luxury/ })).toHaveAttribute(
      'href',
      '/styles/quiet-luxury',
    )
  })
})
