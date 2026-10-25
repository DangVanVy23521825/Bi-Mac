import { describe, expect, it } from 'vitest'
import type { Color, FashionItem, Outfit, Style } from '@/types/content'
import { resolveAnalysis, type StylistCatalog } from '@/features/stylist/resolve'

const styles: Style[] = [
  {
    slug: 'minimalist',
    name: 'Minimalist',
    tagline: 'Tối giản',
    image: null,
    colorSlugs: ['kem'],
    paragraphs: ['...'],
    outfitFormulas: ['...'],
  },
  {
    slug: 'quiet-luxury',
    name: 'Quiet Luxury',
    tagline: 'Sang trọng kín tiếng',
    image: null,
    colorSlugs: ['kem'],
    paragraphs: ['...'],
    outfitFormulas: ['...'],
  },
]

const colors: Color[] = [{ slug: 'kem', name: 'Kem', hex: '#F5F0E8' }]

const items: FashionItem[] = []
const outfits: Outfit[] = []

const catalog: StylistCatalog = { items, outfits, styles, colors }

describe('resolveAnalysis', () => {
  it('loại style slug không có trong catalog', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [
          { styleSlug: 'minimalist', affinity: 0.8, reason: 'a' },
          { styleSlug: 'dark-academia', affinity: 0.9, reason: 'b' },
        ],
        palette: [],
        notes: [],
      },
      catalog,
    )
    expect(resolved.styleDirections.map((d) => d.style.slug)).toEqual(['minimalist'])
    expect(resolved.droppedSlugs).toContain('dark-academia')
  })

  it('loại color slug không có trong catalog', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [],
        palette: [
          { colorSlug: 'neon-lime', reason: 'x' },
          { colorSlug: 'kem', reason: 'y' },
        ],
        notes: [],
      },
      catalog,
    )
    expect(resolved.palette.map((p) => p.color.slug)).toEqual(['kem'])
    expect(resolved.droppedSlugs).toContain('neon-lime')
  })

  it('trả rỗng khi mọi slug đều bịa, không throw', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [{ styleSlug: 'y2k', affinity: 0.9, reason: 'a' }],
        palette: [{ colorSlug: 'neon-lime', reason: 'b' }],
        notes: [],
      },
      catalog,
    )
    expect(resolved.styleDirections).toEqual([])
    expect(resolved.palette).toEqual([])
  })

  it('bỏ slug trùng, giữ bản có affinity cao nhất', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [
          { styleSlug: 'minimalist', affinity: 0.4, reason: 'a' },
          { styleSlug: 'minimalist', affinity: 0.9, reason: 'b' },
        ],
        palette: [],
        notes: [],
      },
      catalog,
    )
    expect(resolved.styleDirections).toHaveLength(1)
    const [first] = resolved.styleDirections
    expect(first!.affinity).toBe(0.9)
  })

  it('xếp hướng style theo affinity giảm dần', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [
          { styleSlug: 'minimalist', affinity: 0.3, reason: 'a' },
          { styleSlug: 'quiet-luxury', affinity: 0.9, reason: 'b' },
        ],
        palette: [],
        notes: [],
      },
      catalog,
    )
    expect(resolved.styleDirections.map((d) => d.style.slug)).toEqual(['quiet-luxury', 'minimalist'])
  })

  it('giữ nguyên notes', () => {
    const resolved = resolveAnalysis({ styleDirections: [], palette: [], notes: ['ghi chú'] }, catalog)
    expect(resolved.notes).toEqual(['ghi chú'])
  })

  it('affinity bằng nhau thì xếp theo slug để tất định', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [
          { styleSlug: 'quiet-luxury', affinity: 0.5, reason: 'a' },
          { styleSlug: 'minimalist', affinity: 0.5, reason: 'b' },
        ],
        palette: [],
        notes: [],
      },
      catalog,
    )
    expect(resolved.styleDirections.map((d) => d.style.slug)).toEqual(['minimalist', 'quiet-luxury'])
  })

  it('không rescale hay làm tròn affinity', () => {
    const resolved = resolveAnalysis(
      {
        styleDirections: [{ styleSlug: 'minimalist', affinity: 0.123456, reason: 'a' }],
        palette: [],
        notes: [],
      },
      catalog,
    )
    const [first] = resolved.styleDirections
    expect(first!.affinity).toBe(0.123456)
  })
})
