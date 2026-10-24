import { describe, expect, it } from 'vitest'
import { allCategories, allItems } from '@/data'

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
