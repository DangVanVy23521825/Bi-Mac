// GarmentTagger contract. This module may import from
// `src/types/stylist.ts`, `./provider`, and `zod` only — see §7 of the
// architecture doc and the header comment of `provider.ts`:
// `src/lib/ai/` must never import `@/data` or catalog *entity* types
// (`FashionItem`, `Style`, `Color`, `Outfit`, `CategorySlug`) from
// `@/types/content`. That is why `GarmentCategory` below is its own
// literal union instead of an import of `CategorySlug` — the two must
// have the same value set, but that is enforced by a test
// (`tagger.test.ts`), not by a shared declaration, because a shared
// declaration would have to live on the forbidden side of the boundary.
// That test pins the two together with a
// `Record<CategorySlug, GarmentCategory>`, so drift in either direction —
// a member added on the catalog side, or removed/renamed here — is a
// `tsc` error, not something a runtime comparison of two hand-written
// lists might miss.
//
// `TagRequest` follows the same shape as `AnalyzeRequest`/`ExplainRequest`
// in `provider.ts`: flat data the caller assembles from catalog entities
// before it crosses into `src/lib/ai/`, never a catalog entity itself.

import { z } from 'zod'
import { OCCASIONS, type Fit, type ItemAttribute, type Occasion, type StylistVocabulary } from '@/types/stylist'
import type { StylistCallOptions, StylistPhoto } from './provider'

// Mirrors `CategorySlug` in `src/types/content.ts` value-for-value. Cannot
// import it (forbidden side of the boundary — see module header), so this
// is its own declaration; `tagger.test.ts` asserts the two never drift.
export type GarmentCategory = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'

export type GarmentTag = {
  name: string
  category: GarmentCategory
  colorSlugs: string[]
  styleSlugs: string[]
  occasions: Occasion[]
  fit: Fit | null
  attributes: ItemAttribute[]
  note: string | null
}

export type TagRequest = {
  photo: StylistPhoto
  vocabulary: StylistVocabulary
}

export type GarmentTagger = {
  readonly id: 'gemini' | 'deterministic'
  tag(req: TagRequest, opts?: StylistCallOptions): Promise<GarmentTag>
}

// Sibling of `STYLIST_TIMEOUT_MS`-style constants elsewhere in the
// pipeline (see `src/features/stylist/pipeline.ts`): the timeout a later
// task's caller races this tagger against before falling back to
// `createDeterministicTagger()`. Defined here, next to the contract it
// times out, not in the caller.
export const TAGGER_TIMEOUT_MS = 20_000

const categoryValues: [GarmentCategory, ...GarmentCategory[]] = [
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'accessories',
]

const fitValues: [Fit, ...Fit[]] = ['fitted', 'relaxed', 'oversized']

// Same avoid-exclusion vocabulary as `src/features/closet/schema.ts` and
// `src/features/stylist/input.ts` (ADR-016) — kept as its own literal
// here rather than imported from either, same reasoning as those two:
// `ItemAttribute` is the shared source both lists are checked against, so
// `tsc` catches a member rename even though the list itself is repeated.
const itemAttributeValues: [ItemAttribute, ...ItemAttribute[]] = [
  'sleeveless',
  'sheer',
  'clingy',
  'structured-shoulder',
  'cropped',
  'high-heel',
  'short-hem',
  'bright-color',
]

/**
 * Builds the `GarmentTag` schema for one tagging call. `colorSlugs` and
 * `styleSlugs` are validated against `vocabulary` — the caller's actual
 * color/style lists — rather than a static enum, because `src/lib/ai/`
 * has no catalog import to hard-code them against (see module header).
 * A slug outside `vocabulary` is rejected, not coerced or dropped: the
 * model may not invent a color or style that doesn't exist, and a reject
 * here is what sends the caller to the deterministic fallback instead of
 * silently keeping a fabricated value.
 */
export function garmentTagSchema(vocabulary: StylistVocabulary): z.ZodType<GarmentTag> {
  const colorSlugSet = new Set(vocabulary.colors.map((color) => color.slug))
  const styleSlugSet = new Set(vocabulary.styles.map((style) => style.slug))

  return z.object({
    name: z.string().min(1),
    category: z.enum(categoryValues),
    colorSlugs: z
      .array(z.string())
      .refine((slugs) => slugs.every((slug) => colorSlugSet.has(slug))),
    styleSlugs: z
      .array(z.string())
      .refine((slugs) => slugs.every((slug) => styleSlugSet.has(slug))),
    occasions: z.array(z.enum(OCCASIONS)),
    fit: z.enum(fitValues).nullable(),
    attributes: z.array(z.enum(itemAttributeValues)),
    note: z.string().nullable(),
  })
}
