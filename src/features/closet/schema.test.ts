import { describe, expect, it } from 'vitest'
import { allColors, allStyles } from '@/data'
import { closetItemDraftSchema } from './schema'

function validDraft() {
  return {
    name: 'Áo sơ mi trắng',
    imagePath: 'user-1/ao-so-mi.jpg',
    category: 'tops' as const,
    colorSlugs: [allColors[0]!.slug],
    styleSlugs: [allStyles[0]!.slug],
    occasions: ['work' as const],
    fit: null,
    attributes: [],
    note: null,
    labelSource: 'user' as const,
  }
}

describe('closetItemDraftSchema', () => {
  it('chấp nhận một draft hợp lệ', () => {
    const result = closetItemDraftSchema.safeParse(validDraft())
    expect(result.success).toBe(true)
  })

  it('từ chối category không có trong CategorySlug', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      category: 'shoes',
    })
    expect(result.success).toBe(false)
  })

  it('từ chối màu không có trong fixtures', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      colorSlugs: ['mau-khong-ton-tai'],
    })
    expect(result.success).toBe(false)
  })

  it('từ chối phong cách không có trong fixtures', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      styleSlugs: ['style-khong-ton-tai'],
    })
    expect(result.success).toBe(false)
  })

  it('từ chối occasion không hợp lệ', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      occasions: ['tiec-tung'],
    })
    expect(result.success).toBe(false)
  })

  it('từ chối attribute không hợp lệ', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      attributes: ['ren'],
    })
    expect(result.success).toBe(false)
  })

  it('chấp nhận fit null', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      fit: null,
    })
    expect(result.success).toBe(true)
  })

  it('từ chối fit không hợp lệ', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      fit: 'skinny',
    })
    expect(result.success).toBe(false)
  })

  it('từ chối tên rỗng', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      name: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('từ chối labelSource không hợp lệ', () => {
    const result = closetItemDraftSchema.safeParse({
      ...validDraft(),
      labelSource: 'robot',
    })
    expect(result.success).toBe(false)
  })
})
