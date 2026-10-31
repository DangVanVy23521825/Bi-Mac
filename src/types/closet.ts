// ClosetItem — a user's own photographed garment, distinct from the
// catalog `FashionItem` in `src/types/content.ts`. It deliberately reuses
// the exact same vocabulary types (`CategorySlug`, `Occasion`, `Fit`,
// `ItemAttribute`) that `FashionItem` uses, so a closet item and a catalog
// item stay mutually comparable — Task 11 (grounding the AI Stylist in a
// user's own wardrobe) depends on that, not on two parallel vocabularies
// that happen to look alike.
//
// `colorSlugs`/`styleSlugs` stay plain `string[]`, matching
// `supabase/migrations/0001_account_and_closet.sql`'s choice not to put a
// check constraint on those two columns: they are fixture-backed slugs
// validated at the app layer (`closetItemDraftSchema`), not a closed
// union baked into the database.
//
// The database stores these fields snake_case (`image_path`, `color_slugs`,
// `label_source`, …); this type is camelCase. The mapping between the two
// shapes lives in one place only — `src/features/closet/repository.ts` —
// nowhere else should know the DB's column names.

import type { CategorySlug } from './content'
import type { Fit, ItemAttribute, Occasion } from './stylist'

export type LabelSource = 'ai' | 'user'

export type ClosetItem = {
  id: string
  userId: string
  name: string
  imagePath: string
  category: CategorySlug
  colorSlugs: string[]
  styleSlugs: string[]
  occasions: Occasion[]
  fit: Fit | null
  attributes: ItemAttribute[]
  note: string | null
  labelSource: LabelSource
  createdAt: string
}

export type ClosetItemDraft = Omit<ClosetItem, 'id' | 'userId' | 'createdAt'>
