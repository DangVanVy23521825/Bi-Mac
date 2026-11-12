// Gemini GarmentTagger — the production tagger, used when
// GOOGLE_GENERATIVE_AI_API_KEY is present. This module may import from
// `src/types/stylist.ts`, `./tagger`, `./model`, `./prompts`, `ai`, and
// `@ai-sdk/google` only — same boundary as `gemini.ts` (see its header
// and §7 of the architecture doc): `src/lib/ai/` must never import
// `@/data` or catalog entity types from `@/types/content`.
//
// `deps.generate` is injectable for the same reason as `gemini.ts`: no
// test here ever calls the network, every test passes a `vi.fn()` in
// place of `generateText`. This file never reads
// `GOOGLE_GENERATIVE_AI_API_KEY` itself — `@ai-sdk/google` reads that —
// and it never logs the photo bytes: `req.photo.data` is only ever
// placed into the message part sent to `generate`.
//
// Unlike `AnalyzeRequest`, `TagRequest.photo` is required, not optional —
// there is no garment-tagging call without a photo — so the file part is
// always attached, with no "no photo" branch to maintain.

import { google } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { resolveModelId } from './model'
import { GARMENT_TAG_SYSTEM_PROMPT } from './prompts'
import { garmentTagSchema, type GarmentTag, type GarmentTagger, type TagRequest } from './tagger'
import type { StylistCallOptions } from './provider'

type GenerateFn = typeof generateText

type GeminiTaggerDeps = {
  generate?: GenerateFn
}

type TextPart = { type: 'text'; text: string }
type FilePart = { type: 'file'; mediaType: string; data: Uint8Array }
type UserContentPart = TextPart | FilePart

function buildTagContent(req: TagRequest): UserContentPart[] {
  return [
    {
      type: 'text',
      text: JSON.stringify({ vocabulary: req.vocabulary }),
    },
    {
      type: 'file',
      mediaType: req.photo.mediaType,
      data: req.photo.data,
    },
  ]
}

async function tag(
  req: TagRequest,
  generate: GenerateFn,
  signal: AbortSignal | undefined,
): Promise<GarmentTag> {
  const schema = garmentTagSchema(req.vocabulary)

  const result = await generate({
    model: google(resolveModelId()),
    system: GARMENT_TAG_SYSTEM_PROMPT,
    output: Output.object({ schema }),
    messages: [
      {
        role: 'user',
        content: buildTagContent(req),
      },
    ],
    // Same reasoning as `analyze`/`explain` in `gemini.ts`: forwarded so a
    // caller that has given up on this call actually stops the request,
    // instead of leaving it running (and billing) after moving on to the
    // deterministic fallback.
    abortSignal: signal,
  })

  // `Output.object` already enforces the schema at the API layer, but we
  // parse again here on purpose — same reasoning as `gemini.ts`: nothing
  // unvalidated may reach the caller. A `parse` failure throws, which is
  // correct — the caller falls back to `createDeterministicTagger()`
  // instead of writing a fabricated category/color/style into the draft.
  return schema.parse(result.output)
}

export function createGeminiTagger(deps: GeminiTaggerDeps = {}): GarmentTagger {
  const generate = deps.generate ?? generateText

  return {
    id: 'gemini',
    tag: (req, opts?: StylistCallOptions) => tag(req, generate, opts?.signal),
  }
}
