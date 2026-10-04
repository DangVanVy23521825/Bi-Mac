import type { Color, FashionItem, Outfit, Story, Style } from '@/types/content'
import { colors } from './fixtures/colors'
import { items } from './fixtures/items'
import { outfits } from './fixtures/outfits'
import { stories } from './fixtures/stories'
import { styles } from './fixtures/styles'

export const allColors: readonly Color[] = colors
export const allItems: readonly FashionItem[] = items
export const allOutfits: readonly Outfit[] = outfits
export const allStories: readonly Story[] = stories
export const allStyles: readonly Style[] = styles

export async function getTrendingItems(): Promise<FashionItem[]> {
  return items.slice(0, 3)
}

export async function getEssentialItems(): Promise<FashionItem[]> {
  return items.slice(0, 4)
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
