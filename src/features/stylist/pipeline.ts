// runStylist — the AI Stylist pipeline. Ties together the two-call model
// boundary (analyze, then explain) with the catalog-side grounding
// (`resolveAnalysis`, `rankOutfits`/`rankItems`) so the route handler (a
// later task) can wire real providers without this module ever reaching
// into `src/data` itself.
//
// Order: analyze (primary, with timeout) → on error/timeout/absent:
// fallback.analyze, record `degraded` + `degradedReason` → resolveAnalysis
// (drops every slug the catalog doesn't have) → rankOutfits + rankItems
// (hard-filter avoids/occasions, then score) → explain on exactly the
// ranked outfits → assemble `StylistOutcome`.
//
// `StylistOutcome` carries resolved entity fields plus a prebuilt `href` —
// combined with `resolveAnalysis` dropping unresolved slugs, the UI (a
// later task) never holds a bare slug and so cannot construct a link to
// something that doesn't exist in the catalog.
//
// This module must not import `@/data` and must not construct providers —
// the caller supplies everything via `StylistDeps`. No environment reads,
// no network calls in tests: every provider here is injected.
//
// ADR-012: never log image bytes. `input.photo` is forwarded to a provider
// and otherwise never touched, never interpolated into an error message.

import type { FashionItem, Outfit } from '@/types/content'
import type { OutfitDescriptor, StylistVocabulary } from '@/types/stylist'
import type { StylistInput } from './input'
import { resolveAnalysis, type StylistCatalog } from './resolve'
import { rankItems, rankOutfits, type RankedOutfit } from './rank'
import type { AnalyzeRequest, ExplainRequest, StylistProvider } from '@/lib/ai/provider'
import type { StylistAnalysis, StylistExplanation } from '@/lib/ai/schema'
import type { StylistAnswers } from '@/types/stylist'

const DEFAULT_TIMEOUT_MS = 12000

const EMPTY_ANALYSIS_NOTE =
  'Bí Mặc chưa thể phân tích thêm từ thông tin hiện tại — bạn vẫn có thể khám phá outfit và style gợi ý dưới đây.'

const NO_OUTFITS_NOTE =
  'Những tiêu chí cần tránh đã thu hẹp danh sách outfit quá nhiều nên hiện chưa có outfit nào phù hợp — hãy khám phá theo style ở trên hoặc nới bớt tiêu chí tránh để xem thêm gợi ý.'

export type DegradedReason = 'timeout' | 'provider-error' | 'rate-limited' | 'no-key' | null

export type StylistOutcome = {
  goal: StylistAnswers['goal']
  providerId: 'gemini' | 'deterministic'
  degraded: boolean
  degradedReason: DegradedReason
  styleDirections: Array<{ slug: string; name: string; affinity: number; reason: string; href: string }>
  palette: Array<{ slug: string; name: string; hex: string; reason: string }>
  outfits: Array<{
    slug: string
    name: string
    image: string | null
    whyThisWorks: string
    items: Array<{ slug: string; name: string; href: string }>
  }>
  items: Array<{ slug: string; name: string; excerpt: string; image: string | null; href: string }>
  notes: string[]
}

// The stage-1 payload: everything the `analysis` NDJSON line needs, ready
// the moment resolveAnalysis + rankOutfits/rankItems have run and before
// `explain` (the second model call) has even started.
export type AnalysisStage = {
  styleDirections: StylistOutcome['styleDirections']
  palette: StylistOutcome['palette']
  notes: string[]
  degraded: boolean
}

export type StylistDeps = {
  primary: StylistProvider | null
  fallback: StylistProvider
  catalog: StylistCatalog
  timeoutMs?: number
  // Budget for the *analyze* call specifically when `input.photo` is
  // present. Measured against the real Gemini provider (Task 18 real-key
  // verification), a multimodal analyze call — full catalog vocabulary +
  // system prompt + schema-constrained output + the image part — routinely
  // takes ~10-15s, while the text-only analyze call finishes in well under
  // that. A single shared timeout sized for the lighter workload made the
  // heavier one fail by default; this lets the route hand down a larger
  // budget for the photo case without touching the no-photo path. Falls
  // back to `timeoutMs` when unset, so existing callers/tests that only set
  // `timeoutMs` are unaffected. `explain` never carries a photo (see
  // `buildExplainContent`), so it always uses `timeoutMs`, never this.
  photoTimeoutMs?: number
  // Optional hook fired synchronously, exactly once, right after resolve +
  // rank and before explain is called — this is what lets a caller (the
  // route handler) flush a real first NDJSON line instead of buffering
  // everything until the whole pipeline finishes. Unset → not called,
  // behavior is identical to before this hook existed.
  onAnalysis?: (stage: AnalysisStage) => void
}

// Thrown by `withTimeout` when the wrapped promise doesn't settle in time.
// Distinguished with `instanceof` so callers can tell a timeout apart from
// a genuine provider error.
class StylistTimeoutError extends Error {
  constructor() {
    super('stylist-provider-timeout')
    this.name = 'StylistTimeoutError'
  }
}

// Races `promise` against a timer. Whichever settles first wins; the timer
// is cleared in both the resolve and reject branches of `promise.then` so
// a promise that eventually settles after timing out never leaves a
// dangling handle — and a promise that settles before the timer fires
// clears the timer immediately, so there is nothing left pending either
// way.
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new StylistTimeoutError())
    }, timeoutMs)

    promise.then(
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

function reasonFor(error: unknown): 'timeout' | 'provider-error' {
  return error instanceof StylistTimeoutError ? 'timeout' : 'provider-error'
}

function buildVocabulary(catalog: StylistCatalog): StylistVocabulary {
  return {
    styles: catalog.styles.map((style) => ({ slug: style.slug, name: style.name, tagline: style.tagline })),
    colors: catalog.colors.map((color) => ({ slug: color.slug, name: color.name })),
  }
}

function toOutfitDescriptor(outfit: Outfit, catalog: StylistCatalog): OutfitDescriptor {
  const itemBySlug = new Map(catalog.items.map((item) => [item.slug, item]))
  const colorBySlug = new Map(catalog.colors.map((color) => [color.slug, color]))
  const styleBySlug = new Map(catalog.styles.map((style) => [style.slug, style]))

  const items = outfit.itemSlugs
    .map((slug) => itemBySlug.get(slug))
    .filter((item): item is FashionItem => item !== undefined)

  const colorSlugs = [...new Set(items.flatMap((item) => item.colorSlugs))]

  return {
    slug: outfit.slug,
    name: outfit.name,
    itemNames: items.map((item) => item.name),
    colorNames: colorSlugs
      .map((slug) => colorBySlug.get(slug)?.name)
      .filter((name): name is string => name !== undefined),
    styleNames: outfit.styleSlugs
      .map((slug) => styleBySlug.get(slug)?.name)
      .filter((name): name is string => name !== undefined),
  }
}

function styleHref(slug: string): string {
  return `/styles/${slug}`
}

function itemHref(item: FashionItem): string {
  return `/wardrobe/${item.category}/${item.slug}`
}

type AnalyzeOutcome = {
  analysis: StylistAnalysis
  providerUsed: StylistProvider
  degraded: boolean
  degradedReason: DegradedReason
}

// analyze (primary, with timeout) → on error/timeout/absent: fallback.analyze.
async function getAnalysis(
  input: StylistInput,
  deps: StylistDeps,
  vocabulary: StylistVocabulary,
  timeoutMs: number,
): Promise<AnalyzeOutcome> {
  const req: AnalyzeRequest = { answers: input.answers, vocabulary, photo: input.photo }

  if (deps.primary === null) {
    const analysis = await deps.fallback.analyze(req)
    return { analysis, providerUsed: deps.fallback, degraded: true, degradedReason: 'no-key' }
  }

  try {
    const analysis = await withTimeout(deps.primary.analyze(req), timeoutMs)
    return { analysis, providerUsed: deps.primary, degraded: false, degradedReason: null }
  } catch (error) {
    const degradedReason = reasonFor(error)
    const analysis = await deps.fallback.analyze(req)
    return { analysis, providerUsed: deps.fallback, degraded: true, degradedReason }
  }
}

type ExplainOutcome = {
  whyBySlug: Map<string, string>
  degraded: boolean
  degradedReason: DegradedReason
}

// explain on exactly the ranked outfits. Three merge rules: (1) only accept
// entries whose outfitSlug is among the ranked outfits; (2) an outfit with
// no entry falls back to the catalog's own whyItWorks (applied by the
// caller, since this function only returns what the provider actually
// confirmed); (3) if explain throws/times out, degrade and return nothing
// so the caller falls back to whyItWorks for every outfit.
async function getExplanations(
  providerUsed: StylistProvider,
  rankedOutfits: RankedOutfit[],
  input: StylistInput,
  vocabulary: StylistVocabulary,
  catalog: StylistCatalog,
  timeoutMs: number,
): Promise<ExplainOutcome> {
  if (rankedOutfits.length === 0) {
    return { whyBySlug: new Map(), degraded: false, degradedReason: null }
  }

  const descriptors = rankedOutfits.map((ranked) => toOutfitDescriptor(ranked.outfit, catalog))
  const req: ExplainRequest = { answers: input.answers, vocabulary, outfits: descriptors }
  const rankedSlugs = new Set(rankedOutfits.map((ranked) => ranked.outfit.slug))

  try {
    const explanation: StylistExplanation = await withTimeout(providerUsed.explain(req), timeoutMs)
    const whyBySlug = new Map<string, string>()
    for (const entry of explanation.outfits) {
      // Rule 1: drop any entry about an outfit that wasn't actually ranked.
      if (rankedSlugs.has(entry.outfitSlug)) {
        whyBySlug.set(entry.outfitSlug, entry.whyThisWorks)
      }
    }
    return { whyBySlug, degraded: false, degradedReason: null }
  } catch (error) {
    // Rule 3: explain failed entirely — degrade, caller falls back to
    // whyItWorks for every outfit. The outfits themselves were already
    // chosen by code and remain correct; only the prose is downgraded.
    return { whyBySlug: new Map(), degraded: true, degradedReason: reasonFor(error) }
  }
}

export async function runStylist(input: StylistInput, deps: StylistDeps): Promise<StylistOutcome> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  // The photo workload is measurably heavier (see `photoTimeoutMs` doc
  // comment on `StylistDeps`) — only the analyze call gets the larger
  // budget, and only when this request actually carries a photo.
  const analyzeTimeoutMs = input.photo ? deps.photoTimeoutMs ?? timeoutMs : timeoutMs
  const vocabulary = buildVocabulary(deps.catalog)

  const analyzeOutcome = await getAnalysis(input, deps, vocabulary, analyzeTimeoutMs)
  const resolved = resolveAnalysis(analyzeOutcome.analysis, deps.catalog)

  const rankedOutfits = rankOutfits(resolved, input.answers, deps.catalog)
  const rankedItems = rankItems(resolved, input.answers, deps.catalog)

  // Everything below is derived from `resolved`/`rankedOutfits` alone — none
  // of it depends on `explain` — so it is all ready for stage 1 before the
  // second model call even starts.
  const notes = [...resolved.notes]
  if (notes.length === 0) {
    notes.push(EMPTY_ANALYSIS_NOTE)
  }
  if (rankedOutfits.length === 0) {
    notes.push(NO_OUTFITS_NOTE)
  }

  const styleDirections = resolved.styleDirections.map((direction) => ({
    slug: direction.style.slug,
    name: direction.style.name,
    affinity: direction.affinity,
    reason: direction.reason,
    href: styleHref(direction.style.slug),
  }))

  const palette = resolved.palette.map((entry) => ({
    slug: entry.color.slug,
    name: entry.color.name,
    hex: entry.color.hex,
    reason: entry.reason,
  }))

  // Fire the stage-1 hook now — resolve + rank are done, explain hasn't
  // been called yet. `degraded` here reflects only the analyze stage;
  // explain's own degradation (if any) is folded into the final outcome
  // below, after it resolves.
  deps.onAnalysis?.({ styleDirections, palette, notes, degraded: analyzeOutcome.degraded })

  const explainOutcome = await getExplanations(
    analyzeOutcome.providerUsed,
    rankedOutfits,
    input,
    vocabulary,
    deps.catalog,
    timeoutMs,
  )

  const degraded = analyzeOutcome.degraded || explainOutcome.degraded
  const degradedReason = analyzeOutcome.degradedReason ?? explainOutcome.degradedReason

  const itemBySlug = new Map(deps.catalog.items.map((item) => [item.slug, item]))

  const outfits = rankedOutfits.map((ranked) => {
    // Rule 2: no accepted entry for this outfit → fall back to the
    // catalog's own editorial whyItWorks.
    const whyThisWorks = explainOutcome.whyBySlug.get(ranked.outfit.slug) ?? ranked.outfit.whyItWorks
    const items = ranked.outfit.itemSlugs
      .map((slug) => itemBySlug.get(slug))
      .filter((item): item is FashionItem => item !== undefined)
      .map((item) => ({ slug: item.slug, name: item.name, href: itemHref(item) }))
    return {
      slug: ranked.outfit.slug,
      name: ranked.outfit.name,
      image: ranked.outfit.image,
      whyThisWorks,
      items,
    }
  })

  const items = rankedItems.map((item) => ({
    slug: item.slug,
    name: item.name,
    excerpt: item.excerpt,
    image: item.image,
    href: itemHref(item),
  }))

  return {
    goal: input.answers.goal,
    providerId: analyzeOutcome.providerUsed.id,
    degraded,
    degradedReason,
    styleDirections,
    palette,
    outfits,
    items,
    notes,
  }
}
