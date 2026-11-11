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

**Status:** Accepted — superseded by ADR-021 now that a real auth-driven boundary exists.

**Decision:** Do not introduce the `(public)`/`(account)` route groups described in earlier architecture docs for v1.

**Reason:** They should only be added once there is a real auth-driven layout boundary to justify them; v1 has no authenticated area.

---

## ADR-009 — Product goal is a portfolio piece for freelance/client audiences

**Status:** Accepted — superseded by ADR-024, which records the product's goal as real end users, not a portfolio audience.

**Decision:** The product goal is a portfolio artifact. Its audience is freelance prospects and potential clients evaluating the author's work, not end users of a fashion product.

**Reason:** This is the root decision; every other priority in the direction spec (deploy-first, no-login saves, catalog sizing, AI Stylist positioning) is derived from it. Recorded against `docs/00_PROJECT_CONTEXT.md`.

---

## ADR-010 — My Closet v1 requires no login

**Status:** Accepted — superseded by ADR-025, which requires sign-in for My Closet; the `localStorage` path described below was never implemented.

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

**Note:** Extended by ADR-028 — this decision stands unchanged for the AI Stylist's body photo, but a second, different kind of photo (the personal closet's garment photos) now exists and IS stored, in a private bucket. Read ADR-028 before citing this entry for "user photos" in general; it no longer covers both kinds.

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

## ADR-021 — Route boundary: `(account)` route group + `proxy.ts`, splitting pages from the API

**Status:** Accepted

**Decision:** The route boundary ADR-008 deferred is now in place, split by what each tree needs:

- Pages under `/closet` move into `src/app/(account)/` (so far just `(account)/closet/page.tsx`). `src/app/(account)/layout.tsx` calls `getAuthState()` once and either renders `children` (signed-in) or a generic "chưa cấu hình" / "đăng nhập" message in its place (unconfigured / signed-out) — never a redirect. Every future page this product adds under `/closet` (`/closet/items`, `/closet/looks`, `/closet/styles` per docs/02) belongs inside this group to inherit the gate.
- `/api/closet/*` (no route exists yet; Task 6 adds the first one) is gated by `src/proxy.ts`, which calls `getAuthState()` and returns a 401 JSON response before any route handler runs when the caller isn't signed in.

Two mechanisms, not one, because neither covers both trees: a route-group layout can render a React tree but cannot produce a bare 401 for an API consumer; `proxy.ts` can reject or pass through but cannot render a component tree, so it cannot show the inline "chưa cấu hình" state the product requires for public-facing pages.

**Reason:** A task review on the branch that introduced `getAuthState()`/`requireUserId()` (`src/features/account/guard.ts`) found that nothing actually called either function — `src/app/closet/page.tsx` rendered unconditionally to every visitor regardless of auth state, which is exactly the "scattered, can be forgotten" risk ADR-008 anticipated reversing once a real boundary existed. Fixing the one page that happened to exist would not have fixed the shape of the problem; a structural mechanism does, because a future page added under the wrong parent is a visible, one-line routing mistake instead of a silent missing function call.

`proxy.ts` (not the deprecated `middleware.ts` name) calling `getAuthState()` was verified empirically before committing to it, not assumed from memory: a throwaway proxy calling `cookies()` from `next/headers` was run against a real `next dev` and `next start` server on this project's Next.js version (16.3.8) and returned 200 with no "outside a request scope" error. Older guidance that `next/headers` doesn't work in Middleware does not hold on this version.

A verified, not hypothetical, consequence worth recording: because `getAuthState()` resolves to a build-time constant (`unconfigured`) when no Supabase env is set, Next statically prerenders the whole `/closet` route, and its static-segment cache bakes the *hidden* page's rendered output into the shipped RSC flight payload (inside a `<script>` tag, invisible in the rendered DOM, but present in "view source") even though `AccountLayout` never includes `children` in what it returns. Confirmed on both `next dev` and `next start`. This is harmless today because nothing reachable while signed-out or unconfigured can contain per-user data (there is no authenticated user to fetch it for), but it means **a parent layout choosing not to render `children` is a UI-level gate, not an execution or data-isolation boundary** — a future page under `(account)` that fetches real personal data must still gate itself (e.g. via `requireUserId()`) before doing that fetch, exactly as its own brief (Task 6) already requires for the API side. Do not treat the layout gate as sufficient on its own once real data is involved.

**Rejected:**
- Fixing only the specific `/closet/page.tsx` instance without a structural mechanism — addresses the symptom the review found, not the "scattered, forgettable" shape it was flagging.
- A single `middleware.ts`/`proxy.ts` covering both pages and the API — rejected because Middleware/Proxy cannot render a React component tree, so it cannot produce the inline "chưa cấu hình"/"đăng nhập" UI the product requires instead of a redirect for the page tree.
- Hard-redirecting `/closet` to `/` for a signed-out visitor (what `requireUserId()` does) — rejected for the page tree specifically: a visitor discovering "Tủ đồ của tôi" from the main nav should see what it is and a way in, not get bounced with no explanation. `requireUserId()`'s redirect remains the right tool for an *action* that needs a user (saving an item, etc.), just not for a page a signed-out visitor is allowed to land on.

**Consequences:** Any task that adds a page under `/closet` must put it inside `src/app/(account)/` to inherit the gate (the URL is unaffected — route groups don't appear in the path). Any task that adds a route under `/api/closet/` is already covered by `proxy.ts`'s matcher without needing to add its own 401 check for the "not signed in at all" case, though Task 6's own brief already plans a check at the route level too — that redundancy is intentional defense-in-depth, not duplicated work to remove.

---

## ADR-022 — Account deletion: bucket first, auth user last, and fail closed in between

**Status:** Accepted

**Decision:** `deleteAccount(userId)` (`src/features/account/delete.ts`) runs exactly two steps, in this order and never the reverse:

1. Enumerate every file under the `closet` bucket prefix `<userId>/` — paginated to the end (`CLOSET_LIST_PAGE_SIZE = 100`) and recursing into subfolders — then remove them.
2. `auth.admin.deleteUser(userId)`, whose `on delete cascade` (migration `0001_account_and_closet.sql`) clears `profiles`, `closet_items`, `saved_items`, `saved_outfits`, `saved_styles`.

If step 1 fails for any reason — a `list` error or a `remove` error on any chunk — the function throws `AccountDeletionError('bucket-cleanup')` and step 2 **does not run**. The account survives the failure intact and `DELETE /api/account` says so in those words.

The `userId` the function receives always comes from the session (`getCurrentUserId()`), never from a request body, query string or header. The route handler deliberately declares no `Request` parameter at all.

`src/lib/supabase/admin.ts` is the only app module that reads `SUPABASE_SERVICE_ROLE_KEY`, and its first line is `import 'server-only'`.

**Reason:** Supabase Storage is a separate system from Postgres — `on delete cascade` does not remove a single byte from the bucket. An image path exists in exactly two places: the `closet_items` row (which cascade destroys) and the bucket itself. Deleting the auth user first therefore destroys the only index of files that are still there: private photographs left behind permanently, which no query — and no operator — can locate afterward. A test that inspects only the database passes happily while this is happening, which is why the proof lives in `src/features/account/delete.integration.test.ts` (a real `storage.list` against a real project), not in the unit test.

Failing closed on a partial bucket cleanup follows from the same asymmetry. Stopping with the account intact is a retryable failure — the data is still there, the user presses the button again. Deleting the user over a half-cleaned bucket is an unfixable one. Between "not finished, try again" and "permanently lost track of some private data", the first is strictly better.

Service-role bypasses RLS entirely: none of the twenty policies in migration 0001 is evaluated for that key. The "only yourself" boundary that the database holds for every other route is, here, held by one line of application code. `server-only` is the mechanical guarantee that the key cannot reach a browser: the package resolves to an empty module only under the `react-server` export condition, so any `'use client'` module that pulls `admin.ts` in — directly or transitively — fails `next build`. This was verified by deliberately importing `admin.ts` from a client component and confirming the build error, not assumed.

**Rejected:**
- A soft-delete flag with the rows and files retained — the product promise is deletion, and a hidden flag is not deletion.
- Deleting the auth user anyway when bucket cleanup fails partway, so the user "at least gets deleted" — rejected above: it converts a retryable failure into an unrecoverable one.
- Listing one page of bucket files and stopping — Supabase Storage returns 100 entries by default and will not volunteer the rest; a 120-item closet would silently leave 20 photographs behind.
- Removing files while paginating — deletion shifts the listing under the `offset` cursor, so entries get skipped. The implementation lists everything first, then removes in chunks.

**Consequences:** `SUPABASE_SERVICE_ROLE_KEY` must be set in the server environment for `/closet/account` to work; without it the route answers 500 with "chưa được cấu hình" rather than pretending to succeed. Vitest runs under the `node` export condition, where `server-only` throws on import, so `vitest.config.mts` aliases it to `test/server-only-stub.ts`; that alias is test-only and `next build` still uses the real package, so the bundle guarantee is unchanged. Any future call site of `deleteAccount` inherits the full force of the service-role key and must derive its `userId` from the session the same way.

---

## ADR-023 — Three catalog pages became dynamic once accounts needed per-request cookies; accepted, not solved

**Status:** Accepted (as an accepted cost — see Reason)

**Decision:** `/stylist`, `/wardrobe/[category]/[slug]`, and `/styles/[slug]` now render per request for every visitor — signed in or not — whenever Supabase is configured, where before this plan they were static. The mechanism is the same in all three: `/stylist` (`src/app/stylist/page.tsx`) calls `getCurrentUserId()` to decide whether to pre-fill the questionnaire from a remembered profile; `/wardrobe/[category]/[slug]` and `/styles/[slug]` both call `getAuthState()` to decide whether to show the save control. Every one of those calls goes through `createSupabaseServerClient()` (`src/lib/supabase/server.ts`), and that function calls `cookies()` from `next/headers` — reading the incoming request's cookies is itself what tells Next.js a route cannot be prerendered once, ahead of time, and served the same to everyone. Two independent task reviews on this branch flagged the same page-by-page symptom before this was recognized as one thing; it is recorded here as a single branch-wide decision rather than three local fixes.

**Reason:** The three pages need `cookies()` for a real reason, not an accidental one — a save button that doesn't know whether to say "lưu" or "đã lưu", and a questionnaire that doesn't know whether to pre-fill, are both genuinely request-dependent on who's asking. There is no version of "does this visitor have a session" that doesn't read a cookie. Given that, the alternatives are real trade-offs, not free wins, which is why this is written down as an accepted cost rather than closed as solved:
- **Client-side fetch after mount** — ship the static shell, then fetch auth state from the browser and swap in the save control/pre-fill once it resolves. Keeps the page statically cacheable, but trades it for a visible pop-in on every load and a second network round-trip the server-rendered version didn't need.
- **A Suspense/PPR boundary** — wrap just the auth-dependent fragment (the save button, the pre-fill) in a boundary that the rest of the static page doesn't wait on. This is the structurally correct fix, but it's a non-trivial restructuring of three pages' rendering boundaries, not a configuration flag, and it was out of scope for the task that found this.

Neither alternative was implemented. The current behavior is correct and tested — it is a cost (every visit to these three pages now does a cookie read and a Supabase round-trip that a cached static page would have skipped), not a bug, and it should be revisited with one of the two alternatives above if these pages' load latency or server cost becomes a problem worth the restructuring.

**Rejected:** closing this as "working as intended" without writing down the trade-off — that would read, to the next person touching these pages, as if nobody had noticed the regression from static to dynamic, when in fact it was noticed twice and deliberately left as the cheaper option for this plan's scope.

**Consequences:** any future page that calls `getAuthState()`, `requireUserId()`, or any function that transitively calls `createSupabaseServerClient()` takes on the same cost and should expect to render dynamically when Supabase is configured. A future task that cares about static-shell latency on these three routes specifically should start from the Suspense/PPR option above, not reinvent a third approach.

---

## ADR-024 — Product goal is a real product for users, not a portfolio piece

**Status:** Accepted — supersedes ADR-009

**Decision:** Bí Mặc's goal is a real product for end users — people who sign in, build a personal closet of their own photographed clothes, and get AI Stylist recommendations grounded in those clothes — not a two-minute, no-login demo whose audience is freelance prospects evaluating the author's work. When the product needs to be shown to a client, the demo signs in beforehand; a no-login demo path is no longer a requirement anything else has to protect. This supersedes ADR-009, whose "portfolio piece" framing explicitly called itself "the root decision; every other priority ... is derived from it." Recorded against `docs/superpowers/specs/2026-10-31-tu-do-ca-nhan-design.md` §1.

**Reason:** This is the owner's decision, not an inference from the code — §1 of the design spec states the change directly: the project accepted the trade-off of losing the no-login two-minute demo in exchange for building toward a real product, with a longer-term destination (a memory-and-tool-using chat agent that styles outfits from the user's actual closet) that has no path to existing without real accounts and real personal data first. Tasks 1–13 of this plan (Google OAuth, `closet_items`, per-user RLS, remembered questionnaire answers, account deletion) are built on this new root. Recording the change here, rather than leaving ADR-009 standing, keeps the decision log from contradicting what the repository now actually is.

**Consequences:** every decision ADR-009 said was derived from the portfolio framing must be re-examined against the new root, not assumed to still hold. ADR-010 was the clearest case — see ADR-025.

---

## ADR-025 — My Closet requires sign-in; no `localStorage` path

**Status:** Accepted — supersedes ADR-010

**Decision:** My Closet (`/closet` and its `/closet/{items,looks,styles}` children) requires an authenticated Supabase session, gated structurally by ADR-021's `(account)` route group. There is no `localStorage`-based save path: ADR-010 described one, but nothing in `src/` before this plan ever implemented it — grep for a `localStorage` call against saves at the start of this plan found none. Nothing is being removed in code by this decision; the thing being superseded is the stated plan for a no-login save path, not shipped behavior. This supersedes ADR-010. The "auth-to-save" section of `docs/01_PRD.md` that ADR-010 had overridden is back in force.

**Reason:** follows directly from ADR-024. A personal closet of a user's own photographed garments is inherently per-account data in a way a bookmarked catalog item never was: there is no meaningful anonymous, device-local version of "the clothes I photographed last week" that survives a cleared browser, works from a second device, or keeps anyone else from reading someone else's clothing photos. ADR-010's justification — "a login form kills a two-minute portfolio demo" — is exactly the premise ADR-024 retired.

**Consequences:** a signed-out visitor who follows the nav to "Tủ đồ của tôi" sees a one-line explanation plus a sign-in control (ADR-021's layout-level gate), not a working no-login demo and not a bare redirect.

---

## ADR-026 — Saved Bí Mặc catalog items reference slugs as text, not foreign keys

**Status:** Accepted

**Decision:** `saved_items`, `saved_outfits`, and `saved_styles` store the catalog slug as plain text (`item_slug`, `outfit_slug`, `style_slug` respectively) under a `unique (user_id, slug)` constraint, not as a foreign key into a `fashion_items`/`outfits`/`styles` table in Postgres. `docs/04_DATA_MODEL.md`'s original design assumed such catalog tables would exist in Postgres; they do not — the catalog is still TypeScript fixtures in `src/data/fixtures/`. Validity is enforced in the application layer against those fixtures, in two different directions for two different reasons: writing (`toggleSaved*` in `src/features/closet/saved.ts`) rejects a slug that doesn't exist in the fixtures before inserting a row; reading (`listSaved*`) maps a stored row to its fixture record and silently drops it — no thrown error, no placeholder — when that lookup misses.

**Reason:** migrating the entire catalog into Postgres is a separate, larger project (explicitly out of scope per `docs/superpowers/specs/2026-10-31-tu-do-ca-nhan-design.md` §3) that does nothing to serve this plan's actual goal of a working personal closet and account system. Real foreign-key integrity was never reachable without that migration, so choosing text-plus-app-validation is not a shortcut taken instead of a "proper" foreign key — a foreign key had no table to point at.

**Consequences:** a database row can legitimately point at a slug that has since been removed from the fixtures (e.g. a catalog item retired in a later milestone). Every read path must treat a lookup miss as "not found, skip" rather than a data-integrity error — this is Review Focus #4 in `src/features/closet/saved.ts`'s own comments, not an incidental choice. A future migration of the catalog into Postgres must also decide what happens to this slug-text scheme at that point — either backfill real foreign keys or explicitly decide to keep slugs — rather than leaving it unaddressed.

---

## ADR-027 — Garment photos are labelled by AI first; the user edits, and the edit is tracked

**Status:** Accepted

**Decision:** Adding a garment to the personal closet uploads a photo, then calls an AI tagger (`src/lib/ai/tagger.ts`; `tagger-gemini.ts` primary, `tagger-deterministic.ts` fallback) that returns a draft label — name, category, colors, styles, occasions, fit, attributes — constrained to the same enum vocabulary the catalog and the AI Stylist ranker already use (`CategorySlug`, `Occasion`, `Fit`, `ItemAttribute`, and the real color/style slug lists). The user reviews that pre-filled draft and corrects whatever is wrong before saving; there is no path that saves a label without that review screen. `closet_items.label_source` (`'ai' | 'user'`) records which one produced the label currently stored: a freshly-tagged draft starts as `'ai'`, and flips to `'user'` the moment the person editing changes any field by hand (`AddItemForm.tsx`'s `updateDraft`). With no API key configured, or a model error/timeout, the route still answers 200 with an all-but-empty draft and a `degradedReason` — never an error that blocks adding the item.

**Reason:** an empty closet defeats the entire feature — this is named directly as an anti-goal in the design spec (§3): if adding one item required filling out a long form from nothing, users would abandon partway, and the AI Stylist would have nothing of the user's own to rank. A pre-filled, still-editable draft is the shape that keeps the form fast while still guaranteeing a human looks at every label before it's trusted — "AI fills it in, a person is still the one who saves it" is the whole point, not a convenience on top of it. `label_source` is not decorative: a later project (the memory-and-tool chat agent, out of scope for this plan) will need to tell confirmed labels apart from AI guesses that were never reviewed, to know what's safe to ask the user about again rather than trust blindly.

**Consequences:** the tagger's output is Zod-validated against the same closed enum vocabulary the database's check constraints also enforce (`supabase/migrations/0001_account_and_closet.sql`), the same discipline ADR-018 already established for the AI Stylist's own output — a model cannot invent a category or color the catalog doesn't have. The labelling endpoint (`/api/closet/tag`) carries its own per-user daily quota stored in Postgres (`src/features/closet/quota.ts`, migration `0002_ai_usage.sql`), deliberately not the in-memory limiter in `src/lib/rate-limit/` that the AI Stylist route uses — a per-account cost control has to survive instance restarts and be shared across instances on a multi-instance platform, which `src/lib/rate-limit/index.ts`'s own documented limitation says an in-memory counter cannot do.

---

## ADR-028 — Garment photos are stored in a private bucket; body photos sent to the AI Stylist are still never stored

**Status:** Accepted — extends ADR-012

**Decision:** ADR-012 stated, without qualification, that "user photos are never stored." That blanket claim is no longer true for one of the two kinds of photo this product now handles, and the two must not be read as the same thing:

- **Garment photos** — a picture of a piece of clothing, uploaded to build the personal closet — ARE stored, in the private `closet` Supabase Storage bucket, at a path `<user_id>/<file>` that a storage RLS policy ties to the uploader via `storage.foldername(name)` (migration `0001_account_and_closet.sql`). The browser never receives a public URL; every read goes through a short-lived signed URL generated server-side (`signClosetImage`, `src/features/closet/images.ts`).
- **Body photos** — the optional picture of the user sent to the AI Stylist questionnaire, used to ground the style/palette analysis — are NOT stored. ADR-012's original decision stands unchanged here: received in the request, sent to the model, discarded; no bucket, no signed URL, no lifecycle to manage.

**Reason:** these are different kinds of data serving different purposes, and conflating them would understate the privacy guarantee on one and overstate it on the other. A garment photo has to persist — that is the entire point of a personal closet the AI Stylist can rank against on a return visit — so "never store it" was never a guarantee compatible with that feature existing; a private bucket with an RLS-enforced path and server-only signed URLs is the strongest persistence posture available for data that must persist. A body photo has no such reason to outlive the single request it was sent for, so ADR-012's original, stronger guarantee — it is never written anywhere at all — still holds, and matters more here, not less: it is a photograph of a person, not of an object, and `docs/07_SECURITY_PRIVACY.md`'s ban on inferring sensitive personal characteristics from it would be far harder to make credible if the photo itself were sitting in storage somewhere.

**Consequences:** a reader of ADR-012 alone, without this entry, would now draw the wrong conclusion about garment photos — this entry is the correction. `docs/07_SECURITY_PRIVACY.md` and CLAUDE.md's privacy baseline ("never make user photos public by default") apply to both kinds of photo, satisfied by different mechanisms: a body photo satisfies it by not existing past the request; a garment photo satisfies it via bucket privacy + storage RLS + signed URLs that expire. Account deletion (ADR-022) is the garment photo's only designed way to stop existing, which is exactly why that ADR requires the bucket cleanup to run before the auth user is deleted, not after.

---

## ADR-029 — Accounts and the personal closet must not break the no-credentials baseline

**Status:** Accepted

**Decision:** every module this plan added to or around the Supabase seam — `src/lib/supabase/env.ts`, `server.ts`, `client.ts`, `session.ts`, `src/features/account/guard.ts`, the closet repository and labelling route, the account-deletion route — degrades to `null` or a safe, explicitly-handled default instead of throwing when Supabase isn't configured, continuing the contract the seam already held before this plan. Concretely: `getAuthState()` returns `{status: 'unconfigured'}` rather than throwing; `/closet` renders an inline "chưa cấu hình" message instead of crashing or redirecting; the AI Stylist's catalog-only path runs exactly as it did before this plan when there is no session to read personal closet items from. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass with zero Supabase environment variables and no `GOOGLE_GENERATIVE_AI_API_KEY` set.

**Reason:** this requirement predates this plan — CLAUDE.md's "Baseline stack" section already required it ("Do not require live Supabase credentials or a paid AI API to run the basic app locally"). Accounts and a personal closet are the single largest feature this repository has added since that line was written, and the kind of feature most likely to accidentally assume a database connection exists somewhere deep in a call chain — a guard function that forgot to check `isSupabaseConfigured()` before touching `cookies()` or a Supabase client would crash every page for any contributor, or any CI job, that hasn't provisioned a Supabase project. Writing this down as its own decision, instead of leaving it implicit in CLAUDE.md, records that all thirteen tasks before this one were built and reviewed against this constraint on purpose — it is why `createSupabaseServerClient()`/`getSupabaseEnv()` return `null` rather than throwing, and why every caller checks for that `null` before doing anything with it.

**Consequences:** a contributor adding a new authenticated feature must follow the same pattern — check configuration/session state and degrade, never assume a Supabase client call succeeds or even runs. The two integration test files that do need real credentials (`src/lib/supabase/rls.integration.test.ts`, `src/features/account/delete.integration.test.ts`) are the deliberate exception, and they self-skip via `hasServiceRoleEnv()` (`src/lib/supabase/test-env.ts`) precisely so the rest of the suite's "passes with zero Supabase env vars" claim stays true regardless.

---

## Template for new decisions

```text
## ADR-NNN — Title

Status: Proposed | Accepted | Superseded

Decision:

Reason:

Consequences:
```
