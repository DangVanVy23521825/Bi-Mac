import { describe, expect, it } from 'vitest'
import {
  allColors, allItems, allOutfits, allStyles,
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

  it('không có slug trùng trong cùng một tập', () => {
    expect(new Set(allItems.map((i) => i.slug)).size).toBe(allItems.length)
    expect(new Set(allStyles.map((s) => s.slug)).size).toBe(allStyles.length)
  })
})
