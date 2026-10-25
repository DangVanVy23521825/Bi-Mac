// Zod schemas for AI Stylist model output. This module may import from
// `src/types/stylist.ts` and `zod` only — see §7 of the architecture doc:
// `src/lib/ai/` must never import `@/data` or `@/types/content`.

import { z } from 'zod'

export const styleDirectionSchema = z.object({
  styleSlug: z.string().min(1),
  affinity: z.number().min(0).max(1),
  reason: z.string().min(1),
})

export const paletteEntrySchema = z.object({
  colorSlug: z.string().min(1),
  reason: z.string().min(1),
})

export const stylistAnalysisSchema = z.object({
  styleDirections: z.array(styleDirectionSchema).max(3),
  palette: z.array(paletteEntrySchema).max(5),
  notes: z.array(z.string().min(1)).max(4),
})

export type StylistAnalysis = z.infer<typeof stylistAnalysisSchema>

export const outfitExplanationSchema = z.object({
  outfitSlug: z.string().min(1),
  whyThisWorks: z.string().min(1),
})

export const stylistExplanationSchema = z.object({
  outfits: z.array(outfitExplanationSchema),
})

export type StylistExplanation = z.infer<typeof stylistExplanationSchema>
