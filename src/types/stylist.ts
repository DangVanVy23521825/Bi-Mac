// Flat, catalog-agnostic vocabulary shared between `src/data` and `src/lib/ai`.
// Deliberately has zero imports — see §7 of the architecture doc:
// `src/lib/ai` must never know about catalog *entities* (`Style`, `Color`,
// `FashionItem`, `Outfit`) or import `src/data`. `Occasion`/`Fit`/
// `ItemAttribute` below are not entities — they are shared string-literal
// vocabulary, so they live here and `src/types/content.ts` re-exports them
// (dependency points content.ts -> stylist.ts, never the other way).

export type StylistVocabulary = {
  styles: Array<{ slug: string; name: string; tagline: string }>
  colors: Array<{ slug: string; name: string }>
}

export type OutfitDescriptor = {
  slug: string
  name: string
  itemNames: string[]
  colorNames: string[]
  styleNames: string[]
}

// `OCCASIONS` is the one place this value exists. `Occasion` is derived
// from it, not the other way around, so every mirror below (the Zod enum
// in `src/features/stylist/input.ts`, the checkbox order in
// `Questionnaire.tsx`, the fixture-coverage tests in `catalog.test.ts` and
// `rank.test.ts`) can import the array instead of re-typing its members.
// A `Record<Occasion, …>` (e.g. `OCCASION_LABEL`, `OCCASION_STYLE`) stays
// exhaustive under `tsc` on its own and does not need this — only the
// *plain arrays* silently fell behind on an addition (renames were
// already caught: `tsc` flags a key that no longer exists).
export const OCCASIONS = ['work', 'school', 'casual', 'date', 'event'] as const
export type Occasion = (typeof OCCASIONS)[number]
export type Fit = 'fitted' | 'relaxed' | 'oversized'
export type ItemAttribute =
  | 'sleeveless' | 'sheer' | 'clingy' | 'structured-shoulder'
  | 'cropped' | 'high-heel' | 'short-hem' | 'bright-color'

export type StylistAnswers = {
  occasions: Occasion[]
  fitPreference: Fit | 'unsure'
  avoids: ItemAttribute[]
  goal: 'style' | 'outfits' | 'colors' | 'wardrobe-refresh'
}
