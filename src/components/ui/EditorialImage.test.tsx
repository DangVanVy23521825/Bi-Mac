import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorialImage } from './EditorialImage'

describe('EditorialImage', () => {
  it('render img khi có src', () => {
    render(<EditorialImage src="/images/items/so-mi-trang.jpg" alt="Sơ mi trắng" ratio="look" />)
    expect(screen.getByAltText('Sơ mi trắng')).toBeInTheDocument()
  })

  it('render khối placeholder khi src là null, và không có img', () => {
    const { container } = render(<EditorialImage src={null} alt="Sơ mi trắng" ratio="look" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-placeholder="true"]')).toBeInTheDocument()
  })

  it('placeholder bị ẩn khỏi trình đọc màn hình vì nó chỉ là trang trí', () => {
    const { container } = render(<EditorialImage src={null} alt="Sơ mi trắng" ratio="look" />)
    expect(container.querySelector('[data-placeholder="true"]')).toHaveAttribute('aria-hidden', 'true')
  })
})
