import type { Category, Color, FashionItem, ItemAttribute, Outfit, Story, Style } from '@/types/content'
import type { StylistVocabulary } from '@/types/stylist'
import { categories } from './fixtures/categories'
import { colors } from './fixtures/colors'
import { items } from './fixtures/items'
import { outfits } from './fixtures/outfits'
import { stories } from './fixtures/stories'
import { styles } from './fixtures/styles'

export const allCategories: readonly Category[] = categories
export const allColors: readonly Color[] = colors
export const allItems: readonly FashionItem[] = items
export const allOutfits: readonly Outfit[] = outfits
export const allStories: readonly Story[] = stories
export const allStyles: readonly Style[] = styles

export async function getTrendingItems(): Promise<FashionItem[]> {
  return items.slice(0, 3)
}

export async function getEssentialItems(): Promise<FashionItem[]> {
  return items.slice(3, 7)
}

export async function getStyles(): Promise<Style[]> {
  return [...styles]
}

export async function getFeaturedLooks(): Promise<Outfit[]> {
  return [...outfits]
}

export async function getColorStory(): Promise<Color[]> {
  return [...colors]
}

export async function getFeaturedStories(): Promise<Story[]> {
  return stories.slice(0, 3)
}

export async function getItemBySlug(slug: string): Promise<FashionItem | undefined> {
  return items.find((item) => item.slug === slug)
}

export async function getCategories(): Promise<Category[]> {
  return [...categories]
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  return categories.find((category) => category.slug === slug)
}

export type RelatedOutfit = { outfit: Outfit; relation: 'contains-item' | 'same-style' }

export async function getOutfitsForStyle(styleSlug: string): Promise<Outfit[]> {
  return outfits.filter((outfit) => outfit.styleSlugs.includes(styleSlug))
}

export async function getRelatedOutfits(itemSlug: string): Promise<RelatedOutfit[]> {
  const direct = outfits
    .filter((outfit) => outfit.itemSlugs.includes(itemSlug))
    .map((outfit): RelatedOutfit => ({ outfit, relation: 'contains-item' }))

  if (direct.length >= 2) {
    return direct
  }

  const item = items.find((candidate) => candidate.slug === itemSlug)
  if (!item) {
    return direct
  }

  const includedSlugs = new Set(direct.map((related) => related.outfit.slug))
  const topUp: RelatedOutfit[] = []

  for (const outfit of outfits) {
    if (direct.length + topUp.length >= 2) {
      break
    }
    if (includedSlugs.has(outfit.slug)) {
      continue
    }
    const sharesStyle = outfit.styleSlugs.some((slug) => item.styleSlugs.includes(slug))
    if (sharesStyle) {
      includedSlugs.add(outfit.slug)
      topUp.push({ outfit, relation: 'same-style' })
    }
  }

  return [...direct, ...topUp]
}

export async function getItemsByCategory(categorySlug: string): Promise<FashionItem[]> {
  return items.filter((item) => item.category === categorySlug)
}

export async function getStyleBySlug(slug: string): Promise<Style | undefined> {
  return styles.find((style) => style.slug === slug)
}

export async function getItemsForStyle(styleSlug: string): Promise<FashionItem[]> {
  return items.filter((item) => item.styleSlugs.includes(styleSlug))
}

export async function getColorsForItem(itemSlug: string): Promise<Color[]> {
  const item = items.find((candidate) => candidate.slug === itemSlug)
  if (!item) {
    return []
  }
  return item.colorSlugs
    .map((slug) => colors.find((color) => color.slug === slug))
    .filter((color): color is Color => color !== undefined)
}

export async function getStylesForItem(itemSlug: string): Promise<Style[]> {
  const item = items.find((candidate) => candidate.slug === itemSlug)
  if (!item) {
    return []
  }
  return item.styleSlugs
    .map((slug) => styles.find((style) => style.slug === slug))
    .filter((style): style is Style => style !== undefined)
}

export async function getItemsForOutfit(outfitSlug: string): Promise<FashionItem[]> {
  const outfit = outfits.find((candidate) => candidate.slug === outfitSlug)
  if (!outfit) {
    return []
  }
  return outfit.itemSlugs
    .map((slug) => items.find((item) => item.slug === slug))
    .filter((item): item is FashionItem => item !== undefined)
}

export async function getAvoidOptions(): Promise<ItemAttribute[]> {
  const present = new Set<ItemAttribute>()
  for (const item of items) {
    for (const attribute of item.attributes) {
      present.add(attribute)
    }
  }
  return [...present].sort()
}

export async function getStylistVocabulary(): Promise<StylistVocabulary> {
  return {
    styles: styles.map((style) => ({ slug: style.slug, name: style.name, tagline: style.tagline })),
    colors: colors.map((color) => ({ slug: color.slug, name: color.name })),
  }
}
