// StylistInput schema — the request shape accepted at the AI Stylist route
// boundary. This module sits on the catalog side of §7's boundary and may
// import `Occasion`/`Fit`/`ItemAttribute` from `src/types/content.ts`.
// The photo is never stored: it is validated here, sent to a provider in
// `src/lib/ai/`, and discarded — no path, no URL, no id.

import { z } from 'zod'
import type { Fit, ItemAttribute, Occasion } from '@/types/content'

const occasionValues: [Occasion, ...Occasion[]] = ['work', 'school', 'casual', 'date', 'event']
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
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.instanceof(Uint8Array),
})

export const stylistAnswersSchema = z.object({
  occasions: z.array(z.enum(occasionValues)).min(1),
  fitPreference: z.union([z.enum(fitValues), z.literal('unsure')]),
  avoids: z.array(z.enum(itemAttributeValues)).default([]),
  goal: z.enum(['style', 'outfits', 'colors', 'wardrobe-refresh']),
})

export type StylistAnswers = {
  occasions: Occasion[]
  fitPreference: Fit | 'unsure'
  avoids: ItemAttribute[]
  goal: 'style' | 'outfits' | 'colors' | 'wardrobe-refresh'
}

export const stylistInputSchema = z.object({
  answers: stylistAnswersSchema,
  photo: photoSchema.optional(),
})

export type StylistInput = {
  answers: StylistAnswers
  photo?: { mediaType: string; data: Uint8Array }
}
