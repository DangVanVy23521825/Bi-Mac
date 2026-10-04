# 10 — MVP Acceptance Criteria

The MVP is complete when the following observable behaviors exist.

## Global

- Site is responsive on modern mobile and desktop widths.
- Main navigation reaches all five core product areas.
- Visual language is consistent with the Bí Mặc design spec.
- No core route requires ecommerce behavior.
- Loading/error/empty states exist where network/user state requires them.

## Home

- Contains editorial hero, trends/color/wardrobe content, style CTA, AI CTA, and stories.
- Featured content links to real domain routes rather than dead cards.

## Wardrobe

- User can browse categories.
- User can open an item detail page.
- Item page explains styling, avoidance guidance, occasions/styles/colors, and related outfits.
- Related entities are clickable.

## Styles

- User can browse the initial style set.
- Style detail contains palette, key items, principles, and example outfits.
- Style page can lead to Wardrobe, an outfit, and AI Stylist.

## My Closet

- Anonymous user is given a clear login path.
- Authenticated user can save and unsave an item, outfit, and style.
- Saved data persists across a fresh session.
- User A cannot read/write User B's saved data.

## AI Stylist

- User can complete a recommendation flow without uploading a photo.
- User may optionally upload a supported photo privately.
- Questionnaire captures required preferences.
- AI/mock output is schema validated.
- Recommendation stage resolves against known Bí Mặc item/style/outfit identifiers.
- Result page contains style direction, palette, recommended pieces/looks, and short explanations.
- Provider failure has a graceful fallback path.

## Privacy/security

- No real secret exists in committed files.
- User images are not public by default.
- User-owned database tables use RLS.
- Server authorizes user-owned mutations.

## Engineering quality

The following pass in the release candidate environment:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Critical Playwright flows pass where configured.

No unresolved high-severity bug remains in a core MVP flow.
