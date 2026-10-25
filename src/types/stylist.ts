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

export type Occasion = 'work' | 'school' | 'casual' | 'date' | 'event'
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
