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

## Template for new decisions

```text
## ADR-NNN — Title

Status: Proposed | Accepted | Superseded

Decision:

Reason:

Consequences:
```
