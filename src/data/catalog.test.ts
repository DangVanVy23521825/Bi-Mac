import { describe, expect, it } from 'vitest'
import { allCategories, allItems, allOutfits, getRelatedOutfits } from '@/data'
import { OCCASIONS } from '@/types/stylist'

describe('khối lượng catalog v1', () => {
  it('có đúng 15 item', () => {
    expect(allItems.length).toBe(15)
  })

  it('mỗi category có đúng 3 item', () => {
    for (const category of allCategories) {
      const count = allItems.filter((i) => i.category === category.slug).length
      expect(count, `category ${category.slug}`).toBe(3)
    }
  })

  it('mọi item có nội dung dài, không để trống', () => {
    for (const item of allItems) {
      expect(item.whatItIs.length, `item ${item.slug}`).toBeGreaterThan(80)
      expect(item.howToStyle.length, `item ${item.slug}`).toBeGreaterThan(120)
      expect(item.whatToAvoid.length, `item ${item.slug}`).toBeGreaterThan(80)
      expect(item.characteristics.length, `item ${item.slug}`).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('ràng buộc suất outfit', () => {
  it('có đúng 10 outfit', () => {
    expect(allOutfits.length).toBe(10)
  })

  it('mọi item nằm trong ít nhất một outfit', () => {
    const used = new Set(allOutfits.flatMap((o) => o.itemSlugs))
    for (const item of allItems) {
      expect(used, `item ${item.slug}`).toContain(item.slug)
    }
  })

  it('mọi item có ít nhất 2 outfit liên quan để hiển thị', async () => {
    for (const item of allItems) {
      const related = await getRelatedOutfits(item.slug)
      expect(related.length, `item ${item.slug}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('outfit chứa trực tiếp được xếp trước outfit cùng style', async () => {
    const related = await getRelatedOutfits('slip-dress')
    expect(related[0]!.relation).toBe('contains-item')
    expect(related.some((r) => r.relation === 'same-style')).toBe(true)
  })

  it('mọi dịp mặc có ít nhất 2 outfit', () => {
    for (const occasion of OCCASIONS) {
      const count = allOutfits.filter((o) => o.occasions.includes(occasion)).length
      expect(count, `dịp ${occasion}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('không trả outfit trùng lặp', async () => {
    for (const item of allItems) {
      const slugs = (await getRelatedOutfits(item.slug)).map((r) => r.outfit.slug)
      expect(new Set(slugs).size, `item ${item.slug}`).toBe(slugs.length)
    }
  })
})
