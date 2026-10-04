import { describe, expect, it } from 'vitest'
import { NAV, isActive } from './nav'

describe('NAV', () => {
  it('có đúng 5 mục theo docs/02', () => {
    expect(NAV.map((i) => i.label)).toEqual([
      'Trang chủ', 'Tủ đồ', 'AI phối đồ', 'Phối theo style', 'Tủ đồ của tôi',
    ])
  })
})

describe('isActive', () => {
  it('trang chủ chỉ active khi pathname đúng bằng /', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/wardrobe', '/')).toBe(false)
  })

  it('active cho trang con', () => {
    expect(isActive('/wardrobe/tops/so-mi-trang', '/wardrobe')).toBe(true)
  })

  it('không active do trùng tiền tố — /styles không được sáng khi đang ở /stylist', () => {
    expect(isActive('/stylist', '/styles')).toBe(false)
    expect(isActive('/styles', '/stylist')).toBe(false)
  })
})
