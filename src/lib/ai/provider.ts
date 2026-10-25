// StylistProvider contract. This module may import from
// `src/types/stylist.ts` and `zod` only — see §7 of the architecture doc:
// `src/lib/ai/` must never import `@/data` or `@/types/content`. That is why
// `AnalyzeRequest`/`ExplainRequest` carry flat `vocabulary`/`outfits` data
// passed in by the caller instead of reaching for catalog entities directly.

import type { OutfitDescriptor, StylistVocabulary } from '@/types/stylist'
import type { StylistAnalysis, StylistExplanation } from './schema'

export type StylistAnswers = {
  occasions: string[]
  fitPreference: string
  avoids: string[]
  goal: 'style' | 'outfits' | 'colors' | 'wardrobe-refresh'
}

export type StylistPhoto = {
  mediaType: string
  data: Uint8Array
}

export type AnalyzeRequest = {
  answers: StylistAnswers
  photo?: StylistPhoto
  vocabulary: StylistVocabulary
}

export type ExplainRequest = {
  answers: StylistAnswers
  vocabulary: StylistVocabulary
  outfits: OutfitDescriptor[]
}

export type StylistProvider = {
  readonly id: 'gemini' | 'deterministic'
  analyze(req: AnalyzeRequest): Promise<StylistAnalysis>
  explain(req: ExplainRequest): Promise<StylistExplanation>
}
