// POST /api/stylist — the HTTP boundary for the AI Stylist. This is the
// only place in the product where untrusted input arrives; everything
// downstream (the pipeline, the providers, the ranker) assumes validated
// input, so the guarantees are established here and nowhere else.
//
// Validation order is a security property, not a style choice — check in
// this exact order so a junk or oversized request is rejected without
// consuming server memory or the caller's rate-limit quota:
//   1. photo mediaType                 → 415
//   2. photo size (before reading bytes) → 413
//   3. answers parses as JSON + schema  → 400
//   4. rate limits (per-IP, then daily) → degrade, never 429
//
// Exceeding a rate limit (or missing an API key) never produces an error
// response: the pipeline runs with `primary: null`, which forces the
// deterministic provider, and the response says so via `degradedReason`.
// The product's rule is that it stays usable and tells the truth about
// which path ran.
//
// The response is NDJSON in two stages, deliberately not token streaming:
// the AI SDK's own docs note that partial outputs streamed via
// `streamText` cannot be validated against a schema, so token streaming
// would push unvalidated catalog slugs to the browser. The two stages are
// genuinely staged, not just two JSON objects written back-to-back after
// the whole pipeline finishes: `runStylist` takes an `onAnalysis` hook
// (see pipeline.ts) fired right after resolve+rank, before `explain` (the
// second model call) even starts. The `ReadableStream` below is built
// *before* `runStylist` runs, the `analysis` line is enqueued from inside
// that hook, and the `result` line is enqueued only once the whole
// pipeline promise resolves — so a caller reading the stream really does
// get the first line while the second model call is still in flight.
//
// ADR-012: user photos are never stored and never logged. Received in the
// request, forwarded to a provider, discarded. Nothing here ever passes
// the parsed input, the `File`, or its bytes into `console.*` or an
// `Error` message — only slugs, counts, or short reason strings.
//
// Runtime stays the Node.js default — do not set `runtime = 'edge'`.
// Streaming works fine on Node, and Edge is deprecated on this platform.

import { allColors, allItems, allOutfits, allStyles } from '@/data'
import { stylistInputSchema, type StylistInput } from '@/features/stylist/input'
import { runStylist, type DegradedReason, type StylistDeps } from '@/features/stylist/pipeline'
import type { StylistCatalog } from '@/features/stylist/resolve'
import { createDeterministicProvider } from '@/lib/ai/deterministic'
import { createGeminiProvider } from '@/lib/ai/gemini'
import { createMemoryRateLimiter } from '@/lib/rate-limit'

export const MAX_PHOTO_BYTES = 4_000_000
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PER_IP_LIMIT = 5
export const PER_IP_WINDOW_MS = 600_000
export const DAILY_LIMIT = 200
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000
export const STYLIST_TIMEOUT_MS = 12_000

const catalog: StylistCatalog = {
  items: allItems,
  outfits: allOutfits,
  styles: allStyles,
  colors: allColors,
}

// Module-level singletons so the sliding window persists across requests
// for the lifetime of the server process — that is the entire point of a
// rate limiter. See `src/lib/rate-limit/index.ts` for the known
// per-instance limitation on a multi-instance platform.
const perIpLimiter = createMemoryRateLimiter({ limit: PER_IP_LIMIT, windowMs: PER_IP_WINDOW_MS })
const dailyLimiter = createMemoryRateLimiter({ limit: DAILY_LIMIT, windowMs: DAILY_WINDOW_MS })
const DAILY_KEY = 'global'

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// `x-forwarded-for` may carry a comma-separated chain; the first entry is
// the original client. Falls back to 'unknown' when the header is absent.
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (!forwarded) {
    return 'unknown'
  }
  const first = forwarded.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

function isAllowedPhotoType(value: string): value is (typeof ALLOWED_PHOTO_TYPES)[number] {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(value)
}

// Duck-types rather than `instanceof File`: a `FormData` decoded from a
// parsed multipart body can hand back a file-like object constructed by
// the runtime's own multipart parser, which is not guaranteed to be the
// same `File` class identity as `globalThis.File` in every environment
// (observed under Vitest's jsdom test environment, where jsdom patches
// `File`/`Blob` separately from the Node fetch internals that decode the
// request body) — checking for the shape a File actually needs (`type`,
// `size`, `arrayBuffer`) is correct in every realm, not just a test-only
// workaround.
function isFileLike(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as File).arrayBuffer === 'function' &&
    typeof (value as File).type === 'string' &&
    typeof (value as File).size === 'number'
  )
}

// Builds the two-stage NDJSON stream. `input`/`deps` are passed through
// rather than a finished `StylistOutcome`, because there is no finished
// outcome yet when this stream starts — `runStylist` is kicked off *inside*
// `start()`, and the `analysis` line is written from the `onAnalysis` hook
// while `explain` (the second model call) is still running. The `result`
// line is written only when the pipeline promise settles.
//
// `degradedReasonOverride` carries the route's rate-limit correction (see
// the call site below): `runStylist` cannot tell "no key" apart from
// "rate-limited" on its own, since both arrive as `primary: null`.
function createStylistStream(
  input: StylistInput,
  deps: StylistDeps,
  degradedReasonOverride: DegradedReason,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const streamingDeps: StylistDeps = {
        ...deps,
        onAnalysis: (stage) => {
          const analysisLine = { type: 'analysis' as const, ...stage }
          controller.enqueue(encoder.encode(`${JSON.stringify(analysisLine)}\n`))
        },
      }

      runStylist(input, streamingDeps)
        .then((outcome) => {
          const resultLine = {
            type: 'result' as const,
            outfits: outcome.outfits,
            items: outcome.items,
            providerId: outcome.providerId,
            degraded: outcome.degraded,
            degradedReason: degradedReasonOverride ?? outcome.degradedReason,
          }
          controller.enqueue(encoder.encode(`${JSON.stringify(resultLine)}\n`))
          controller.close()
        })
        .catch(() => {
          // `runStylist` already catches every provider-level failure and
          // degrades gracefully internally; reaching here means something
          // outside that contract broke. Never log or forward the error
          // object itself (ADR-012 — it could in principle be wrapping
          // input data) — only this static reason string — and close the
          // stream instead of leaving the client hanging forever.
          console.error('stylist-pipeline-unexpected-error')
          controller.error(new Error('stylist-pipeline-unexpected-error'))
        })
    },
  })
}

export async function POST(request: Request): Promise<Response> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError(400, 'Yêu cầu không đúng định dạng multipart/form-data.')
  }

  const photoField = formData.get('photo')
  const answersField = formData.get('answers')

  // 1 & 2: photo mediaType, then size — checked, and bytes only read,
  // after both pass. A junk or oversized photo must never make it to the
  // rate limiter or to `arrayBuffer()`.
  let photo: StylistInput['photo']
  if (photoField !== null) {
    if (!isFileLike(photoField)) {
      return jsonError(400, 'Trường photo phải là file ảnh.')
    }
    if (!isAllowedPhotoType(photoField.type)) {
      return jsonError(415, `Loại ảnh không được hỗ trợ: ${photoField.type || 'không xác định'}.`)
    }
    if (photoField.size > MAX_PHOTO_BYTES) {
      return jsonError(413, 'Ảnh vượt quá dung lượng cho phép.')
    }
    const buffer = await photoField.arrayBuffer()
    photo = { mediaType: photoField.type, data: new Uint8Array(buffer) }
  }

  // 3: answers parses as JSON and satisfies the schema.
  if (typeof answersField !== 'string') {
    return jsonError(400, 'Thiếu trường answers.')
  }
  let answersRaw: unknown
  try {
    answersRaw = JSON.parse(answersField)
  } catch {
    return jsonError(400, 'answers không phải JSON hợp lệ.')
  }

  const parsed = stylistInputSchema.safeParse({ answers: answersRaw, photo })
  if (!parsed.success) {
    return jsonError(400, 'answers không hợp lệ.')
  }
  const input: StylistInput = parsed.data

  // 4: rate limits — only now, after the request has proven itself not to
  // be junk, do we spend any of the caller's (or the day's) quota.
  const ip = getClientIp(request)
  const [ipDecision, dailyDecision] = await Promise.all([perIpLimiter.check(ip), dailyLimiter.check(DAILY_KEY)])
  const rateLimited = !ipDecision.allowed || !dailyDecision.allowed

  const hasKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const primary = !rateLimited && hasKey ? createGeminiProvider() : null

  const deps: StylistDeps = {
    primary,
    fallback: createDeterministicProvider(),
    catalog,
    timeoutMs: STYLIST_TIMEOUT_MS,
  }

  // `runStylist` always reports `degradedReason: 'no-key'` whenever
  // `primary` is null (see pipeline.ts) because it has no way to know
  // *why* the caller passed null. When the real reason was a rate limit,
  // this route — the only place that knows that — corrects the label on
  // the `result` line before it is sent, so the response tells the truth.
  // (The `analysis` line never carries `degradedReason`, so there is
  // nothing to correct there — see the wire format in the module doc
  // comment above.)
  const degradedReasonOverride: DegradedReason = rateLimited ? 'rate-limited' : null

  const stream = createStylistStream(input, deps, degradedReasonOverride)

  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson' },
  })
}
