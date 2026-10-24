import { describe, expect, it } from 'vitest'
import {
  allCategories, allColors, allItems, allOutfits, allStyles,
  getItemBySlug, getFeaturedStories,
} from '@/data'

describe('repository', () => {
  it('trả về undefined cho slug không tồn tại', async () => {
    expect(await getItemBySlug('khong-ton-tai')).toBeUndefined()
  })

  it('trả về đúng item theo slug', async () => {
    const item = await getItemBySlug('so-mi-trang')
    expect(item?.name).toBe('Sơ mi trắng')
  })

  it('trả về tối đa 3 story', async () => {
    expect((await getFeaturedStories()).length).toBeLessThanOrEqual(3)
  })
})

describe('toàn vẹn tham chiếu fixture', () => {
  const colorSlugs = new Set(allColors.map((c) => c.slug))
  const styleSlugs = new Set(allStyles.map((s) => s.slug))
  const itemSlugs = new Set(allItems.map((i) => i.slug))

  it('mọi colorSlug của item đều tồn tại', () => {
    for (const item of allItems) {
      for (const slug of item.colorSlugs) {
        expect(colorSlugs, `item ${item.slug}`).toContain(slug)
      }
    }
  })

  it('mọi styleSlug của item đều tồn tại', () => {
    for (const item of allItems) {
      for (const slug of item.styleSlugs) {
        expect(styleSlugs, `item ${item.slug}`).toContain(slug)
      }
    }
  })

  it('mọi itemSlug của outfit đều tồn tại', () => {
    for (const outfit of allOutfits) {
      for (const slug of outfit.itemSlugs) {
        expect(itemSlugs, `outfit ${outfit.slug}`).toContain(slug)
      }
    }
  })

  it('mọi styleSlug của outfit đều tồn tại', () => {
    for (const outfit of allOutfits) {
      for (const slug of outfit.styleSlugs) {
        expect(styleSlugs, `outfit ${outfit.slug}`).toContain(slug)
      }
    }
  })

  it('mọi colorSlug của style đều tồn tại', () => {
    for (const style of allStyles) {
      for (const slug of style.colorSlugs) {
        expect(colorSlugs, `style ${style.slug}`).toContain(slug)
      }
    }
  })

  it('không có slug trùng trong cùng một tập', () => {
    expect(new Set(allItems.map((i) => i.slug)).size).toBe(allItems.length)
    expect(new Set(allStyles.map((s) => s.slug)).size).toBe(allStyles.length)
  })
})

describe('metadata xếp hạng', () => {
  it('mọi item có ít nhất một dịp mặc', () => {
    for (const item of allItems) {
      expect(item.occasions.length, `item ${item.slug}`).toBeGreaterThan(0)
    }
  })

  it('mọi item ngoài phụ kiện đều có fit', () => {
    for (const item of allItems.filter((i) => i.category !== 'accessories')) {
      expect(item.fit, `item ${item.slug}`).not.toBeNull()
    }
  })

  it('phụ kiện không có fit', () => {
    for (const item of allItems.filter((i) => i.category === 'accessories')) {
      expect(item.fit, `item ${item.slug}`).toBeNull()
    }
  })

  it('mọi outfit có ít nhất một dịp mặc', () => {
    for (const outfit of allOutfits) {
      expect(outfit.occasions.length, `outfit ${outfit.slug}`).toBeGreaterThan(0)
    }
  })

  it('mọi category của item đều là category đã khai báo', () => {
    const slugs = new Set(allCategories.map((c) => c.slug))
    for (const item of allItems) {
      expect(slugs, `item ${item.slug}`).toContain(item.category)
    }
  })

  it('mọi style có nội dung dài và công thức phối', () => {
    for (const style of allStyles) {
      expect(style.paragraphs.length, `style ${style.slug}`).toBeGreaterThanOrEqual(2)
      expect(style.outfitFormulas.length, `style ${style.slug}`).toBe(3)
    }
  })
})
