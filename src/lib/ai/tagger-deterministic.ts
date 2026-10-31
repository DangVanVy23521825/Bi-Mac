// Deterministic (rule-free) GarmentTagger. This is the fallback path that
// runs with no API key, on a Gemini error/timeout, or when a rate limit
// trips — mirrors `deterministic.ts`'s role for the stylist provider, and
// ADR-011/ADR-018's rule that a missing or failing model must never block
// the flow. It must stay catalog-blind: this module may import from
// `src/types/stylist.ts` and `./tagger` only.
//
// Unlike `deterministic.ts`'s `analyze`/`explain`, there is no rule table
// to run here — a garment photo carries no questionnaire answers to key
// off. The only correct minimal draft is an empty one: a generic Vietnamese
// placeholder name, every vocabulary field blank, `fit: null`, so the user
// corrects nothing *wrong* — they just fill in what the model didn't get
// to see. `labelSource` is not set here: that field belongs to
// `ClosetItemDraft`, one layer up, and whichever tagger ran is exactly
// what the caller already knows without being told back.

import type { GarmentTag, GarmentTagger } from './tagger'

const PLACEHOLDER_NAME = 'Món đồ mới'

// Request and options are intentionally unused — see module header: there
// is no rule table to key off, so every call gets the same empty draft
// regardless of the photo or vocabulary passed in.
async function tag(): Promise<GarmentTag> {
  return {
    name: PLACEHOLDER_NAME,
    category: 'tops',
    colorSlugs: [],
    styleSlugs: [],
    occasions: [],
    fit: null,
    attributes: [],
    note: null,
  }
}

export function createDeterministicTagger(): GarmentTagger {
  return {
    id: 'deterministic',
    tag,
  }
}
