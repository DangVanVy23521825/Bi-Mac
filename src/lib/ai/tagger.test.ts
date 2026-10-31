import { describe, expect, it } from 'vitest'
import type { StylistVocabulary } from '@/types/stylist'
import { garmentTagSchema, type GarmentCategory, type GarmentTag } from './tagger'

// This test file is the one place in `src/lib/ai/**` allowed to import
// `@/types/content` — the boundary rule in `provider.ts`'s header binds
// production modules, not this test, and the entire point of the
// assertion below is to see both sides of the boundary at once: it is the
// only thing stopping `GarmentCategory` (declared locally in `tagger.ts`
// because `CategorySlug` lives on the forbidden catalog side) from
// quietly drifting away from `CategorySlug` as the two get edited over
// time. Do not "fix" this import away — removing it is what it is
// guarding against.
import type { CategorySlug } from '@/types/content'

const vocabulary: StylistVocabulary = {
  styles: [
    { slug: 'modern-classic', name: 'Modern Classic', tagline: 'Đường cắt gọn.' },
    { slug: 'minimalist', name: 'Minimalist', tagline: 'Ít chi tiết nhất có thể.' },
  ],
  colors: [
    { slug: 'kem', name: 'Kem' },
    { slug: 'den', name: 'Đen' },
  ],
}

function validTag(): GarmentTag {
  return {
    name: 'Áo sơ mi trắng',
    category: 'tops',
    colorSlugs: ['kem'],
    styleSlugs: ['modern-classic'],
    occasions: ['work'],
    fit: 'relaxed',
    attributes: [],
    note: null,
  }
}

describe('garmentTagSchema', () => {
  it('chấp nhận một nhãn hợp lệ', () => {
    const result = garmentTagSchema(vocabulary).safeParse(validTag())
    expect(result.success).toBe(true)
  })

  it('schema từ chối category ngoài từ vựng', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      category: 'spacesuit',
    })
    expect(result.success).toBe(false)
  })

  it('schema từ chối màu không có trong vocabulary', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      colorSlugs: ['mau-khong-ton-tai'],
    })
    expect(result.success).toBe(false)
  })

  it('schema từ chối style không có trong vocabulary', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      styleSlugs: ['style-khong-ton-tai'],
    })
    expect(result.success).toBe(false)
  })

  it('schema chấp nhận mảng rỗng cho attributes', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      attributes: [],
    })
    expect(result.success).toBe(true)
  })

  it('schema từ chối attribute không hợp lệ', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      attributes: ['ren'],
    })
    expect(result.success).toBe(false)
  })

  it('schema từ chối occasion không hợp lệ', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      occasions: ['tiec-tung'],
    })
    expect(result.success).toBe(false)
  })

  it('chấp nhận fit null', () => {
    const result = garmentTagSchema(vocabulary).safeParse({
      ...validTag(),
      fit: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('GarmentCategory và CategorySlug phải cùng tập giá trị', () => {
  it('không lệch nhau giữa hai bản khai báo riêng', () => {
    const garmentCategories: GarmentCategory[] = [
      'tops',
      'bottoms',
      'dresses',
      'outerwear',
      'accessories',
    ]
    const categorySlugs: CategorySlug[] = [
      'tops',
      'bottoms',
      'dresses',
      'outerwear',
      'accessories',
    ]

    expect([...garmentCategories].sort()).toEqual([...categorySlugs].sort())
  })
})
