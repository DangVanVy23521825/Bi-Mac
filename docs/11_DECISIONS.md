# 11 — Architecture Decision Log

Record durable decisions here. Keep entries concise.

## ADR-001 — Product is knowledge-first, not commerce-first

**Status:** Accepted

**Decision:** MVP v1 excludes cart, checkout, payments, and marketplace behavior.

**Reason:** The core value is fashion understanding, connected outfit knowledge, personalization, and saved inspiration.

---

## ADR-002 — Shared relational fashion knowledge model

**Status:** Accepted

**Decision:** Items, styles, outfits, colors, and occasions are modeled as connected domain entities rather than duplicated page-specific content.

**Reason:** The same fashion knowledge needs to power Wardrobe, Styles, Home cross-links, My Closet, and AI recommendation grounding.

---

## ADR-003 — AI provider abstraction + deterministic mock

**Status:** Accepted

**Decision:** AI Stylist uses a provider adapter and a deterministic mock implementation. Local development must not require a paid AI API.

**Reason:** UI, recommendation retrieval, validation, and product logic should be testable independently of external model availability/cost.

**Note:** Amended by ADR-011 — Gemini is now the primary provider; the deterministic implementation is demoted to fallback and test seam.

---

## ADR-004 — Supabase for MVP backend services

**Status:** Accepted

**Decision:** Use Supabase PostgreSQL, Auth, and Storage unless later requirements justify changing a specific subsystem.

**Reason:** It provides a compact MVP backend while retaining relational PostgreSQL modeling and RLS.

---

## ADR-005 — Private user photo storage

**Status:** Accepted

**Decision:** User photos for AI Stylist are private by default and are never treated as public media assets.

**Reason:** Photos are personal user data and require stronger access/lifecycle controls than editorial assets.

**Note:** Amended by ADR-012 — v1 does not store user photos at all (in a bucket or otherwise); they are processed in memory per request and discarded.

---

## ADR-006 — Display font Cormorant Garamond, body font Inter

**Status:** Accepted

**Decision:** Use Cormorant Garamond for display/heading type and Inter for body type. If Cormorant Garamond does not ship a `vietnamese` subset, use Playfair Display instead.

**Reason:** A serif gives the editorial headings their character; a sans-serif reads cleanly for Vietnamese diacritics at small sizes.

---

## ADR-007 — Repository functions are async from the start

**Status:** Accepted

**Decision:** Data repository functions are declared `async` from the first implementation, even though v1 reads synchronous local fixtures.

**Reason:** Switching the data layer to Postgres at M2 should not require touching any component that calls a repository function.

---

## ADR-008 — Defer `(public)`/`(account)` route groups

**Status:** Accepted

**Decision:** Do not introduce the `(public)`/`(account)` route groups described in earlier architecture docs for v1.

**Reason:** They should only be added once there is a real auth-driven layout boundary to justify them; v1 has no authenticated area.

---

## ADR-009 — Product goal is a portfolio piece for freelance/client audiences

**Status:** Accepted

**Decision:** The product goal is a portfolio artifact. Its audience is freelance prospects and potential clients evaluating the author's work, not end users of a fashion product.

**Reason:** This is the root decision; every other priority in the direction spec (deploy-first, no-login saves, catalog sizing, AI Stylist positioning) is derived from it. Recorded against `docs/00_PROJECT_CONTEXT.md`.

---

## ADR-010 — My Closet v1 requires no login

**Status:** Accepted

**Decision:** My Closet v1 saves items/looks/styles to `localStorage` and does not require authentication. Amends the Authentication section of `docs/01_PRD.md`, which previously required auth for persistent saves.

**Reason:** A login form kills a two-minute portfolio demo. Save/unsave is ordinary CRUD and is not the part of the product that needs to impress a viewer.

---

## ADR-011 — Gemini is the primary AI Stylist provider; deterministic engine is fallback

**Status:** Accepted

**Decision:** The AI Stylist uses Gemini (via Vercel AI SDK + `@ai-sdk/google`) as its primary provider. The deterministic provider is demoted from the default implementation to a fallback (used on error/timeout/quota) and as a test seam. This amends ADR-003, which treated the deterministic mock as primary.

**Reason:** A portfolio demo needs to show a real AI integration, not a scripted mock, while keeping the deterministic path available for cost control, resilience, and tests that don't call a live model.

---

## ADR-012 — User photos are never stored; processed in memory only

**Status:** Accepted

**Decision:** User photos uploaded to the AI Stylist are not persisted anywhere. They are received in the request, sent to Gemini, and discarded; there is no bucket, no signed URL, and no storage lifecycle to manage. This amends ADR-005, which specified a private storage bucket.

**Reason:** Not storing the photo at all is a stronger privacy posture than a private bucket, and it removes Supabase Storage from the v1 build entirely.

---

## ADR-013 — Generated imagery is faceless and follows one locked art direction

**Status:** Accepted

**Decision:** All v1 imagery is AI-generated under a single, locked art direction spec, and no image shows a recognizable human face (crops from the shoulders down, shots from behind, three-quarter angles, or faces turned out of frame).

**Reason:** An AI-generated face is the single most common tell that gives away synthetic imagery; a faceless crop also reads as more editorial, so the constraint improves the work rather than only hiding its origin.

---

## ADR-014 — Catalog v1 sized to the photo budget

**Status:** Accepted

**Decision:** Catalog v1 contains 15 items (3 per category across 5 categories), 5 styles, 10 outfits, and 3 stories. Amends `docs/08_SEED_CONTENT.md`, which specified a larger catalog.

**Reason:** The number of hand-made images that can realistically be produced and art-directed determines how much catalog content the project can support without content thinness becoming visible.

---

## ADR-015 — Deploy from M0; roadmap reordered

**Status:** Accepted

**Decision:** The project deploys to a live URL starting at Milestone 0, and the milestone roadmap is reordered per the direction spec §8 (deploy and shell first, AI Stylist before deep Supabase/Auth work). Amends `docs/09_MVP_ROADMAP.md`.

**Reason:** An infrastructure or deploy problem found on day one costs about an hour to fix; the same problem found at the end costs the client meeting it was supposed to support.

---

## ADR-016 — Ranking metadata and hard avoid-exclusion

**Status:** Accepted

**Decision:** `FashionItem` carries `occasions`, `fit`, and `attributes` fields. The questionnaire's avoid list is not a fixed hard-coded set of options — it is produced by `getAvoidOptions()`, which scans the catalog and returns only the `ItemAttribute` values that at least one real item actually has. At ranking time, any outfit (or item) that contains an attribute the user asked to avoid is dropped from the candidate list entirely, before scoring runs; it is never kept in the results at a lower rank.

**Reason:** `/stylist`'s own copy tells the user their "những thứ bạn muốn tránh" will be respected. A ranking system that only demotes an avoided attribute still shows it to the user somewhere on the page — the user asked not to see sleeveless tops and then sees one two rows down. That is a broken promise, not a weaker one, so avoid has to be a filter the item can fail, not a score it can lose points on. Deriving the questionnaire's options from the catalog (rather than hard-coding the full vocabulary) keeps the same promise from the other direction: it stops the UI from ever offering a choice the current 15-item catalog has no way to honor.

---

## ADR-017 — The outfit floor is a display floor, not a direct floor

**Status:** Accepted

**Decision:** Amends the direction spec's constraint that "every item appears in ≥2 outfits." At 15 items and 10 outfits that constraint cannot be satisfied directly for every category at once: a dress fills a whole outfit by itself and excludes a separate top and bottom from that same outfit, so getting all 3 dresses to 2 direct appearances each needs 6 of the 10 outfits to be dress outfits. That leaves only 4 outfits to carry the 3 tops and 3 bottoms at 2 direct appearances each — 6 top-appearances and 6 bottom-appearances needed from 4 outfits that can supply at most one of each — so the arithmetic does not close. The replacement rule is: every item appears in **≥1** outfit directly, and `getRelatedOutfits()` guarantees **≥2** outfits are *displayed* on that item's page by topping up the direct matches with outfits that share one of the item's styles when fewer than 2 direct matches exist. The two kinds of match are labelled differently in the UI (`relation: 'contains-item' | 'same-style'`) so a visitor is never told an outfit contains an item that it does not.

**Reason:** The actual product goal behind the "≥2" rule was never the number two — it was that an item's detail page is never left with an empty or single, thin-looking related-outfits section. Chasing the literal number on a fixed 15/10 catalog would mean either inflating outfits with items that don't belong in them, or quietly shrinking the catalog; topping up with same-style outfits (and being honest in the UI about which kind of match it is) keeps the actual goal intact without either compromise.

---

## ADR-018 — `Output.object` instead of `generateObject`; stage-level streaming; in-memory rate limiting

**Status:** Accepted

**Decision:**

1. **Structured output.** `generateObject` does not exist in AI SDK 7 (`ai`). Structured output is produced with `generateText` combined with `Output.object({ schema })`, and the Gemini provider (`src/lib/ai/gemini.ts`) re-parses the result against the Zod schema itself even though `Output.object` already enforces it at the API layer — a provider-side change or a future SDK behavior change must not let anything unvalidated reach the pipeline.
2. **Streaming granularity.** `/api/stylist` streams NDJSON in exactly two stages — an `analysis` line once resolve+rank finish, then a `result` line once `explain` settles — not per-token streaming.
3. **Rate limiting.** `src/lib/rate-limit` is an in-memory sliding-window counter, applied per-IP and daily-global, checked only after the request has already passed structural validation. Upstash Redis (or an equivalent shared backend) is left as a documented seam behind the same `RateLimiter` interface, not implemented.

**Reason:** (1) is a correction of a documentation assumption against the SDK actually installed, not a design choice — code has to follow the API that exists. (2) follows directly from the AI SDK's own documentation: partial output emitted mid-stream by `streamText` cannot be validated against a schema, so token-level streaming would hand the browser catalog slugs before anything confirms those slugs are real, breaking the one invariant this feature cannot compromise on (every link on the page points at something that exists). Two coarse, fully-validated stages is the streaming grain the schema constraint actually allows, and it still lets the UI show the style/palette direction before the slower outfit-explanation call finishes. (3) is a cost/complexity trade-off: a real shared limiter needs a network hop and an external dependency before the feature has any traffic to justify it, so the in-memory version ships now and the known gap — the effective limit multiplies by instance count on a multi-instance platform — is written down next to the code (`src/lib/rate-limit/index.ts`) instead of hidden.

---

## ADR-019 — Separate timeout budget for the photo-attached analyze call

**Status:** Accepted — the two-budget split stands; the text-only value it set (`STYLIST_TIMEOUT_MS = 12_000`) was superseded by ADR-020.

**Decision:** The AI Stylist pipeline (`src/features/stylist/pipeline.ts`) now takes two timeout budgets instead of one: `timeoutMs` (text-only `analyze`, and always for `explain`, which never carries a photo) and `photoTimeoutMs` (the `analyze` call specifically when `input.photo` is present). The route (`src/app/api/stylist/route.ts`) sets `STYLIST_TIMEOUT_MS = 12_000` and `STYLIST_PHOTO_TIMEOUT_MS = 30_000`.

**Reason:** Task 18's real-key verification measured the real Gemini provider directly instead of guessing: with a 60s cap in place to observe true latency, four photo-attached requests reached the `analysis` stage at 9.97s, 12.22s, 12.47s, and 14.80s — three of four at or above the original single 12s budget — while a text-only request on the same server reached it in 8.26s. The single shared timeout had been sized for the lighter text-only workload (full catalog vocabulary + system prompt + schema-constrained output) and was cutting off the heavier photo workload (the same plus the image part) by default, silently handing every photo submission to the deterministic fallback even on a working key/model/network path. Giving the photo case its own, larger budget (roughly 2x the observed max, to absorb jitter and real user photos larger than the tiny test image used to measure) fixes the actual mismatch — a workload-sizing problem, not a configuration mistake — without touching the text-only budget, which was already adequate.

---

## ADR-020 — Text-only stylist budget raised to 25s to survive a cold start

**Status:** Accepted

**Decision:** `STYLIST_TIMEOUT_MS` in `src/app/api/stylist/route.ts` goes from `12_000` to `25_000`, and `DEFAULT_TIMEOUT_MS` in `src/features/stylist/pipeline.ts` follows it from `12000` to `25_000`. `STYLIST_PHOTO_TIMEOUT_MS` stays at `30_000`; the two-budget split from ADR-019 is unchanged, only the text-only number moves.

**Reason:** ADR-019 sized the text-only budget off a warm ~8-9s measurement, which left no headroom for a cold start. Re-measured on 2026-10-26 against the real key: three raw `generateContent` calls took 9.7s, 9.8s and 10.4s, and four warm end-to-end requests through the route — two Gemini calls each — returned `providerId: 'gemini'` without degrading, in 13.5s, 19.9s, 20.5s and 20.7s. The failure was isolated to the *first* request after the server booted, which degraded at 13.3s: module init plus route compilation land on top of the same ~10s model call, and 12s cannot absorb both. That matters more than a warm-path number, because on a serverless platform every cold instance repeats that first request — so the submission most likely to be a real visitor's first impression was the one most likely to show the fallback banner on a perfectly working key, model and network. 25s is roughly 2.5x the warm per-call observation. The worst case is now analyze 25s + explain 25s = 50s (55s on the photo path), well inside the platform's 300s function limit, and the staged NDJSON response means the user still sees the style/palette direction as soon as stage 1 lands rather than waiting on the whole budget.

**Rejected:** dropping the budget entirely and letting the provider call run unbounded — the deterministic fallback exists precisely so a stuck call degrades into a usable answer instead of an open connection, and removing the ceiling would trade a rare wrong fallback for an occasional hang with no answer at all.

---

## Template for new decisions

```text
## ADR-NNN — Title

Status: Proposed | Accepted | Superseded

Decision:

Reason:

Consequences:
```
