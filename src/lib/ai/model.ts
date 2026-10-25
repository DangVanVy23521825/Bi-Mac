// Model id resolution for the Gemini StylistProvider. This module may
// import from `src/types/stylist.ts` and `zod` only — see §7 of the
// architecture doc: `src/lib/ai/` must never import `@/data` or catalog
// entity types from `@/types/content`.
//
// This file never reads `GOOGLE_GENERATIVE_AI_API_KEY` — the `@ai-sdk/google`
// package reads that itself. The only environment access here is
// `BIMAC_STYLIST_MODEL`, and it is read through a parameter rather than a
// bare `process.env` reference inside the function body, so the resolver
// stays fully testable without mutating global state.

// Newest stable (non-preview) flash-tier model confirmed against the
// Generative Language API's `models.list` response for this project's key
// (see task-12 brief: query run 2026-10-25). `BIMAC_STYLIST_MODEL` is the
// escape hatch if multimodal input misbehaves on this model for a later
// end-to-end task — switching providers then needs no code change.
export const DEFAULT_MODEL_ID = 'gemini-3.8-flash'

export function resolveModelId(env: NodeJS.ProcessEnv = process.env): string {
  return env.BIMAC_STYLIST_MODEL ?? DEFAULT_MODEL_ID
}
