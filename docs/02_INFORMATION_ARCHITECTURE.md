# 02 — Information Architecture

## Primary navigation

```text
Trang chủ | Tủ đồ | AI phối đồ | Phối theo style | Tủ đồ của tôi
```

## Route map

```text
/

/wardrobe
/wardrobe/[category]
/wardrobe/[category]/[slug]

/stylist
/stylist/result/[id]        # optional once result persistence exists

/styles
/styles/[slug]

/closet
/closet/items
/closet/looks
/closet/styles

/stories/[slug]

/login
/auth/callback              # if required by chosen auth flow
```

Avoid adding routes until a user-facing requirement needs them.

## Homepage flow

Recommended editorial rhythm:

1. Hero / seasonal editorial feature
2. Trending Now
3. Color Story
4. The Wardrobe / essential items
5. Featured Looks
6. Find Your Style
7. Ask Bí Mặc / AI Stylist
8. Fashion Stories
9. Footer

## Wardrobe discovery flow

```text
Wardrobe index
→ category
→ item detail
→ related outfits/styles/colors
→ save or continue discovery
```

Filters can start simple. MVP does not need faceted-search infrastructure before there is enough catalog content to justify it.

## Style flow

```text
Styles index
→ style detail
→ key palette/items
→ outfit formulas
→ example looks
→ save style OR open AI Stylist
```

## AI Stylist flow

```text
Intro
→ optional photo
→ preference questions
→ consent/privacy reminder
→ analysis/recommendation request
→ result
→ inspect item/style
→ save look
```

## My Closet flow

```text
Saved Items | Saved Looks | Saved Styles
```

Each empty state must offer a useful path back into discovery.

Example:

```text
Bạn chưa lưu outfit nào.
Khám phá các look theo Modern Classic hoặc thử AI phối đồ.
```

## Deep-link principle

Users should be able to share/bookmark public item, style, story, and outfit URLs without requiring session state.
