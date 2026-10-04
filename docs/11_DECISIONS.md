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

---

## Template for new decisions

```text
## ADR-NNN — Title

Status: Proposed | Accepted | Superseded

Decision:

Reason:

Consequences:
```
