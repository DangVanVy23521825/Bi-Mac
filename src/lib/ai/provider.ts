// StylistProvider contract. This module may import from
// `src/types/stylist.ts` and `zod` only — see §7 of the architecture doc:
// `src/lib/ai/` must never import `@/data` or catalog *entity* types
// (`FashionItem`, `Style`, `Color`, `Outfit` from `@/types/content`). That is
// why `AnalyzeRequest`/`ExplainRequest` carry flat `vocabulary`/`outfits`
// data passed in by the caller instead of reaching for catalog entities
// directly. `StylistAnswers` is imported from `@/types/stylist` rather than
// redefined here — `Occasion`/`Fit`/`ItemAttribute` are shared vocabulary,
// not catalog entities, so they live there (content.ts re-exports them).

import type { OutfitDescriptor, StylistAnswers, StylistVocabulary } from '@/types/stylist'
import type { StylistAnalysis, StylistExplanation } from './schema'

export type { StylistAnswers }

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

// Runtime call control, deliberately kept separate from `AnalyzeRequest`/
// `ExplainRequest`: those two are flat data that crosses the `src/lib/ai/`
// boundary and gets logged/compared/serialized in tests; an `AbortSignal`
// is neither data nor something that boundary cares about, so it travels
// as a second, optional argument instead of a request field.
export type StylistCallOptions = {
  // When the caller (the pipeline's timeout race) gives up on a call, it
  // aborts this signal too — without it, `withTimeout` in pipeline.ts only
  // stops *waiting* on the promise; the underlying `generateText` request
  // to Gemini keeps running (and being billed for) to completion. Only
  // `GeminiStylistProvider` forwards this to the SDK; the deterministic
  // provider has nothing async worth cancelling.
  signal?: AbortSignal
}

export type StylistProvider = {
  readonly id: 'gemini' | 'deterministic'
  analyze(req: AnalyzeRequest, opts?: StylistCallOptions): Promise<StylistAnalysis>
  explain(req: ExplainRequest, opts?: StylistCallOptions): Promise<StylistExplanation>
}
