// RankableItem — the narrow slice of fields `rankItems` (see `rank.ts`)
// actually reads to hard-filter (avoid, occasion) and score (style, color,
// fit) a garment. Any shape carrying exactly these fields can be ranked —
// a catalog `FashionItem` or a user's own `PersonalItem` alike — which is
// what lets both kinds go through the same ranker honestly.
//
// Deliberately does not widen to match `FashionItem`: that type carries
// editorial prose (`whatItIs`, `howToStyle`, `whatToAvoid`, `excerpt`,
// `characteristics`) that a photo of someone's own garment does not have,
// and fabricating it for a personal item would be dishonest.
import type { Fit, ItemAttribute, Occasion } from '@/types/stylist'

export type RankableItem = {
  slug: string
  colorSlugs: readonly string[]
  styleSlugs: readonly string[]
  occasions: readonly Occasion[]
  fit: Fit | null
  attributes: readonly ItemAttribute[]
}

// PersonalItem — a user's own photographed garment (`ClosetItem`, see
// `src/types/closet.ts`), reduced to what the ranker needs plus the display
// fields the Stylist result UI shows for it. `slug` is inherited from
// `RankableItem` and carries the closet item's id — there is no separate
// `id` field here; callers that need to show/store an id read `slug`.
export type PersonalItem = RankableItem & {
  name: string
  image: string | null
  note: string | null
}
