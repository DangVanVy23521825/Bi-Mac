// StylistInput schema — the request shape accepted at the AI Stylist route
// boundary. This module sits on the catalog side of §7's boundary and may
// import `Occasion`/`Fit`/`ItemAttribute` (and `StylistAnswers`, built from
// them) from `src/types/stylist.ts` — the single shared definition used on
// both sides of the `src/lib/ai/` boundary.
// The photo is never stored: it is validated here, sent to a provider in
// `src/lib/ai/`, and discarded — no path, no URL, no id.

import { z } from 'zod'
import { OCCASIONS, type Fit, type ItemAttribute, type StylistAnswers } from '@/types/stylist'
import { ALLOWED_PHOTO_TYPES } from './photo-limits'

// `OCCASIONS` (a const array, not just the `Occasion` type) is imported
// so adding a member there is enough to widen this schema too — a plain
// re-typed array here would have silently stayed narrow (see
// `src/types/stylist.ts`'s comment on why this one had to move).
const fitValues: [Fit, ...Fit[]] = ['fitted', 'relaxed', 'oversized']
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

const photoSchema = z.object({
  mediaType: z.enum(ALLOWED_PHOTO_TYPES),
  data: z.instanceof(Uint8Array),
})

export const stylistAnswersSchema = z.object({
  occasions: z.array(z.enum(OCCASIONS)).min(1),
  fitPreference: z.union([z.enum(fitValues), z.literal('unsure')]),
  avoids: z.array(z.enum(itemAttributeValues)).default([]),
  goal: z.enum(['style', 'outfits', 'colors', 'wardrobe-refresh']),
})

export type { StylistAnswers }

export const stylistInputSchema = z.object({
  answers: stylistAnswersSchema,
  photo: photoSchema.optional(),
})

export type StylistInput = {
  answers: StylistAnswers
  photo?: { mediaType: string; data: Uint8Array }
}
