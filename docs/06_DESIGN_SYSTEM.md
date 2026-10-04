# 06 — Design System

## Brand attributes

Bí Mặc should feel:

- elegant
- feminine without being overly cute
- editorial
- modern
- premium but approachable
- calm and curated

## Avoid

- generic ecommerce layout
- dense product grids as the primary visual language
- gradients for decoration
- excessive pills/badges/icons
- large soft shadows on every element
- glassmorphism
- excessive border radius
- loud microanimations
- too many competing accent colors

## Core color tokens

Initial direction:

```text
Warm Ivory   #F5F0E8
Burgundy     #681F32
Chocolate    #49312B
Soft Taupe   #B7A89B
Ink Black    #151515
```

These are starting tokens, not permission to use all colors in every component.

Recommended semantic roles:

- background: Warm Ivory / neutral variations
- primary text: Ink Black
- primary accent: Burgundy
- secondary accent: Chocolate
- muted/UI supporting tone: Soft Taupe

## Typography

Direction:

- editorial/display headings: fashion-oriented serif
- interface/body copy: highly readable sans-serif

Potential candidates:

- display: Cormorant Garamond or Bodoni Moda
- body: Inter or Manrope

Choose one pair during foundation implementation and record the decision.

### Typography behavior

- large serif headlines should carry hierarchy, not decorative scripts
- body sizes must remain comfortable on mobile
- UI labels/navigation are generally sans-serif
- uppercase may be used sparingly for editorial eyebrow labels

## Layout

Use:

- generous whitespace
- image-forward sections
- thin rules/dividers
- asymmetric grids where they improve editorial rhythm
- clear section pacing
- occasional full-bleed media

Do not wrap every section in a card.

## Image direction

Use portrait/editorial ratios intentionally.

Suggested common ratios:

- hero: landscape or tall editorial crop depending on viewport
- fashion story: 4:5 or 3:4
- look/outfit: 3:4 or 4:5
- item reference: consistent category ratio

Reserve dimensions before image load.

## Component vocabulary

Likely primitives:

- SiteHeader
- MobileNavigation
- EditorialHero
- SectionHeading
- StoryCard (restrained)
- FashionItemTile
- OutfitLook
- ColorSwatch
- StyleFeature
- SaveButton
- EditorialCTA
- Footer

## Interaction

Animation should be subtle:

- modest image scale or opacity change on hover
- understated link underline/reveal
- reduced-motion support

No animation should block content or slow navigation.

## Example homepage tone

Avoid:

> Welcome to Bí Mặc. Discover your fashion style today.

Prefer editorial framing such as:

> THE AUTUMN EDIT
>
> Chocolate, burgundy & the new neutrals.

Vietnamese supporting copy can sit below/alongside editorial English headings when it improves the fashion-magazine tone, but the experience should remain understandable to Vietnamese users.
