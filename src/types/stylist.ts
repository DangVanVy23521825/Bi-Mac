// Flat, catalog-agnostic vocabulary shared between `src/data` and `src/lib/ai`.
// Deliberately does NOT import from `src/types/content.ts` — see §7 of the
// architecture doc: `src/lib/ai` must never know about `Style`, `Color`, or
// `FashionItem`. Only plain strings cross this boundary.

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
