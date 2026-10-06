# 13. Art Direction Spec

This document is the operating procedure for producing Bí Mặc's 35 image files: 34
photographs made by hand in ChatGPT, plus 1 OG share-card crop derived from the hero
image rather than generated separately (see §8). Four of the 34 photographs exist
today — see §9 for exactly which ones and how they were produced; every remaining
image slot in the running app still renders a token-tinted placeholder
(`EditorialImage` with `src: null`). This spec exists so that as the rest of those
34 photographs get made, over several sessions and possibly by more than one person,
they look like they came from one shoot rather than 34 unrelated pictures.

It is not a mood board. Every rule below is written so that a different person
following it lands on a visually matching result. If a sentence could be satisfied by
two visibly different images, it is a bug in this document — see §2 and §6 for the test
applied to catch that.

This spec does not restate the design system. Palette hex values are repeated here
because the prompt block in §6 needs them inline, but typography, layout, spacing, and
UI color roles are owned by `docs/06_DESIGN_SYSTEM.md`. If anything below ever conflicts
with that file on anything other than the five hex values, the design system wins and
this file is wrong.

---

## 1. Absolute rules

These apply to every one of the 34 generated images without exception; none of them
are negotiable per-shot. The 35th file — the OG crop — is not a separate generation
(see §8), so it inherits these rules automatically from the hero image it is cropped
from rather than needing them re-applied.

1. **No identifiable face.** No image shows a face that a viewer could recognize or
   describe. Acceptable framings: cropped at or below the shoulders (head not in
   frame), shot from directly behind, shot from a three-quarter angle with the face
   turned away from camera, or face turned out of frame at the moment of the shot.
   This is the single rule every other rule yields to — if a composition only works
   with the face visible, the composition is wrong, not the rule.

   *Why this is a rule and not a suggestion:* an AI-generated face is the single most
   common visual tell that gives synthetic imagery away — eyes, teeth, and skin texture
   are where generators most often slip. A faceless crop also reads as more editorial on
   its own merits (it is a standard fashion-photography convention, not a workaround).
   Treat this as doing both jobs at once, not as a disguise. This rule is recorded as
   ADR-013 in `docs/11_DECISIONS.md`.

2. **Exactly five colors, and only these five, anywhere in the frame** — garment,
   background, floor, props, everything:
   - Warm Ivory `#F5F0E8`
   - Burgundy `#681F32`
   - Chocolate `#49312B`
   - Soft Taupe `#B7A89B`
   - Ink Black `#151515`

   No sixth color. Not a slightly different cream, not a cooler gray, not a seasonal
   accent. If a generated image contains a color outside this list anywhere in the
   frame — a blue shadow cast by a screen, a green plant leaf in the background, a gold
   zipper pull — it fails review and gets regenerated, not cropped around.

3. **No logos, no visible text, no brand marks** in the frame — not on the garment, not
   on packaging, not on a wall, not on a floor tile.

4. **No jewellery that reflects or sparkles** — no visible metal with specular
   highlights, no stones, no sequins, no glossy hardware catching light. Matte
   accessories that read as part of the outfit (a plain leather belt, the loafer itself
   as a garment item) are fine; anything that throws a bright highlight back at camera
   is not.

5. **No noisy urban background** — no street scenes, no traffic, no visible signage, no
   crowds, no architecture recognizable as a specific city or landmark. Backgrounds are
   restricted to what §3 describes.

---

## 2. Lighting

One soft directional light source, positioned to the side of the subject (not directly
in front, not directly overhead), at an angle that produces a visible but soft-edged
shadow falling away from the light — the kind of shadow a window of diffused daylight
makes, not the hard-edged shadow of direct sun or an on-camera flash.

Concretely: the shadow on the subject's far side from the light should be visible in
every shot (proof the light has a direction), but its edge should be soft rather than a
sharp line (proof the light is diffused, not a bare bulb or flash). No frontal flash —
no light source positioned at or near the camera, which flattens shadows and reads as a
snapshot rather than a shoot.

---

## 3. Background

Flat, unbroken surface in one of the two palette neutrals: Warm Ivory or Soft Taupe.
Acceptable surfaces: a painted or plastered wall, or a length of plain fabric hung or
laid flat. The surface must show no texture detail beyond subtle tonal variation (no
visible brick, wood grain, wallpaper pattern, or fabric weave at a scale the eye
registers).

No props in the frame unless the prop is itself a garment belonging to the outfit being
shot (e.g., the loafer appearing in a full-look outfit shot). No furniture, no plants,
no books, no styling objects, no visible floor transition unless the floor is also a
flat neutral in the same two colors.

---

## 4. Framing and aspect ratio

Four shot types, three fixed ratios between them. These are not stylistic choices — they are the
exact ratios the `EditorialImage` component (`src/components/ui/EditorialImage.tsx`)
renders, and an image delivered at the wrong ratio will be cropped by the browser in a
way nobody checked.

| Shot type | `Ratio` value | Aspect ratio | Used for |
|---|---|---|---|
| Hero | `hero` | 3:2 (landscape) | Homepage hero |
| Story cover | `portrait` | 4:5 (portrait) | Story cover images only |
| Style hero, item, outfit | `look` | 3:4 (portrait) | Style hero images, item shots, outfit shots |

Note that style hero images share the `look` ratio (3:4) with items and outfits, not
the `portrait` ratio (4:5) — confirmed against every call site in `src/`:
`src/app/page.tsx` and `src/app/styles/page.tsx` render style images with `ratio="look"`;
only `src/components/editorial/StoryCard.tsx` uses `ratio="portrait"`.

Generate at the highest resolution ChatGPT offers for the target orientation (roughly
1024×1536 for the two portrait ratios, 1536×1024 for the landscape hero ratio), then
crop to the exact ratio above before saving — ChatGPT's native output ratio is not
guaranteed to equal the target ratio, and the component crops via CSS `object-cover` if
the delivered file doesn't match, which can cut off a garment edge or a hemline you
intended to show. Crop by hand to match the ratio exactly before the file is saved to
`public/images/`.

Note on the hero shot specifically: at 1536×1024, a hero image is adequate for the
homepage layout because the hero occupies half the screen width next to a large serif
type block, not the full width of a desktop viewport. Do not attempt to generate a
wider, full-bleed hero image — the layout does not call for one, and stretching a
1536px-wide source across a full desktop viewport would visibly degrade it.

---

## 5. Post-processing

Warm color grading — the kind of warmth the palette already implies, not an added
orange cast. Medium contrast: shadows should hold detail (not crushed to pure black
except in Ink Black garment areas), highlights should not clip to pure white except on
the Warm Ivory background itself.

No filters, no added film grain, no vignette, no added blur, no color tint overlay. If
ChatGPT's output already looks like it has a filter applied (crushed blacks, a visible
vignette, a color-shifted highlight glow), regenerate rather than accept it — this is a
request-time check, not a fix applied after the fact, since there is no separate
post-processing step in this workflow.

---

## 6. Reusable prompt block

Paste this exact block, verbatim, as the first message in every new ChatGPT thread,
before any image request. It is the single artifact that keeps all 34 separate
generations looking like one shoot. Do not edit it per-shot — if a shot needs something this block
doesn't cover, that detail belongs in the per-image prompt (§7), not in an edited copy
of this block.

```text
You are producing images for a single editorial fashion lookbook. Every image in this
thread must look like it came from the same shoot, same day, same photographer.

Fixed rules for every image:
- No identifiable face. Crop below the shoulders, shoot from behind, from the side, or
  with the face out of frame. This rule is absolute.
- Colour palette limited to: warm ivory #F5F0E8, burgundy #681F32, chocolate brown
  #49312B, soft taupe #B7A89B, ink black #151515. No other hues, including in the
  background.
- Lighting: one soft directional source from the side. No frontal flash. Shadows soft
  but with a clear direction.
- Background: flat ivory or soft-taupe wall or fabric. No props unless the prop is a
  garment in the outfit. No urban scenery, no plants, no furniture.
- No logos, no text, no visible branding, no sparkling jewellery.
- Grading: warm, medium contrast, natural skin. No filters, no fake film grain, no
  heavy vignette.
- Subject: adult woman, Vietnamese, relaxed natural posture, not a runway pose.

Confirm you understand, then wait for the first image request.
```

**Check applied to this block before locking it:** read only the block above, with no
other context, and ask whether a person with no other context could produce an
on-tone, on-palette, faceless image from it alone. Every instruction in it resolves to
something checkable in the finished image (a color against a hex value, a shadow
present or absent, a face in frame or not, a background flat or not) — none of it
depends on the reader's taste. That is why it is reproduced here exactly as drafted,
with no rewrite.

---

## 7. Per-image-type prompt templates

These are pasted into the thread *after* the block in §6 has been confirmed, one at a
time. Fill in the bracketed placeholder; everything else is the fixed template for that
shot type. Each template states what the shot physically *is* — framing, distance, what
occupies the frame — not how it should feel, because "feel" is not checkable and
"occupies the left two-thirds of the frame at this distance" is.

### 7.1 Hero

```text
Generate a landscape image, final crop 3:2.

Shot: [subject/garment], photographed from a medium distance so the subject occupies
the center 50–60% of the frame width, with the remaining width on both sides filled by
plain background rather than any other object. Subject facing [direction — e.g.
three-quarter away from camera / walking away from camera]. Full body or three-quarter
body in frame, feet not necessarily visible. This image sits in its own half of the
homepage grid next to a separate text block — it is not overlaid with type, so the
frame does not need to reserve empty space for a headline.

Background: flat [warm ivory / soft taupe] wall, no visible horizon line, no floor
texture detail.
```

### 7.2 Style hero

```text
Generate a portrait image, final crop 3:4.

Shot: [style name] look, [1–3 garment items that define this style] worn by the
subject, photographed from the waist up, garment filling roughly the center two-thirds
of the frame vertically. Camera at chest height, subject turned [three-quarter away /
in profile] so no face is visible. Hands and arms may enter frame but are not the
subject of the shot.

Background: flat [warm ivory / soft taupe] wall, subject positioned at least one meter
in front of it so a soft shadow falls clearly to one side.
```

### 7.3 Item

```text
Generate a portrait image, final crop 3:4.

Shot: [item name] only, laid flat or worn on a faceless/cropped mannequin-like pose so
the entire garment is visible and fills roughly 70% of the frame height, centered.
No other garment layered over it. [If worn: cropped at the shoulders or below, no head
in frame.]

Background: flat [warm ivory] wall or fabric directly behind the item, no shadow cast
by any other object, no props.
```

### 7.4 Outfit

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — [list every item slug in the outfit] — worn together by the
subject, photographed from mid-thigh up to below the shoulders (no head in frame),
subject occupying the center 50% of the frame width, standing in a relaxed natural
stance, weight on one leg, not a runway pose.

Reference image attached: the generated image for [item slug] from this same thread.
Keep that garment's color, cut, and texture identical to the reference — do not
redesign it.

Background: flat [warm ivory / soft taupe] wall, soft directional shadow visible on one
side of the subject.
```

---

## 8. File naming convention

Save every delivered image as:

```
public/images/<kind>/<slug>.jpg
```

where `<kind>` is one of `hero`, `styles`, `items`, `outfits`, `stories`, or `og`, and
`<slug>` is the exact slug used in the matching fixture file under
`src/data/fixtures/` (the `og` kind has no fixture — see below). A later task points
fixture `image` fields at these paths, so the slug must match character for
character — no translation, no reformatting, no trailing variation.

Slugs confirmed against the fixtures as of this writing — this list is the M0+M1
fixture inventory, not the full 34-image generation budget. It covers 7 items, 5
styles, 3 outfits, and 3 stories because that is all the current fixture set
contains; the catalog expansion that reaches 15 items and 10 outfits (the sizes that
add up to the 34 generated photographs in §1/§6) lands in a later milestone. When
that expansion adds fixture entries, extend this list with their slugs the same
way — the `<kind>/<slug>.jpg` convention above is the durable part, this list is a
snapshot of it.

- **items** (`src/data/fixtures/items.ts`): `ao-cardigan`, `so-mi-trang`, `ao-lua`,
  `quan-wide-leg-chocolate`, `chan-vay-midi`, `blazer`, `loafer`
  → e.g. `public/images/items/so-mi-trang.jpg`
- **styles** (`src/data/fixtures/styles.ts`): `modern-classic`, `quiet-luxury`,
  `minimalist`, `soft-feminine`, `casual-chic`
  → e.g. `public/images/styles/modern-classic.jpg`
- **outfits** (`src/data/fixtures/outfits.ts`): `modern-classic-di-lam`,
  `soft-feminine-cuoi-tuan`, `quiet-luxury-ngay-thuong`
  → e.g. `public/images/outfits/modern-classic-di-lam.jpg`
- **stories** (`src/data/fixtures/stories.ts`): `mua-thu-nay-mac-mau-gi`,
  `chocolate-brown`, `so-mi-trang-phoi-the-nao`
  → e.g. `public/images/stories/mua-thu-nay-mac-mau-gi.jpg`
- **hero**: `thu-2026` (the homepage hero) → `public/images/hero/thu-2026.jpg`. This
  slug does not yet exist in a fixture file — it is wired by a later task — but the
  path is fixed now so that task has a stable target.

**The OG image is not a 35th generation — it is a crop of the hero.** Social-share
cards use a 1200×630 (1.91:1) frame, which is close enough to the hero's 3:2 (1.5:1)
that it crops cleanly without a second ChatGPT session. After the hero image
(`public/images/hero/thu-2026.jpg`) is generated and approved, crop it to exactly
1200×630 and save the result separately at `public/images/og/thu-2026.jpg`. This file
is the 35th of the 35 total files this spec accounts for, but it costs zero additional
generations — the budget is 34 generated photographs plus this 1 derived crop.

---

## 9. Workflow and prompt log

**Threading.** One ChatGPT thread per set (items, styles, outfits, stories, hero — five
threads, not 34). Paste the §6 block as the first message in each thread and wait for
confirmation before sending the first image prompt. Keeping each kind in its own thread
means every image in that thread shares the same conversation-level context, which is
what keeps, say, all six items looking like the same product shoot. The OG card is not
a sixth thread: it is produced by cropping the already-generated hero image (§8), not
by a new ChatGPT generation, so it needs no thread of its own.

**Order within the items/outfits relationship.** Generate every item image before
generating any outfit image that depends on it. When generating an outfit shot, attach
the already-generated item image(s) for that outfit as reference input (per the
template in §7.4) and explicitly instruct the model to keep that garment's color, cut,
and texture unchanged. This is reference-image conditioning, not a text description of
the item — attach the file, do not just describe it again in words, since the point is
pixel-level consistency between the item shot and the outfit shot, not merely matching
descriptions.

**No promise of exact pixel match.** Item shots and outfit shots are two different
layers (product-style shot vs. worn look) and are not expected to match pixel-for-pixel
even with reference conditioning — real fashion lookbooks show the same divergence
between product photography and editorial photography. The reference image's job is to
keep the garment recognizably the same piece, not to guarantee an identical render.

**Prompt log.** Record every prompt actually used — the exact text sent, not a
paraphrase — so a future regeneration can reproduce or deliberately deviate from what
shipped. Append entries below as images are produced.

### Log

**First batch (4 images).** Produced `hero/thu-2026.jpg` (hero, 3:2), a tighter 3:4
crop of the same look (now `styles/quiet-luxury.jpg`), a flat-lay of the burgundy
cardigan, and the full look worn with chocolate wide-leg trousers. All four read as
one shoot: same cardigan, same ivory background, same lighting, no recognizable face.
Reference-image conditioning worked as intended — the cardigan is identifiable across
the hero, the flat-lay, and the worn outfit shot.

The hero and the flat-lay matched their intended fixture slots directly. The other
two did not: the flat-lay's filename (`ao-cardigan`) had no matching item record, and
the worn-outfit photo showed a cardigan + wide-leg trousers while the only outfit
slug available for that layout (`soft-feminine-cuoi-tuan`) was defined as a silk
blouse + midi skirt + loafers — a different garment set. Rather than regenerate
images to fit the existing fixtures, the fixtures were adjusted to match what was
actually photographed: a new `ao-cardigan` item record was added, a new
`quiet-luxury-ngay-thuong` outfit record was added pairing it with the existing
`quan-wide-leg-chocolate` item, and the tighter 3:4 crop was repointed to the
`quiet-luxury` style slot (`styles/quiet-luxury.jpg`). `soft-feminine-cuoi-tuan`
was left untouched with `image: null`.

**Gap: per-image timing not captured.** M1's second exit criterion (spec §8:
"4 tấm nhìn ra một bộ; biết thời gian thật cho mỗi tấm") requires knowing the real
time cost per image, because M1 exists to price the remaining 30 photographs
before committing to them. That number was not recorded during this batch and
cannot be reconstructed after the fact — only the person who generated the images
knows it. Any M2 photography effort estimate derived from this batch is
**ungrounded** until it is supplied.

`PER_IMAGE_TIME_MINUTES: <TODO — fill in from the session that produced the first
batch; one figure per image or one average across the 4, whichever is accurate>`

**Gap: verbatim prompts not recorded.** The narrative above summarizes what was
generated, but §9's own instruction ("Record every prompt actually used — the
exact text sent, not a paraphrase") was not followed for this batch — the actual
per-image prompt text sent into ChatGPT was not saved. Do not treat the narrative
summary above as a substitute; it cannot be pasted into a new thread to reproduce
or deviate from what shipped.

`VERBATIM_PROMPTS: <TODO — the exact §6 block confirmation plus each §7.x prompt
actually sent for hero/thu-2026, styles/quiet-luxury, items/ao-cardigan, and
outfits/quiet-luxury-ngay-thuong, in the order they were sent>`

Neither figure is fabricated here; both are left as explicit placeholders so M2
planning does not silently treat this batch as fully priced or fully reproducible.
