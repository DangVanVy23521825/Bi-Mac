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

// Review toàn nhánh, Important #6: khối `describe` ngay dưới đây viết tay
// cả hai mảng rồi so lúc chạy, nên nó KHÔNG bắt được chiều mà drift thật
// sự xảy ra. Thêm một thành viên thứ sáu vào `CategorySlug` thì cả hai
// mảng vẫn ở năm phần tử, cả hai vẫn typecheck (một array literal được
// phép chứa tập con của union), và phép so vẫn đậu — chỉ xoá hoặc đổi tên
// mới bị bắt. Nhưng `tagger.ts` lại gọi test này là "the only thing
// stopping `GarmentCategory` from quietly drifting".
//
// `Record<CategorySlug, GarmentCategory>` khoá được cả hai chiều, và khoá
// ở tầng biên dịch chứ không phải lúc chạy:
//  * key: `Record` đòi ĐỦ mọi thành viên của `CategorySlug` — thêm một
//    slug mới vào catalog mà không thêm vào `GarmentCategory` là lỗi
//    "property is missing" của `tsc`, ngay tại dòng này;
//  * value: mỗi giá trị phải là một `GarmentCategory` hợp lệ — bỏ một
//    thành viên khỏi `GarmentCategory` là lỗi gán, cũng ngay tại đây.
//
// Không cần assertion lúc chạy để bắt drift (đó là việc của `tsc`), nên
// phần `it` dưới đây đi thêm một bước nữa: mỗi category thật sự qua được
// `garmentTagSchema`. Thiếu bước đó, một thành viên mới có thể có mặt ở
// cả hai union mà vẫn bị schema của tagger từ chối lúc chạy.
const bothWays: Record<CategorySlug, GarmentCategory> = {
  tops: 'tops',
  bottoms: 'bottoms',
  dresses: 'dresses',
  outerwear: 'outerwear',
  accessories: 'accessories',
}

describe('GarmentCategory và CategorySlug khoá nhau hai chiều lúc biên dịch', () => {
  it('mọi CategorySlug đều là một GarmentCategory mà garmentTagSchema chấp nhận', () => {
    const slugs = Object.keys(bothWays) as CategorySlug[]
    expect(slugs.length).toBeGreaterThan(0)

    for (const slug of slugs) {
      const result = garmentTagSchema(vocabulary).safeParse({
        ...validTag(),
        category: bothWays[slug],
      })
      expect(result.success, `category ${slug} bị garmentTagSchema từ chối`).toBe(true)
    }
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
