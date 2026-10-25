// Occasion/Fit/ItemAttribute are shared vocabulary with `src/lib/ai` (via
// `src/features/stylist`), so they are defined in `src/types/stylist.ts`
// (which has zero imports) and re-exported here rather than duplicated.
import type { Fit, ItemAttribute, Occasion } from './stylist'

export type { Occasion, Fit, ItemAttribute }

export type CategorySlug = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'

export type Color = { slug: string; name: string; hex: string }

export type Category = { slug: CategorySlug; name: string; intro: string }

export type FashionItem = {
  slug: string
  name: string
  category: CategorySlug
  excerpt: string
  image: string | null
  colorSlugs: string[]
  styleSlugs: string[]
  occasions: Occasion[]
  fit: Fit | null
  attributes: ItemAttribute[]
  whatItIs: string
  characteristics: string[]
  howToStyle: string
  whatToAvoid: string
}

export type Style = {
  slug: string
  name: string
  tagline: string
  image: string | null
  colorSlugs: string[]
  paragraphs: string[]
  outfitFormulas: string[]
}

export type Outfit = {
  slug: string
  name: string
  whyItWorks: string
  image: string | null
  itemSlugs: string[]
  styleSlugs: string[]
  occasions: Occasion[]
}

export type Story = {
  slug: string
  title: string
  excerpt: string
  image: string | null
}
