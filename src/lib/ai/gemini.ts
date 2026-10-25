// Gemini StylistProvider — the production provider, used when
// GOOGLE_GENERATIVE_AI_API_KEY is present. This module may import from
// `src/types/stylist.ts`, `./provider`, `./schema`, `./model`, `./prompts`,
// `ai`, and `@ai-sdk/google` only — see §7 of the architecture doc:
// `src/lib/ai/` must never import `@/data` or catalog entity types
// (`FashionItem`, `Style`, `Color`, `Outfit`) from `@/types/content`.
//
// `deps.generate` is injectable precisely so no test here ever calls the
// network: every test passes a `vi.fn()` in place of `generateText`. This
// file never reads `GOOGLE_GENERATIVE_AI_API_KEY` — `@ai-sdk/google` reads
// that itself — and it never logs the user's photo bytes: `req.photo.data`
// is only ever placed into the message part sent to `generate`, never
// passed to `console.*` or any other logging path.

import { google } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { resolveModelId } from './model'
import { ANALYSIS_SYSTEM_PROMPT, EXPLAIN_SYSTEM_PROMPT } from './prompts'
import type { AnalyzeRequest, ExplainRequest, StylistCallOptions, StylistProvider } from './provider'
import { stylistAnalysisSchema, stylistExplanationSchema } from './schema'
import type { StylistAnalysis, StylistExplanation } from './schema'

type GenerateFn = typeof generateText

type GeminiProviderDeps = {
  generate?: GenerateFn
}

type TextPart = { type: 'text'; text: string }
type FilePart = { type: 'file'; mediaType: string; data: Uint8Array }
type UserContentPart = TextPart | FilePart

function buildAnalyzeContent(req: AnalyzeRequest): UserContentPart[] {
  const parts: UserContentPart[] = [
    {
      type: 'text',
      text: JSON.stringify({
        answers: req.answers,
        vocabulary: req.vocabulary,
      }),
    },
  ]

  if (req.photo) {
    parts.push({
      type: 'file',
      mediaType: req.photo.mediaType,
      data: req.photo.data,
    })
  }

  return parts
}

function buildExplainContent(req: ExplainRequest): UserContentPart[] {
  return [
    {
      type: 'text',
      text: JSON.stringify({
        answers: req.answers,
        vocabulary: req.vocabulary,
        outfits: req.outfits,
      }),
    },
  ]
}

async function analyze(
  req: AnalyzeRequest,
  generate: GenerateFn,
  signal: AbortSignal | undefined,
): Promise<StylistAnalysis> {
  const result = await generate({
    model: google(resolveModelId()),
    system: ANALYSIS_SYSTEM_PROMPT,
    output: Output.object({ schema: stylistAnalysisSchema }),
    messages: [
      {
        role: 'user',
        content: buildAnalyzeContent(req),
      },
    ],
    // Forwarded from the pipeline's timeout race (see `withTimeout` in
    // `src/features/stylist/pipeline.ts`) so a request that has already
    // been given up on actually stops — otherwise the call to Gemini
    // keeps running, and being billed for, after the caller moved on to
    // the deterministic fallback.
    abortSignal: signal,
  })

  // `Output.object` already enforces the schema at the API layer, but we
  // parse again here on purpose: a provider-side change, a partial
  // response, or a future SDK behaviour change could let something
  // malformed through, and nothing unvalidated may reach the pipeline
  // above. A `parse` failure here throws, which is correct — the caller
  // falls back to the deterministic provider.
  return stylistAnalysisSchema.parse(result.output)
}

async function explain(
  req: ExplainRequest,
  generate: GenerateFn,
  signal: AbortSignal | undefined,
): Promise<StylistExplanation> {
  const result = await generate({
    model: google(resolveModelId()),
    system: EXPLAIN_SYSTEM_PROMPT,
    output: Output.object({ schema: stylistExplanationSchema }),
    messages: [
      {
        role: 'user',
        content: buildExplainContent(req),
      },
    ],
    // Same reasoning as `analyze` above.
    abortSignal: signal,
  })

  return stylistExplanationSchema.parse(result.output)
}

export function createGeminiProvider(deps: GeminiProviderDeps = {}): StylistProvider {
  const generate = deps.generate ?? generateText

  return {
    id: 'gemini',
    analyze: (req, opts?: StylistCallOptions) => analyze(req, generate, opts?.signal),
    explain: (req, opts?: StylistCallOptions) => explain(req, generate, opts?.signal),
  }
}
