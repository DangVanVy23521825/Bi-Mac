import { describe, expect, it } from 'vitest'
import { allColors, allItems, allOutfits, allStyles } from '@/data'
import type { FashionItem, Outfit } from '@/types/content'
import { OCCASIONS, type StylistAnswers } from '@/types/stylist'
import type { ResolvedAnalysis, StylistCatalog } from '@/features/stylist/resolve'
import { rankItems, rankOutfits } from '@/features/stylist/rank'

const catalog: StylistCatalog = {
  items: allItems,
  outfits: allOutfits,
  styles: allStyles,
  colors: allColors,
}

const itemBySlug = new Map(allItems.map((item) => [item.slug, item]))

function itemsOf(outfit: Outfit): FashionItem[] {
  return outfit.itemSlugs
    .map((slug) => itemBySlug.get(slug))
    .filter((item): item is FashionItem => item !== undefined)
}

const emptyAnalysis: ResolvedAnalysis = {
  styleDirections: [],
  palette: [],
  notes: [],
  droppedSlugs: [],
}

// Every style gets a non-zero affinity so style-matched outfits across the
// whole catalog score, and every color is in the palette so color scoring
// is exercised too. Used by tests that only care about the hard filters.
const analysisAll: ResolvedAnalysis = {
  styleDirections: allStyles.map((style) => ({ style, affinity: 0.5, reason: 'test' })),
  palette: allColors.map((color) => ({ color, reason: 'test' })),
  notes: [],
  droppedSlugs: [],
}

// One style weighted high (0.9), every other style weighted low (0.1), so
// that an outfit whose only style is `targetStyleSlug` clearly outranks
// outfits matching other styles.
function analysisWeighted(targetStyleSlug: string): ResolvedAnalysis {
  return {
    styleDirections: allStyles.map((style) => ({
      style,
      affinity: style.slug === targetStyleSlug ? 0.9 : 0.1,
      reason: 'test',
    })),
    palette: [],
    notes: [],
    droppedSlugs: [],
  }
}

function answers(overrides: Partial<StylistAnswers> = {}): StylistAnswers {
  return {
    occasions: [...OCCASIONS],
    fitPreference: 'unsure',
    avoids: [],
    goal: 'outfits',
    ...overrides,
  }
}

describe('rankOutfits', () => {
  it('loại hẳn outfit chứa item mang attribute bị tránh', () => {
    const ranked = rankOutfits(analysisAll, answers({ avoids: ['sleeveless'] }), catalog, 10)
    const slugs = ranked.map((r) => r.outfit.slug)
    expect(slugs).not.toContain('slip-dress-trench-buoi-toi')
    expect(slugs).not.toContain('a-line-dress-cardigan')
  })

  it('attribute bị tránh không bao giờ xuất hiện trong kết quả', () => {
    const ranked = rankOutfits(analysisAll, answers({ avoids: ['structured-shoulder'] }), catalog, 10)
    for (const r of ranked) {
      for (const item of itemsOf(r.outfit)) {
        expect(item.attributes, `outfit ${r.outfit.slug}`).not.toContain('structured-shoulder')
      }
    }
  })

  it('loại outfit không khớp dịp mặc', () => {
    const ranked = rankOutfits(analysisAll, answers({ occasions: ['school'] }), catalog, 10)
    for (const r of ranked) expect(r.outfit.occasions).toContain('school')
  })

  it('mỗi dịp mặc đơn lẻ vẫn ra ít nhất 2 outfit', () => {
    for (const occasion of OCCASIONS) {
      const ranked = rankOutfits(analysisAll, answers({ occasions: [occasion] }), catalog, 10)
      expect(ranked.length, `dịp ${occasion}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('trả rỗng khi avoid loại hết, không throw', () => {
    const ranked = rankOutfits(
      analysisAll,
      answers({ occasions: ['date'], avoids: ['sleeveless', 'clingy', 'sheer'] }),
      catalog,
      10,
    )
    expect(ranked).toEqual([])
  })

  it('affinity cao hơn thì outfit cùng style được xếp trên', () => {
    const minimalistFirst = rankOutfits(analysisWeighted('minimalist'), answers(), catalog, 10)
    const classicFirst = rankOutfits(analysisWeighted('modern-classic'), answers(), catalog, 10)
    expect(minimalistFirst[0]!.outfit.slug).not.toBe(classicFirst[0]!.outfit.slug)
  })

  // Trước đây test này so `rankOutfits(X)` với `rankOutfits(X)` — cùng
  // input, không có cách nào fail dù 'unsure' có khớp mọi item hay không.
  // Thuộc tính thật cần giữ: 'unsure' không phải một `Fit` hợp lệ nên phải
  // góp đúng 0 điểm fit, giống hệt một `Fit` không món nào trong catalog
  // có (không item nào mang `fit: 'oversized'` — xem `src/data/fixtures
  // /items.ts`). Nếu implementation coi 'unsure' là khớp mọi item (bug mà
  // test này phải bắt được), điểm fit sẽ dương và kết quả hai bên lệch.
  it("fitPreference 'unsure' góp đúng 0 điểm fit, giống một Fit catalog không có món nào", () => {
    const unsure = rankOutfits(analysisAll, answers({ fitPreference: 'unsure' }), catalog, 10)
    const noMatch = rankOutfits(analysisAll, answers({ fitPreference: 'oversized' }), catalog, 10)
    expect(unsure).toEqual(noMatch)
  })

  it('điểm bằng nhau thì xếp theo slug', () => {
    const ranked = rankOutfits(emptyAnalysis, answers({ occasions: ['work'] }), catalog, 10)
    const slugs = ranked.map((r) => r.outfit.slug)
    expect(slugs).toEqual([...slugs].sort())
  })

  it('mặc định trả tối đa 3 outfit', () => {
    expect(rankOutfits(analysisAll, answers(), catalog).length).toBeLessThanOrEqual(3)
  })
})

describe('rankItems', () => {
  it('rankItems cũng loại cứng theo avoid', () => {
    const items = rankItems(analysisAll, answers({ avoids: ['sheer'] }), catalog, 20)
    expect(items.map((i) => i.slug)).not.toContain('ao-lua')
  })
})
