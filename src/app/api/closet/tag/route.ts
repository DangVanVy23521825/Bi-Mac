// POST /api/closet/tag — the HTTP boundary for AI garment labelling. This
// is the sibling of `src/app/api/stylist/route.ts`: read that file first —
// the order its checks run in is documented there as a security property,
// not a style choice, and this route follows the same discipline.
//
// Check order, and why it is exactly this order:
//   1. signed in                          → 401
//   2. `imagePath` starts with `${userId}/` → 400
//   3. per-user daily quota (Postgres)      → degrade, never block
//   4. call the model (download + tag)      → degrade on timeout/error too
//
// `src/proxy.ts` already 401s every signed-out caller to `/api/closet/:path*`
// before this handler even runs, but that is a redundant-safe outer gate,
// not a reason to skip this handler's own check (see proxy.ts's module
// comment and the task brief) — step 1 runs here regardless of what proxy
// already did.
//
// Step 2 is the load-bearing one. `signClosetImage` (Task 4) and
// `supabase.storage.from('closet').download(path)` both perform no
// ownership check of their own — they rely entirely on storage RLS
// pinning `auth.uid()` to the path's first segment
// (`supabase/migrations/0001_account_and_closet.sql`). This prefix check
// is the layer that stops a client-supplied path from ever reaching
// storage in the first place. This route never calls `signClosetImage` —
// it does not need a browser-facing URL, only the bytes, server-side — but
// the same rule applies to the raw path either way: never hand a
// client-supplied path to a storage call before this check has run.
//
// Step 3 lives in Postgres (`src/features/closet/quota.ts`), not
// `src/lib/rate-limit/`'s in-memory limiter — see that module's own file
// for why an in-memory counter cannot enforce a per-*account* limit across
// instances or restarts.
//
// Exceeding the quota, or having no `GOOGLE_GENERATIVE_AI_API_KEY`, must
// never produce an error response — both fall through to the
// deterministic tagger and say so via `degradedReason`, the same contract
// `runStylist` honors for the AI Stylist (ADR-011/ADR-018). The
// `degradedReasonOverride` below mirrors the stylist route's own
// rate-limit correction: the fallback path cannot tell "no key" apart from
// "quota already spent" on its own (both arrive as `primary === null`),
// so this route — the only place that knows which one actually happened —
// corrects the label before it answers.
//
// ADR-012: `imagePath`, and anything derived from the image bytes, is
// never logged. Every failure branch below uses a short static reason
// string, never the path or the downloaded bytes, in a `console.*` call
// or an `Error` message.
//
// Default Node.js runtime — do not set `runtime = 'edge'`.

import { allColors, allStyles } from '@/data'
import { consumeTagQuota } from '@/features/closet/quota'
import { createDeterministicTagger } from '@/lib/ai/tagger-deterministic'
import { createGeminiTagger } from '@/lib/ai/tagger-gemini'
import { TAGGER_TIMEOUT_MS, type GarmentTag, type TagRequest } from '@/lib/ai/tagger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/session'
import type { StylistVocabulary } from '@/types/stylist'

const BUCKET = 'closet'

type DegradedReason = 'no-key' | 'quota-exceeded' | 'timeout' | 'provider-error' | null

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function jsonError(status: number, message: string): Response {
  return jsonResponse(status, { error: message })
}

function buildVocabulary(): StylistVocabulary {
  return {
    styles: allStyles.map((style) => ({ slug: style.slug, name: style.name, tagline: style.tagline })),
    colors: allColors.map((color) => ({ slug: color.slug, name: color.name })),
  }
}

// `getCurrentUserId()` (Task 1) does not guard `auth.getUser()` against
// throwing itself — `src/features/account/guard.ts`'s `requireUserId()`
// is the page-side caller that adds that guard, but it redirects, which is
// wrong for a JSON API boundary. This route needs the same safety net
// (a transient Supabase outage must read as signed-out, not 500) with a
// 401 JSON body instead of a redirect, so it carries its own try/catch
// rather than reusing `requireUserId()`.
async function resolveUserId(): Promise<string | null> {
  try {
    return await getCurrentUserId()
  } catch {
    return null
  }
}

// Thrown by `withTimeout` when `primary.tag` doesn't settle in time.
// Distinguished with `instanceof` so the catch below can tell a timeout
// apart from a genuine provider/download error — same pattern as
// `StylistTimeoutError` in `src/features/stylist/pipeline.ts`, duplicated
// locally rather than imported: that class is not exported, and this
// route has no shared pipeline module of its own to hang a timeout helper
// off of.
class TagTimeoutError extends Error {
  constructor() {
    super('closet-tag-timeout')
    this.name = 'TagTimeoutError'
  }
}

function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController()

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort()
      reject(new TagTimeoutError())
    }, timeoutMs)

    run(controller.signal).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

function reasonForError(error: unknown): 'timeout' | 'provider-error' {
  return error instanceof TagTimeoutError ? 'timeout' : 'provider-error'
}

// The deterministic tagger ignores its request entirely (see
// `tagger-deterministic.ts`) — it has no rule table to key a garment photo
// off of — so the fallback path never needs real image bytes. This is
// also exactly why the quota-exceeded and no-key tests never need to mock
// `createSupabaseServerClient`'s storage call: this route only ever
// downloads the image when it is actually about to spend a primary call.
async function runFallback(vocabulary: StylistVocabulary): Promise<GarmentTag> {
  const placeholderReq: TagRequest = {
    photo: { mediaType: 'application/octet-stream', data: new Uint8Array(0) },
    vocabulary,
  }
  return createDeterministicTagger().tag(placeholderReq)
}

type TagBody = { imagePath?: unknown }

export async function POST(request: Request): Promise<Response> {
  // 1: signed in.
  const userId = await resolveUserId()
  if (!userId) {
    return jsonError(401, 'Cần đăng nhập để dùng chức năng này.')
  }

  let body: TagBody
  try {
    body = (await request.json()) as TagBody
  } catch {
    return jsonError(400, 'Yêu cầu không đúng định dạng JSON.')
  }

  const imagePath = body.imagePath
  if (typeof imagePath !== 'string' || imagePath.length === 0) {
    return jsonError(400, 'Thiếu đường dẫn ảnh.')
  }

  // 2: `imagePath` must live in the caller's own folder. Load-bearing —
  // see the module comment above. Checked, and nothing else touched,
  // before quota or storage ever run.
  if (!imagePath.startsWith(`${userId}/`)) {
    return jsonError(400, 'Đường dẫn ảnh không hợp lệ.')
  }

  const vocabulary = buildVocabulary()

  // 3: per-user daily quota — only now, after the request has proven
  // itself not to be junk, does it spend any of the day's budget.
  const quotaOk = await consumeTagQuota(userId)
  const hasKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const primary = quotaOk && hasKey ? createGeminiTagger() : null

  // Mirrors the stylist route's rate-limit correction: the fallback path
  // defaults to 'no-key' whenever `primary === null`, because it cannot
  // tell "no key" apart from "quota spent" on its own. When a key really
  // is configured and the quota is what blocked it, correct the label so
  // the response is honest about why it degraded.
  const degradedReasonOverride: DegradedReason = !quotaOk && hasKey ? 'quota-exceeded' : null

  // 4: call the model. `primary === null` covers both "no key" and
  // "quota exceeded" — never an error response, always the deterministic
  // tag with an honest `degradedReason`.
  if (primary === null) {
    const tag = await runFallback(vocabulary)
    return jsonResponse(200, { tag, labelSource: 'ai', degradedReason: degradedReasonOverride ?? 'no-key' })
  }

  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) {
      throw new Error('closet-tag-no-supabase-client')
    }

    const { data, error } = await supabase.storage.from(BUCKET).download(imagePath)
    if (error || !data) {
      throw new Error('closet-tag-download-failed')
    }

    const buffer = await data.arrayBuffer()
    const photo = { mediaType: data.type || 'application/octet-stream', data: new Uint8Array(buffer) }
    const req: TagRequest = { photo, vocabulary }

    const tag = await withTimeout((signal) => primary.tag(req, { signal }), TAGGER_TIMEOUT_MS)
    return jsonResponse(200, { tag, labelSource: 'ai', degradedReason: null })
  } catch (error) {
    const reason = reasonForError(error)
    const tag = await runFallback(vocabulary)
    return jsonResponse(200, { tag, labelSource: 'ai', degradedReason: reason })
  }
}
