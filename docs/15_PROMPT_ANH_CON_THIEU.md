# 15. Prompt cho 30 ảnh còn thiếu

Tài liệu thao tác, không phải spec. `docs/13_ART_DIRECTION.md` vẫn là nguồn chân lý
về art direction; file này chỉ điền sẵn các template §6/§7 của nó bằng dữ liệu thật
trong `src/data/fixtures/`, để 30 ảnh còn thiếu không phải soạn lại prompt từ đầu
mỗi lần.

Trạng thái khi viết: 4/34 ảnh đã có (`hero/thu-2026`, `styles/quiet-luxury`,
`items/ao-cardigan`, `outfits/quiet-luxury-ngay-thuong`). Còn **30**: 14 item,
4 style, 9 outfit, 3 story.

## Cách dùng

1. Mở một thread mới cho **mỗi nhóm** (items, styles, outfits, stories — 4 thread).
   Lý do ở §9 của spec: ngữ cảnh chung trong một thread là thứ giữ cả nhóm trông
   như cùng một buổi chụp.
2. Dán **khối A** dưới đây làm tin nhắn đầu tiên, đợi model xác nhận.
3. Dán từng prompt trong nhóm, mỗi lần một cái.
4. Duyệt theo checklist §F trước khi lưu. Trượt thì gen lại, **không crop chữa**
   (spec §1.2).
5. Lưu đúng `public/images/<kind>/<slug>.jpg`, crop đúng tỉ lệ trước khi lưu.

**Thứ tự bắt buộc: items → styles → outfits → stories.** 9 prompt outfit đều yêu
cầu đính ảnh item đã gen làm reference (spec §7.4), nên không chạy outfit trước item
được.

## Bảng màu (slug fixture → hex khoá)

| colorSlug | Tên | Hex |
|---|---|---|
| `kem` | Warm Ivory | `#F5F0E8` |
| `burgundy` | Burgundy | `#681F32` |
| `chocolate` | Chocolate | `#49312B` |
| `be-xam` | Soft Taupe | `#B7A89B` |
| `den` | Ink Black | `#151515` |

Nền mỗi tấm chọn neutral **tương phản** với món đồ: đồ tông kem → nền taupe; đồ
tông taupe/chocolate/đen/burgundy → nền ivory. Spec §3 cho phép cả hai.

---

## A. Khối mở thread (dán verbatim, đầu mỗi thread)

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

---

## B. Items — 14 ảnh, tỉ lệ 3:4 → `public/images/items/<slug>.jpg`

Mỗi prompt theo template §7.3.

### B1 · `so-mi-trang` — Sơ mi trắng

```text
Generate a portrait image, final crop 3:4.

Shot: a warm ivory #F5F0E8 cotton poplin button-down shirt only, structured collar,
centre button placket, lightly darted waist, long sleeves, fabric thick enough to hold
its shape. Laid flat so the entire garment is visible and fills roughly 70% of the
frame height, centered. No other garment layered over it.

Background: flat soft taupe #B7A89B fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B2 · `ao-lua` — Áo lụa

```text
Generate a portrait image, final crop 3:4.

Shot: a warm ivory #F5F0E8 silk blouse only, thin fabric with natural fluid drape and a
soft low sheen across the surface, relaxed cut with no structured shoulder, falling in
long soft folds rather than holding a block shape. Laid flat so the entire garment is
visible and fills roughly 70% of the frame height, centered. No other garment layered
over it.

Background: flat soft taupe #B7A89B fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B3 · `quan-wide-leg-chocolate` — Quần wide-leg chocolate

```text
Generate a portrait image, final crop 3:4.

Shot: a pair of chocolate brown #49312B wide-leg trousers only, high waist, leg equally
wide from thigh to hem with no taper and no break at the knee, hanging as one straight
vertical line. Laid flat so the entire garment is visible and fills roughly 70% of the
frame height, centered. No other garment layered over it.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B4 · `chan-vay-midi` — Chân váy midi

```text
Generate a portrait image, final crop 3:4.

Shot: a soft taupe #B7A89B midi skirt only, hem falling to mid-calf, relaxed cut with
soft vertical drape and no visible structure at the waistband. Laid flat so the entire
garment is visible and fills roughly 70% of the frame height, centered. No other
garment layered over it.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B5 · `blazer` — Blazer

```text
Generate a portrait image, final crop 3:4.

Shot: an ink black #151515 single-breasted blazer only, lightly padded structured
shoulder forming a clear horizontal line, fitted through chest and waist, buttoned
front, fabric with high stiffness holding its shape. Laid flat so the entire garment is
visible and fills roughly 70% of the frame height, centered. No other garment layered
over it.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B6 · `loafer` — Loafer

```text
Generate a portrait image, final crop 3:4.

Shot: a pair of chocolate brown #49312B leather loafers only, closed square-ish toe, no
laces, low but substantial sole, entirely matte leather with no metal hardware and no
buckle. Placed side by side, the pair filling roughly 70% of the frame height,
centered.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B7 · `ao-det-kim-mong` — Áo dệt kim mỏng

```text
Generate a portrait image, final crop 3:4.

Shot: a warm ivory #F5F0E8 fine-gauge knit top only, slim knit yarn, light body-skimming
fit without compression, visible fine knit texture at close range but smooth in
silhouette, long sleeves. Laid flat so the entire garment is visible and fills roughly
70% of the frame height, centered. No other garment layered over it.

Background: flat soft taupe #B7A89B fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B8 · `quan-au` — Quần âu

```text
Generate a portrait image, final crop 3:4.

Shot: a pair of ink black #151515 tailored trousers only, sharp centre crease running
straight from knee to hem, gently tapered leg, mid-rise waistband, fabric stiff enough
to hold the crease. Laid flat so the entire garment is visible and fills roughly 70% of
the frame height, centered. No other garment layered over it.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B9 · `shirt-dress` — Shirt dress

```text
Generate a portrait image, final crop 3:4.

Shot: a warm ivory #F5F0E8 shirt dress only, buttoned from collar to hem, structured
collar and centre placket carried over from a shirt, relaxed body with no deep waist
dart, hem below the knee. Laid flat so the entire garment is visible and fills roughly
70% of the frame height, centered. No other garment layered over it, no belt.

Background: flat soft taupe #B7A89B fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B10 · `slip-dress` — Slip dress

```text
Generate a portrait image, final crop 3:4.

Shot: a burgundy #681F32 bias-cut slip dress only, thin shoulder straps, no sleeves, no
collar, no button placket, no shoulder structure, the fabric falling in soft diagonal
folds that follow the bias. Laid flat so the entire garment is visible and fills roughly
70% of the frame height, centered. No other garment layered over it.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B11 · `a-line-dress` — A-line dress

```text
Generate a portrait image, final crop 3:4.

Shot: a warm ivory #F5F0E8 A-line dress only, sleeveless, gently flaring from the waist
to the hem into a clear A silhouette, fabric stiffer than silk so the flare holds its
shape, light waist seam defining the shape without a separate belt. Laid flat so the
entire garment is visible and fills roughly 70% of the frame height, centered. No other
garment layered over it.

Background: flat soft taupe #B7A89B fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B12 · `trench-coat` — Trench coat

```text
Generate a portrait image, final crop 3:4.

Shot: a soft taupe #B7A89B trench coat only, length falling past the hip toward the
knee, wide notched lapel collar, detachable waist belt left untied and hanging loose,
relaxed body with no waist suppression, no shoulder padding. Laid flat so the entire
garment is visible and fills roughly 70% of the frame height, centered. All hardware
matte, no shine.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B13 · `ballet-flat` — Ballet flat

```text
Generate a portrait image, final crop 3:4.

Shot: a pair of ink black #151515 ballet flats only, rounded toe, flat sole, soft thin
upper that reads noticeably lighter and more flexible than a loafer, no metal hardware,
no buckle, entirely matte. Placed side by side, the pair filling roughly 70% of the
frame height, centered.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

### B14 · `tui-co-ket-cau` — Túi có kết cấu

```text
Generate a portrait image, final crop 3:4.

Shot: a chocolate brown #49312B structured handbag only, rigid frame holding a fixed
rectangular shape with no slump, clearly defined stitched seams, short top handle,
entirely matte leather with no metal clasp, no buckle, no shine. Standing upright,
filling roughly 70% of the frame height, centered.

Background: flat warm ivory #F5F0E8 fabric directly behind the item, no shadow cast by
any other object, no props.
```

---

## C. Styles — 4 ảnh, tỉ lệ 3:4 → `public/images/styles/<slug>.jpg`

Theo template §7.2. Lưu ý style hero dùng ratio `look` (3:4), **không** phải 4:5 —
spec §4 đã xác nhận điều này với mọi call site trong `src/`.

### C1 · `modern-classic` — "Đường cắt gọn, màu tiết chế, mặc được mười năm không cũ."

```text
Generate a portrait image, final crop 3:4.

Shot: Modern Classic look — a warm ivory #F5F0E8 cotton poplin shirt tucked into
chocolate brown #49312B high-waisted wide-leg trousers — worn by the subject,
photographed from the waist up, garment filling roughly the centre two-thirds of the
frame vertically. Camera at chest height, subject turned three-quarter away from camera
so no face is visible. Hands and arms may enter frame but are not the subject of the
shot.

Background: flat soft taupe #B7A89B wall, subject positioned at least one meter in
front of it so a soft shadow falls clearly to one side.
```

### C2 · `minimalist` — "Ít chi tiết nhất có thể, nhưng mỗi chi tiết đều đúng chỗ."

```text
Generate a portrait image, final crop 3:4.

Shot: Minimalist look — a warm ivory #F5F0E8 fine-gauge knit top with ink black #151515
tailored trousers, no visible buttons, no pockets, no trim, no detail other than the
seams themselves — worn by the subject, photographed from the waist up, garment filling
roughly the centre two-thirds of the frame vertically. Camera at chest height, subject
in profile so no face is visible. Hands and arms may enter frame but are not the subject
of the shot.

Background: flat soft taupe #B7A89B wall, subject positioned at least one meter in front
of it so a soft shadow falls clearly to one side.
```

### C3 · `soft-feminine` — "Mềm mà không ngọt. Dáng rủ, màu ấm, đường viền nhẹ."

```text
Generate a portrait image, final crop 3:4.

Shot: Soft Feminine look — a warm ivory #F5F0E8 silk blouse with fluid drape worn under
an open burgundy #681F32 knitted cardigan, soft edges throughout, no structured shoulder
anywhere in the look — worn by the subject, photographed from the waist up, garment
filling roughly the centre two-thirds of the frame vertically. Camera at chest height,
subject turned three-quarter away from camera so no face is visible. Hands and arms may
enter frame but are not the subject of the shot.

Background: flat warm ivory #F5F0E8 wall, subject positioned at least one meter in front
of it so a soft shadow falls clearly to one side.
```

### C4 · `casual-chic` — "Thoải mái nhưng vẫn có chủ ý. Thường ngày mà không tạm bợ."

```text
Generate a portrait image, final crop 3:4.

Shot: Casual Chic look — a warm ivory #F5F0E8 fine-gauge knit top under an open soft
taupe #B7A89B trench coat with its belt hanging loose and untied — worn by the subject,
photographed from the waist up, garment filling roughly the centre two-thirds of the
frame vertically. Camera at chest height, subject turned three-quarter away from camera
so no face is visible. Hands and arms may enter frame but are not the subject of the
shot.

Background: flat warm ivory #F5F0E8 wall, subject positioned at least one meter in front
of it so a soft shadow falls clearly to one side.
```

---

## D. Outfits — 9 ảnh, tỉ lệ 3:4 → `public/images/outfits/<slug>.jpg`

Theo template §7.4. **Mỗi prompt phải đính kèm ảnh item đã gen ở mục B làm file
reference** — đính file thật, không mô tả lại bằng chữ (spec §9). Dòng reference
trong mỗi prompt ghi rõ cần đính tấm nào.

### D1 · `modern-classic-di-lam` — Modern Classic đi làm

Đính kèm: `items/so-mi-trang.jpg`, `items/quan-wide-leg-chocolate.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — so-mi-trang (warm ivory cotton poplin shirt), quan-wide-leg-chocolate
(chocolate brown high-waisted wide-leg trousers), loafer (chocolate brown matte leather
loafers), tui-co-ket-cau (chocolate brown structured handbag, short handle) — worn
together by the subject, photographed from mid-thigh up to below the shoulders (no head
in frame), subject occupying the centre 50% of the frame width, standing in a relaxed
natural stance, weight on one leg, not a runway pose.

Reference images attached: the generated item images for so-mi-trang and
quan-wide-leg-chocolate from this same project. Keep those garments' colour, cut, and
texture identical to the references — do not redesign them.

Background: flat soft taupe #B7A89B wall, soft directional shadow visible on one side of
the subject.
```

### D2 · `so-mi-chan-vay-thanh-lich` — Sơ mi chân váy thanh lịch

Đính kèm: `items/so-mi-trang.jpg`, `items/chan-vay-midi.jpg`, `items/blazer.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — so-mi-trang (warm ivory cotton poplin shirt), chan-vay-midi (soft
taupe mid-calf skirt), blazer (ink black structured-shoulder blazer worn open over the
shirt), loafer (chocolate brown matte leather loafers) — worn together by the subject,
photographed from mid-thigh up to below the shoulders (no head in frame), subject
occupying the centre 50% of the frame width, standing in a relaxed natural stance,
weight on one leg, not a runway pose.

Reference images attached: the generated item images for so-mi-trang, chan-vay-midi and
blazer from this same project. Keep those garments' colour, cut, and texture identical
to the references — do not redesign them.

Background: flat warm ivory #F5F0E8 wall, soft directional shadow visible on one side of
the subject.
```

### D3 · `soft-feminine-cuoi-tuan` — Soft Feminine cuối tuần

Đính kèm: `items/ao-lua.jpg`, `items/chan-vay-midi.jpg`, `items/ao-cardigan.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — ao-lua (warm ivory silk blouse with fluid drape), chan-vay-midi
(soft taupe mid-calf skirt), ao-cardigan (burgundy knitted cardigan worn open over the
blouse), ballet-flat (ink black flat rounded-toe shoes) — worn together by the subject,
photographed from mid-thigh up to below the shoulders (no head in frame), subject
occupying the centre 50% of the frame width, standing in a relaxed natural stance,
weight on one leg, not a runway pose.

Reference images attached: the generated item images for ao-lua, chan-vay-midi and the
existing ao-cardigan image from this same project. Keep those garments' colour, cut, and
texture identical to the references — do not redesign them.

Background: flat warm ivory #F5F0E8 wall, soft directional shadow visible on one side of
the subject.
```

### D4 · `ao-lua-quan-au-buoi-toi` — Áo lụa quần âu buổi tối

Đính kèm: `items/ao-lua.jpg`, `items/quan-au.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — ao-lua (warm ivory silk blouse with fluid drape, tucked in),
quan-au (ink black tailored trousers with a sharp centre crease), loafer (chocolate
brown matte leather loafers), tui-co-ket-cau (chocolate brown structured handbag) —
worn together by the subject, photographed from mid-thigh up to below the shoulders (no
head in frame), subject occupying the centre 50% of the frame width, standing in a
relaxed natural stance, weight on one leg, not a runway pose.

Reference images attached: the generated item images for ao-lua and quan-au from this
same project. Keep those garments' colour, cut, and texture identical to the
references — do not redesign them.

Background: flat soft taupe #B7A89B wall, soft directional shadow visible on one side of
the subject.
```

### D5 · `minimalist-det-kim-quan-au` — Minimalist dệt kim quần âu

Đính kèm: `items/ao-det-kim-mong.jpg`, `items/quan-au.jpg`, `items/blazer.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — ao-det-kim-mong (warm ivory fine-gauge knit top), quan-au (ink black
tailored trousers with a sharp centre crease), blazer (ink black structured-shoulder
blazer worn open), tui-co-ket-cau (chocolate brown structured handbag) — worn together
by the subject, photographed from mid-thigh up to below the shoulders (no head in
frame), subject occupying the centre 50% of the frame width, standing in a relaxed
natural stance, weight on one leg, not a runway pose.

Reference images attached: the generated item images for ao-det-kim-mong, quan-au and
blazer from this same project. Keep those garments' colour, cut, and texture identical
to the references — do not redesign them.

Background: flat warm ivory #F5F0E8 wall, soft directional shadow visible on one side of
the subject.
```

### D6 · `casual-chic-trench` — Casual Chic khoác trench

Đính kèm: `items/ao-det-kim-mong.jpg`, `items/quan-wide-leg-chocolate.jpg`, `items/trench-coat.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — ao-det-kim-mong (warm ivory fine-gauge knit top),
quan-wide-leg-chocolate (chocolate brown high-waisted wide-leg trousers), trench-coat
(soft taupe trench coat worn open with the belt hanging loose), ballet-flat (ink black
flat rounded-toe shoes) — worn together by the subject, photographed from mid-thigh up
to below the shoulders (no head in frame), subject occupying the centre 50% of the frame
width, standing in a relaxed natural stance, weight on one leg, not a runway pose.

Reference images attached: the generated item images for ao-det-kim-mong,
quan-wide-leg-chocolate and trench-coat from this same project. Keep those garments'
colour, cut, and texture identical to the references — do not redesign them.

Background: flat warm ivory #F5F0E8 wall, soft directional shadow visible on one side of
the subject.
```

### D7 · `shirt-dress-blazer-di-lam` — Shirt dress blazer đi làm

Đính kèm: `items/shirt-dress.jpg`, `items/blazer.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — shirt-dress (warm ivory button-through shirt dress), blazer (ink
black structured-shoulder blazer worn open over the dress), loafer (chocolate brown
matte leather loafers), tui-co-ket-cau (chocolate brown structured handbag) — worn
together by the subject, photographed from mid-thigh up to below the shoulders (no head
in frame), subject occupying the centre 50% of the frame width, standing in a relaxed
natural stance, weight on one leg, not a runway pose.

Reference images attached: the generated item images for shirt-dress and blazer from
this same project. Keep those garments' colour, cut, and texture identical to the
references — do not redesign them.

Background: flat soft taupe #B7A89B wall, soft directional shadow visible on one side of
the subject.
```

### D8 · `slip-dress-trench-buoi-toi` — Slip dress trench buổi tối

Đính kèm: `items/slip-dress.jpg`, `items/trench-coat.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — slip-dress (burgundy bias-cut slip dress with thin straps),
trench-coat (soft taupe trench coat worn open over it with the belt hanging loose),
ballet-flat (ink black flat rounded-toe shoes) — worn together by the subject,
photographed from mid-thigh up to below the shoulders (no head in frame), subject
occupying the centre 50% of the frame width, standing in a relaxed natural stance,
weight on one leg, not a runway pose.

Reference images attached: the generated item images for slip-dress and trench-coat from
this same project. Keep those garments' colour, cut, and texture identical to the
references — do not redesign them.

Background: flat warm ivory #F5F0E8 wall, soft directional shadow visible on one side of
the subject.
```

### D9 · `a-line-dress-cardigan` — A-line dress cardigan

Đính kèm: `items/a-line-dress.jpg`, `items/ao-cardigan.jpg`

```text
Generate a portrait image, final crop 3:4.

Shot: full outfit — a-line-dress (warm ivory sleeveless A-line dress), ao-cardigan
(burgundy knitted cardigan worn open over the dress), ballet-flat (ink black flat
rounded-toe shoes), tui-co-ket-cau (chocolate brown structured handbag) — worn together
by the subject, photographed from mid-thigh up to below the shoulders (no head in
frame), subject occupying the centre 50% of the frame width, standing in a relaxed
natural stance, weight on one leg, not a runway pose.

Reference images attached: the generated item image for a-line-dress and the existing
ao-cardigan image from this same project. Keep those garments' colour, cut, and texture
identical to the references — do not redesign them.

Background: flat soft taupe #B7A89B wall, soft directional shadow visible on one side of
the subject.
```

---

## E. Stories — 3 ảnh, tỉ lệ 4:5 → `public/images/stories/<slug>.jpg`

> **Lưu ý: `docs/13_ART_DIRECTION.md` §7 không có template cho story cover.** Spec chỉ
> định nghĩa §7.1 hero, §7.2 style, §7.3 item, §7.4 outfit — trong khi §4 lại yêu cầu
> story cover ở ratio `portrait` (4:5), tỉ lệ duy nhất không template nào phủ. Template
> dưới đây là **đề xuất bổ sung §7.5**, do tôi soạn theo đúng cấu trúc của bốn template
> kia (nói shot *là gì* về mặt vật lý, không nói nó *gợi cảm giác gì*). Nếu bạn duyệt,
> nó nên được chép ngược vào spec thành §7.5 thay vì chỉ sống ở file này.

Template đề xuất §7.5:

```text
Generate a portrait image, final crop 4:5.

Shot: [chủ đề bài viết, diễn đạt thành vật thể cụ thể trong khung], photographed so the
subject occupies the centre 60% of the frame width. Subject turned [hướng] so no face is
visible, or no person in frame at all if the subject is garments only. This image is a
cover thumbnail shown at small size — the frame must read clearly when reduced to about
400px wide, so no fine detail carries meaning.

Background: flat [warm ivory / soft taupe] wall or fabric, no horizon line, no floor
texture detail.
```

### E1 · `mua-thu-nay-mac-mau-gi` — "Mùa thu này mặc màu gì?"

```text
Generate a portrait image, final crop 4:5.

Shot: three folded garments stacked flat in a neat vertical pile — a chocolate brown
#49312B knit, a burgundy #681F32 knit, and a soft taupe #B7A89B knit, in that order top
to bottom — so all three colours are visible as clean horizontal bands. No person in
frame. The stack occupies the centre 60% of the frame width. This image is a cover
thumbnail shown at small size, so no fine detail carries meaning.

Background: flat warm ivory #F5F0E8 fabric, no horizon line, no floor texture detail.
```

### E2 · `chocolate-brown` — "Chocolate Brown: từ màu khó mặc đến neutral mới"

```text
Generate a portrait image, final crop 4:5.

Shot: a single chocolate brown #49312B wool garment filling the frame as a close texture
study, photographed close enough that the weave and the soft folds of the fabric are the
entire subject. No person in frame, no garment edge or hem visible, no second colour
anywhere. The fabric occupies the full frame.

Background: not visible — the fabric fills the frame edge to edge.
```

### E3 · `so-mi-trang-phoi-the-nao` — "Một chiếc sơ mi trắng có thể phối như thế nào?"

```text
Generate a portrait image, final crop 4:5.

Shot: one warm ivory #F5F0E8 cotton poplin shirt laid flat at the centre of the frame,
with four bottom garments fanned below it in a row — chocolate brown #49312B wide-leg
trousers, soft taupe #B7A89B midi skirt, ink black #151515 tailored trousers, and a
second soft taupe #B7A89B skirt — each only partly visible as a folded edge, so the
shirt stays the clear subject. No person in frame. This image is a cover thumbnail shown
at small size, so no fine detail carries meaning.

Background: flat soft taupe #B7A89B fabric, no horizon line, no floor texture detail.
```

---

## F. Checklist duyệt từng tấm

Áp dụng trước khi lưu. Trượt bất kỳ dòng nào → **gen lại**, không crop chữa (spec §1.2).

- [ ] Không có khuôn mặt nhận diện được (§1.1 — luật mọi luật khác phải nhường)
- [ ] Không có màu thứ 6 ở bất kỳ đâu trong khung, kể cả nền, sàn, bóng đổ (§1.2)
- [ ] Không logo, không chữ, không brand mark (§1.3)
- [ ] Không trang sức/kim loại bắt sáng (§1.4)
- [ ] Nền phẳng, một màu neutral, không hoạ tiết nhìn thấy được (§3)
- [ ] Bóng đổ có hướng rõ nhưng mép mềm — không flash thẳng mặt (§2)
- [ ] Không filter, không grain giả, không vignette, không tint (§5)
- [ ] Crop đúng tỉ lệ **trước khi lưu**: item/style/outfit 3:4, story 4:5 (§4)
- [ ] Tên file khớp **ký tự một ký tự** với slug trong fixture (§8)

## G. Sau khi có ảnh

1. Lưu file vào `public/images/<kind>/<slug>.jpg`.
2. Trỏ `image` trong fixture tương ứng từ `null` sang `'/images/<kind>/<slug>.jpg'`.
3. Chép prompt đã dùng thật vào `docs/13_ART_DIRECTION.md` §9 — mục đó đang có hai
   TODO bỏ trống từ batch đầu (`VERBATIM_PROMPTS`, `PER_IMAGE_TIME_MINUTES`).
4. Với `stories`: hiện chưa có route `/stories/[slug]` và `StoryCard` chưa render
   `Link` — ảnh story sẽ chỉ hiện ở card trên Home, không có trang chi tiết. Đó là
   phạm vi M4, không phải lỗi.
