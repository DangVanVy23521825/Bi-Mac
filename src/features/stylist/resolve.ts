// resolveAnalysis — the central invariant of the AI Stylist design: "the model
// proposes, the catalog decides." A model's StylistAnalysis carries slugs it
// invented; this function keeps only the slugs that resolve to real catalog
// entities and attaches the entity itself, so no downstream code can ever
// render an unresolved slug (it never holds one). This module stays on the
// catalog side of the §7 boundary: it may import from `src/lib/ai/` (for
// `StylistAnalysis`) and from `src/types/content.ts` (for catalog entities),
// but `src/lib/ai/` must never import anything from here or from the catalog.
//
// Pure and synchronous: no I/O, no env reads, no reach into `src/data`. The
// caller supplies the catalog, which is what makes this testable against a
// small hand-built catalog instead of the full 15-item one.

import type { StylistAnalysis } from '@/lib/ai/schema'
import type { Color, FashionItem, Outfit, Style } from '@/types/content'

export type StylistCatalog = {
  items: readonly FashionItem[]
  outfits: readonly Outfit[]
  styles: readonly Style[]
  colors: readonly Color[]
}

export type ResolvedAnalysis = {
  styleDirections: Array<{ style: Style; affinity: number; reason: string }>
  palette: Array<{ color: Color; reason: string }>
  notes: string[]
  droppedSlugs: string[]
}

export function resolveAnalysis(analysis: StylistAnalysis, catalog: StylistCatalog): ResolvedAnalysis {
  const droppedSlugs: string[] = []

  const styleBySlug = new Map(catalog.styles.map((style) => [style.slug, style]))
  const colorBySlug = new Map(catalog.colors.map((color) => [color.slug, color]))

  const highestAffinityByStyleSlug = new Map<string, { style: Style; affinity: number; reason: string }>()
  for (const direction of analysis.styleDirections) {
    const style = styleBySlug.get(direction.styleSlug)
    if (!style) {
      droppedSlugs.push(direction.styleSlug)
      continue
    }
    const existing = highestAffinityByStyleSlug.get(direction.styleSlug)
    if (!existing || direction.affinity > existing.affinity) {
      highestAffinityByStyleSlug.set(direction.styleSlug, {
        style,
        affinity: direction.affinity,
        reason: direction.reason,
      })
    }
  }

  const styleDirections = [...highestAffinityByStyleSlug.values()].sort((a, b) => {
    if (b.affinity !== a.affinity) {
      return b.affinity - a.affinity
    }
    // Ordinal, not `localeCompare` — `rank.ts`'s `bySlugAscending` ties
    // the exact same slugs this way, and `localeCompare` with no explicit
    // locale depends on the runtime's ICU locale, which would let the two
    // tie-break the same slugs differently depending on where the server
    // runs. Slugs are ASCII (kebab-case), so ordinal `<`/`>` is also just
    // simpler.
    if (a.style.slug < b.style.slug) return -1
    if (a.style.slug > b.style.slug) return 1
    return 0
  })

  const seenColorSlugs = new Set<string>()
  const palette: Array<{ color: Color; reason: string }> = []
  for (const entry of analysis.palette) {
    const color = colorBySlug.get(entry.colorSlug)
    if (!color) {
      droppedSlugs.push(entry.colorSlug)
      continue
    }
    if (seenColorSlugs.has(entry.colorSlug)) {
      continue
    }
    seenColorSlugs.add(entry.colorSlug)
    palette.push({ color, reason: entry.reason })
  }

  return {
    styleDirections,
    palette,
    notes: [...analysis.notes],
    droppedSlugs,
  }
}
