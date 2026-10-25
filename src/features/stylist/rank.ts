// rankOutfits / rankItems — turns a resolved analysis plus the user's answers
// into the concrete outfits/items the Stylist shows. Avoid and occasion are
// hard filters, not score penalties: an outfit/item that fails either is
// removed entirely, never merely ranked lower (see §"two hard filters" in
// the Task 11 brief — this is the product promise behind `/stylist`'s copy
// about avoids).
//
// Pure and synchronous: no I/O, no env reads, no reach into `src/data`. The
// caller supplies the catalog, which is what makes this testable against a
// small hand-built catalog instead of the full 15-item one, and keeps the
// grounding testable without a model.

import type { FashionItem, Outfit } from '@/types/content'
import type { Occasion, StylistAnswers } from '@/types/stylist'
import type { ResolvedAnalysis, StylistCatalog } from './resolve'

const STYLE_WEIGHT = 3
const COLOR_WEIGHT = 2
const FIT_WEIGHT = 1
const OCCASION_WEIGHT = 1

export type RankedOutfit = {
  outfit: Outfit
  score: number
  matchedStyleSlugs: string[]
  matchedColorSlugs: string[]
  matchedOccasions: Occasion[]
}

function bySlugAscending(a: { slug: string }, b: { slug: string }): number {
  if (a.slug < b.slug) return -1
  if (a.slug > b.slug) return 1
  return 0
}

function intersect<T>(a: readonly T[], b: readonly T[]): T[] {
  const bSet = new Set(b)
  return a.filter((value) => bSet.has(value))
}

export function rankOutfits(
  analysis: ResolvedAnalysis,
  answers: StylistAnswers,
  catalog: StylistCatalog,
  limit = 3,
): RankedOutfit[] {
  const itemBySlug = new Map(catalog.items.map((item) => [item.slug, item]))
  const affinityByStyleSlug = new Map(
    analysis.styleDirections.map((direction) => [direction.style.slug, direction.affinity]),
  )
  const paletteSlugs = new Set(analysis.palette.map((entry) => entry.color.slug))
  const avoidSet = new Set(answers.avoids)

  const ranked: RankedOutfit[] = []

  for (const outfit of catalog.outfits) {
    const outfitItems = outfit.itemSlugs
      .map((slug) => itemBySlug.get(slug))
      .filter((item): item is FashionItem => item !== undefined)

    // Hard filter 1: avoid is an exclusion, not a score penalty.
    const hasAvoidedAttribute = outfitItems.some((item) =>
      item.attributes.some((attribute) => avoidSet.has(attribute)),
    )
    if (hasAvoidedAttribute) continue

    // Hard filter 2: occasion must intersect the user's selection.
    const matchedOccasions = intersect(outfit.occasions, answers.occasions)
    if (matchedOccasions.length === 0) continue

    const matchedStyleSlugs = outfit.styleSlugs.filter((slug) => affinityByStyleSlug.has(slug))
    const styleScore =
      STYLE_WEIGHT *
      matchedStyleSlugs.reduce((sum, slug) => sum + (affinityByStyleSlug.get(slug) ?? 0), 0)

    // Colors come from the outfit's items, not the outfit itself (`Outfit`
    // has no `colorSlugs`). Count distinct colors, not per-item occurrences.
    const outfitColorSlugs = new Set(outfitItems.flatMap((item) => item.colorSlugs))
    const matchedColorSlugs = [...outfitColorSlugs].filter((slug) => paletteSlugs.has(slug))
    const colorScore = COLOR_WEIGHT * matchedColorSlugs.length

    // `answers.fitPreference` can be `'unsure'`, which is never a valid
    // `Fit`, so this naturally contributes 0 without a special case — and
    // items with `fit: null` never match either.
    const fitScore =
      FIT_WEIGHT * outfitItems.filter((item) => item.fit === answers.fitPreference).length

    const occasionScore = OCCASION_WEIGHT * matchedOccasions.length

    ranked.push({
      outfit,
      score: styleScore + colorScore + fitScore + occasionScore,
      matchedStyleSlugs,
      matchedColorSlugs,
      matchedOccasions,
    })
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return bySlugAscending(a.outfit, b.outfit)
  })

  return ranked.slice(0, limit)
}

export function rankItems(
  analysis: ResolvedAnalysis,
  answers: StylistAnswers,
  catalog: StylistCatalog,
  limit = 5,
): FashionItem[] {
  const affinityByStyleSlug = new Map(
    analysis.styleDirections.map((direction) => [direction.style.slug, direction.affinity]),
  )
  const paletteSlugs = new Set(analysis.palette.map((entry) => entry.color.slug))
  const avoidSet = new Set(answers.avoids)

  const scored: Array<{ item: FashionItem; score: number }> = []

  for (const item of catalog.items) {
    // Hard filter 1: avoid.
    const hasAvoidedAttribute = item.attributes.some((attribute) => avoidSet.has(attribute))
    if (hasAvoidedAttribute) continue

    // Hard filter 2: occasion.
    const matchedOccasions = intersect(item.occasions, answers.occasions)
    if (matchedOccasions.length === 0) continue

    const matchedStyleSlugs = item.styleSlugs.filter((slug) => affinityByStyleSlug.has(slug))
    const styleScore =
      STYLE_WEIGHT *
      matchedStyleSlugs.reduce((sum, slug) => sum + (affinityByStyleSlug.get(slug) ?? 0), 0)

    const matchedColorSlugs = new Set(item.colorSlugs.filter((slug) => paletteSlugs.has(slug)))
    const colorScore = COLOR_WEIGHT * matchedColorSlugs.size

    const fitScore = item.fit === answers.fitPreference ? FIT_WEIGHT : 0

    scored.push({ item, score: styleScore + colorScore + fitScore })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return bySlugAscending(a.item, b.item)
  })

  return scored.slice(0, limit).map((entry) => entry.item)
}
