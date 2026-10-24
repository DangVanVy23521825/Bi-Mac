# Catalog v1 + AI Stylist — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa catalog Bí Mặc lên 15 item / 10 outfit có metadata xếp hạng và trang chi tiết bấm được, rồi dựng AI Stylist chạy Gemini thật với grounding tất định và fallback khi không có key.

**Architecture:** Nội dung là fixture TypeScript có type, đọc qua lớp repository trong `src/data/`. Trang catalog static (`generateStaticParams`); chỉ `/stylist` dynamic. Pipeline stylist chia ba lớp với chiều phụ thuộc một hướng: `src/app/api/stylist` → `src/features/stylist` → (`src/lib/ai` + `src/data`). `src/lib/ai/` chỉ biết Gemini + Zod schema và **không import gì từ `src/data`** — vocabulary (danh sách style/color slug hợp lệ) được truyền vào như dữ liệu phẳng. `src/features/stylist/` là chỗ duy nhất biết cả hai phía, và là chỗ grounding xảy ra: output LLM qua Zod rồi resolve lại với catalog, slug lạ bị loại trước khi tới UI.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Tailwind 4 · Vitest · Playwright · `ai@^7` · `@ai-sdk/google@^4` · `zod@^4` · pnpm

**Spec:** `docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md` (§4 AI Stylist, §5 Catalog, §7 Kiến trúc, §8 M2+M3), cùng `docs/05_AI_STYLIST_SPEC.md`, `docs/01_PRD.md` §2–§4, `docs/02_INFORMATION_ARCHITECTURE.md`

---

## Global Constraints

- Mọi text hiển thị cho người dùng là **tiếng Việt**, giọng biên tập, không giọng máy dịch. Tên test cũng viết tiếng Việt, theo đúng `src/data/index.test.ts` hiện có.
- Node `>=22` (yêu cầu của `ai@7`). Local đang v22.14.0 — không hạ.
- Design token duy nhất: Warm Ivory `#F5F0E8` · Burgundy `#681F32` · Chocolate `#49312B` · Soft Taupe `#B7A89B` · Ink Black `#151515`. Dùng qua class Tailwind đã có (`text-accent`, `text-accent-soft`, `border-muted/40`, `bg-muted/35`) — không thêm màu mới.
- Font: `font-display` (Cormorant Garamond) cho tiêu đề, `font-body` (Inter) cho chữ thường. Không thêm font.
- **Không ecommerce** dưới mọi hình thức (ADR-001): không giá, không giỏ, không "mua", không link ra shop.
- **Không có trang trống và không có "coming soon".** Mọi route mới phải render nội dung thật.
- Ảnh: `image: string | null`. `null` là hợp lệ — `EditorialImage` render placeholder đúng tỷ lệ (`src/components/ui/EditorialImage.tsx:26`). **Không chặn task nào vì chưa có ảnh.**
- Không bật Supabase. `src/lib/supabase/` vẫn chỉ là seam có tài liệu.
- Không lưu ảnh người dùng ở đâu (ADR-012): nhận trong request → gửi Gemini → bỏ. Không bucket, không signed URL, **không log bytes ảnh**.
- Không suy luận đặc điểm nhạy cảm, không chấm điểm cơ thể/ngoại hình (docs/07). `affinity` là tín hiệu xếp hạng nội bộ; copy UI không được trình bày nó như xác suất khách quan.
- App phải `pnpm build` và `pnpm test` được **khi không có `GOOGLE_GENERATIVE_AI_API_KEY`**.
- **Không test nào được gọi mạng.** Gemini provider test bằng mock.
- Layout không vỡ từ 360px.
- Chạy sau mỗi task: `pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

Năm chỗ spec hàm ý nhưng không task nào tự nhiên chạm tới. Mỗi dòng có test được gắn vào task làm chủ code đó.

1. **LLM trả analysis đúng shape nhưng rỗng** (`styleDirections: []`) → UI phải ra empty state có đường đi tiếp, không ra màn hình kết quả trắng. → Task 13.
2. **Avoid loại hết mọi outfit** → empty state nói rõ lý do và mời khám phá không-AI (docs/05 "fail gracefully and still offer non-AI style discovery"). → Task 11 + Task 16.
3. **`explain()` trả prose cho slug không được hỏi** → phải bị loại, không bao giờ gán nhầm vào outfit khác. → Task 13.
4. **Ảnh đúng mediaType nhưng 0 byte / hỏng** → provider lỗi → fallback tất định, không 500. → Task 15.
5. **Route item có category không khớp** (`/wardrobe/tops/blazer`) → 404, không render item sai chỗ. → Task 6.

---

## Vocabulary & Catalog (quyết định chốt ở plan này)

Executor **không tự chọn lại** các giá trị dưới đây.

### Metadata vocabulary

```ts
type Occasion = 'work' | 'school' | 'casual' | 'date' | 'event'
type Fit = 'fitted' | 'relaxed' | 'oversized'
type ItemAttribute =
  | 'sleeveless' | 'sheer' | 'clingy' | 'structured-shoulder'
  | 'cropped' | 'high-heel' | 'short-hem' | 'bright-color'
```

`ItemAttribute` là **cờ có thể bị người dùng loại trừ**. Bốn giá trị đầu có item mang trong catalog v1; bốn giá trị sau không — union giữ chúng để thêm item sau là tự động có thêm lựa chọn "tránh". Questionnaire **chỉ hiện những lựa chọn catalog thật sự tôn trọng được** (`getAvoidOptions()`), nên v1 hiện 4 ô, không hiện 8.

`fit` là `Fit | null`. Phụ kiện là `null` và không tham gia tính điểm fit.

### 15 item

| slug | category | occasions | fit | attributes |
|---|---|---|---|---|
| `so-mi-trang` | tops | work, school, event, casual | fitted | — |
| `ao-lua` | tops | work, date, event, casual | relaxed | `sheer` |
| `ao-det-kim-mong` | tops | casual, school, work | fitted | — |
| `quan-wide-leg-chocolate` | bottoms | work, casual, event | relaxed | — |
| `quan-au` | bottoms | work, event | fitted | — |
| `chan-vay-midi` | bottoms | work, casual, date, event | relaxed | — |
| `shirt-dress` | dresses | work, casual, school | relaxed | — |
| `slip-dress` | dresses | date, event | relaxed | `sleeveless`, `clingy` |
| `a-line-dress` | dresses | casual, school, date | relaxed | `sleeveless` |
| `blazer` | outerwear | work, event | fitted | `structured-shoulder` |
| `trench-coat` | outerwear | work, casual | relaxed | — |
| `ao-cardigan` | outerwear | casual, school, work | relaxed | — |
| `loafer` | accessories | work, school, casual, event | null | — |
| `ballet-flat` | accessories | casual, school, date, work | null | — |
| `tui-co-ket-cau` | accessories | work, event, casual, date | null | — |

Bảy slug đầu tiên đã tồn tại (`ao-cardigan`, `so-mi-trang`, `ao-lua`, `quan-wide-leg-chocolate`, `chan-vay-midi`, `blazer`, `loafer`) — **giữ nguyên slug, name, excerpt, colorSlugs, styleSlugs, image**, chỉ thêm field mới. Tám slug mới: `ao-det-kim-mong`, `quan-au`, `shirt-dress`, `slip-dress`, `a-line-dress`, `trench-coat`, `ballet-flat`, `tui-co-ket-cau`.

`colorSlugs` cho item mới (chỉ dùng 5 color đã có: `kem`, `chocolate`, `burgundy`, `be-xam`, `den`):

`ao-det-kim-mong` → `kem`, `be-xam` · `quan-au` → `den`, `chocolate` · `shirt-dress` → `kem`, `be-xam` · `slip-dress` → `burgundy`, `den` · `a-line-dress` → `kem`, `burgundy` · `trench-coat` → `be-xam`, `kem` · `ballet-flat` → `den`, `kem` · `tui-co-ket-cau` → `chocolate`, `den`

`styleSlugs` cho item mới: `ao-det-kim-mong` → `minimalist`, `casual-chic`, `quiet-luxury` · `quan-au` → `modern-classic`, `minimalist` · `shirt-dress` → `modern-classic`, `casual-chic` · `slip-dress` → `quiet-luxury`, `soft-feminine` · `a-line-dress` → `soft-feminine`, `casual-chic` · `trench-coat` → `modern-classic`, `casual-chic` · `ballet-flat` → `soft-feminine`, `casual-chic` · `tui-co-ket-cau` → `quiet-luxury`, `modern-classic`

### 10 outfit

| slug | itemSlugs | occasions | styleSlugs |
|---|---|---|---|
| `modern-classic-di-lam` | so-mi-trang, quan-wide-leg-chocolate, loafer, tui-co-ket-cau | work | modern-classic |
| `so-mi-chan-vay-thanh-lich` | so-mi-trang, chan-vay-midi, blazer, loafer | work, event | modern-classic |
| `soft-feminine-cuoi-tuan` | ao-lua, chan-vay-midi, ballet-flat, ao-cardigan | casual, date | soft-feminine |
| `ao-lua-quan-au-buoi-toi` | ao-lua, quan-au, loafer, tui-co-ket-cau | event, date | quiet-luxury |
| `quiet-luxury-ngay-thuong` | ao-cardigan, quan-wide-leg-chocolate, loafer | casual | quiet-luxury |
| `minimalist-det-kim-quan-au` | ao-det-kim-mong, quan-au, blazer, tui-co-ket-cau | work | minimalist |
| `casual-chic-trench` | ao-det-kim-mong, quan-wide-leg-chocolate, trench-coat, ballet-flat | casual, school | casual-chic |
| `shirt-dress-blazer-di-lam` | shirt-dress, blazer, loafer, tui-co-ket-cau | work, event | modern-classic |
| `slip-dress-trench-buoi-toi` | slip-dress, trench-coat, ballet-flat | date, event | quiet-luxury |
| `a-line-dress-cardigan` | a-line-dress, ao-cardigan, ballet-flat, tui-co-ket-cau | casual, school | soft-feminine |

Ba outfit đầu đã tồn tại với slug `modern-classic-di-lam`, `soft-feminine-cuoi-tuan`, `quiet-luxury-ngay-thuong` — **giữ slug, name, whyItWorks, image**; `itemSlugs` của ba cái này được mở rộng theo bảng trên.

**Vì sao không phải "mỗi item ≥2 outfit" như spec §5:** số học đó bất khả thi ở 15 item / 10 outfit. Ba dress cần ≥6 outfit riêng (hai dress không ở cùng một outfit), còn 4 outfit còn lại không thể chứa 6 món top/bottom × 2 lượt. Spec §5 bỏ sót tính loại trừ theo category. Thay vào đó plan giữ đúng *mục tiêu* của ràng buộc — trang item không có mục "outfit liên quan" trống:

- **Sàn trực tiếp:** mọi item nằm trong **≥1** outfit (bảng trên: 12/15 item ≥2, 3 dress = 1).
- **Sàn hiển thị:** `getRelatedOutfits(item)` trả **≥2**, bù từ outfit cùng `styleSlugs` khi outfit trực tiếp < 2, và nhãn UI phân biệt hai loại.

**Phủ dịp mặc:** work (4 outfit), event (4), date (3), casual (4), school (2) — mọi `Occasion` có ≥2 outfit, nên lọc cứng theo một dịp không bao giờ ra rỗng.

### Khối lượng chữ

`FashionItem` thêm bốn field nội dung, tổng ~220–280 từ/item (×15 ≈ 3.700 từ):

- `whatItIs: string` — 1 đoạn, 50–70 từ
- `characteristics: string[]` — 3–4 gạch đầu dòng, mỗi dòng 10–20 từ
- `howToStyle: string` — 1–2 đoạn, 70–100 từ
- `whatToAvoid: string` — 1 đoạn, 50–70 từ

`Style` thêm `paragraphs: string[]` (2–3 đoạn, 200–280 từ) và `outfitFormulas: string[]` (3 công thức dạng "sơ mi trắng + quần ống rộng + loafer"). ×5 ≈ 1.300 từ.

Quy tắc docs/08: mỗi record phải thể hiện một quan hệ thật trong domain. Không lorem ipsum. **Viết trên trang đã render** (§5): dựng trang chi tiết bằng một item hoàn chỉnh trước (Task 6), nhìn nó, rồi viết phần còn lại.

### Suy ra, không lưu hai lần

"Suitable styles", "compatible colors", "example outfits" ở trang item, và "key items" ở trang style, đều **suy ra** từ `styleSlugs`/`colorSlugs`/`itemSlugs` — không thêm field.

---

## File Structure

**Catalog (Task 1–4)**
- Modify `src/types/content.ts` — vocabulary + mở rộng `FashionItem`/`Style`/`Outfit`/`Category`
- Create `src/types/stylist.ts` — type **phẳng** dùng chung ở cả hai phía ranh giới `lib/ai`: `StylistVocabulary`, `OutfitDescriptor`
- Create `src/data/fixtures/categories.ts` — 5 category: slug, name, intro
- Modify `src/data/fixtures/items.ts` — 7 → 15 item, đủ metadata + nội dung
- Modify `src/data/fixtures/outfits.ts` — 3 → 10 outfit + `occasions`
- Modify `src/data/fixtures/styles.ts` — thêm `paragraphs`, `outfitFormulas`
- Modify `src/data/index.ts` — repository function mới
- Modify `src/data/index.test.ts` — bất biến tham chiếu cho field mới
- Create `src/data/catalog.test.ts` — bất biến khối lượng/phủ/sàn hiển thị

**Routes (Task 5–7)**
- Modify `src/app/wardrobe/page.tsx` — category thành link, đọc từ data layer
- Create `src/app/wardrobe/[category]/page.tsx` — layout editorial xếp dọc, **không lưới**
- Create `src/app/wardrobe/[category]/[slug]/page.tsx` — 8 khối theo `docs/01_PRD.md:58-68`
- Create `src/app/styles/[slug]/page.tsx`
- Modify `src/app/styles/page.tsx` — link sang detail
- Modify `src/components/editorial/FashionItemTile.tsx` — `href` thật
- Create `src/components/wardrobe/CategoryItemRow.tsx` — một hàng editorial so le
- Create `src/components/wardrobe/ItemFacts.tsx` — dịp mặc / màu / style dạng chip có link
- Create `src/components/wardrobe/ItemFacts.test.tsx`
- Create `src/components/editorial/RelatedOutfits.tsx` — bọc `OutfitLook`, phân biệt trực tiếp vs cùng style

**AI layer (Task 8–9, 12)** — không import `src/data`
- Create `src/lib/ai/schema.ts` — Zod `stylistAnalysisSchema`, `stylistExplanationSchema`
- Create `src/lib/ai/provider.ts` — `StylistProvider`, request/response type
- Create `src/lib/ai/prompts.ts` — system prompt (analysis + explain) kèm ràng buộc docs/07
- Create `src/lib/ai/model.ts` — chốt model id, đọc env override
- Create `src/lib/ai/deterministic.ts` — `DeterministicStylistProvider`
- Create `src/lib/ai/gemini.ts` — `GeminiStylistProvider`
- Create `src/lib/ai/deterministic.test.ts`, `src/lib/ai/gemini.test.ts`

**Pipeline (Task 10–11, 13)**
- Create `src/features/stylist/input.ts` — `stylistInputSchema`, `StylistInput`
- Create `src/features/stylist/resolve.ts` — `resolveAnalysis()`
- Create `src/features/stylist/rank.ts` — `rankOutfits()`, `rankItems()`
- Create `src/features/stylist/pipeline.ts` — `runStylist()`, timeout + fallback
- Create `src/features/stylist/{input,resolve,rank,pipeline}.test.ts`

**Platform (Task 14–15)**
- Create `src/lib/rate-limit/index.ts` — `RateLimiter` interface + seam Upstash có tài liệu
- Create `src/lib/rate-limit/memory.ts` — sliding window trong RAM
- Create `src/lib/rate-limit/memory.test.ts`
- Create `src/app/api/stylist/route.ts` — POST, multipart, NDJSON hai chặng
- Create `src/app/api/stylist/route.test.ts`

**UI (Task 16)**
- Create `src/components/stylist/Questionnaire.tsx` (client)
- Create `src/components/stylist/StylistFlow.tsx` (client, giữ state + đọc NDJSON)
- Create `src/components/stylist/StylistResult.tsx`
- Create `src/components/stylist/{Questionnaire,StylistResult}.test.tsx`
- Modify `src/app/stylist/page.tsx` — server component, truyền vocabulary xuống

**Verify & docs (Task 17–18)**
- Create `playwright.config.ts`, `e2e/demo-path.spec.ts`
- Modify `package.json` — script `test:e2e`
- Modify `docs/11_DECISIONS.md` — ADR-016, ADR-017, ADR-018
- Modify `docs/04_DATA_MODEL.md`, `docs/05_AI_STYLIST_SPEC.md`, `CLAUDE.md`

**Ngoài phạm vi plan này — hai thứ, cả hai thuộc M4 theo spec §8:**

1. **Nút lưu vào closet** và persistence `localStorage`. Nên e2e Task 17 đi `home → item → style → stylist → kết quả` và **dừng trước bước lưu** — chặng cuối của đường demo §8 thuộc M4.
2. **Ba story hoàn chỉnh** và route `/stories/[slug]` (~1.800 từ, tức ~1.800 trong tổng ~7.000 từ mà spec §5 tính). Fixture `stories` hiện chỉ có `title` + `excerpt`, và `StoryCard` không có `Link` nên **không có link chết** — homepage giữ nguyên hành vi hiện tại. Khối lượng chữ của plan này vì vậy là ~5.000 từ (15 item + 5 style), không phải ~7.000.

---

## Task 1: Domain vocabulary và metadata xếp hạng

**Files:**
- Modify: `src/types/content.ts`
- Create: `src/data/fixtures/categories.ts`
- Modify: `src/data/fixtures/items.ts` (thêm field cho 7 item hiện có)
- Modify: `src/data/fixtures/outfits.ts` (thêm `occasions` cho 3 outfit hiện có)
- Modify: `src/data/fixtures/styles.ts` (thêm `paragraphs`, `outfitFormulas` cho 5 style)
- Modify: `src/data/index.ts`
- Test: `src/data/index.test.ts`

**Interfaces:**
- Consumes: `CategorySlug`, `Color`, `FashionItem`, `Outfit`, `Story`, `Style` đã có trong `src/types/content.ts`
- Produces: `Occasion`, `Fit`, `ItemAttribute`, `Category`; `FashionItem` thêm `occasions: Occasion[]`, `fit: Fit | null`, `attributes: ItemAttribute[]`, `whatItIs: string`, `characteristics: string[]`, `howToStyle: string`, `whatToAvoid: string`; `Outfit` thêm `occasions: Occasion[]`; `Style` thêm `paragraphs: string[]`, `outfitFormulas: string[]`; `allCategories: readonly Category[]`; `getCategories(): Promise<Category[]>`; `getCategoryBySlug(slug: string): Promise<Category | undefined>`

- [ ] **Step 1: Viết test thất bại trong `src/data/index.test.ts`**

Thêm vào cuối file, trong một `describe('metadata xếp hạng')`:

```ts
it('mọi item có ít nhất một dịp mặc', () => {
  for (const item of allItems) {
    expect(item.occasions.length, `item ${item.slug}`).toBeGreaterThan(0)
  }
})

it('mọi item ngoài phụ kiện đều có fit', () => {
  for (const item of allItems.filter((i) => i.category !== 'accessories')) {
    expect(item.fit, `item ${item.slug}`).not.toBeNull()
  }
})

it('phụ kiện không có fit', () => {
  for (const item of allItems.filter((i) => i.category === 'accessories')) {
    expect(item.fit, `item ${item.slug}`).toBeNull()
  }
})

it('mọi outfit có ít nhất một dịp mặc', () => {
  for (const outfit of allOutfits) {
    expect(outfit.occasions.length, `outfit ${outfit.slug}`).toBeGreaterThan(0)
  }
})

it('mọi category của item đều là category đã khai báo', () => {
  const slugs = new Set(allCategories.map((c) => c.slug))
  for (const item of allItems) {
    expect(slugs, `item ${item.slug}`).toContain(item.category)
  }
})

it('mọi style có nội dung dài và công thức phối', () => {
  for (const style of allStyles) {
    expect(style.paragraphs.length, `style ${style.slug}`).toBeGreaterThanOrEqual(2)
    expect(style.outfitFormulas.length, `style ${style.slug}`).toBe(3)
  }
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/data/index.test.ts`
Expected: FAIL — `allCategories` chưa export, `item.occasions` undefined

- [ ] **Step 3: Thêm vocabulary và mở rộng type trong `src/types/content.ts`**

Export `Occasion`, `Fit`, `ItemAttribute` đúng union ở mục "Metadata vocabulary" trên. Thêm `export type Category = { slug: CategorySlug; name: string; intro: string }`. Mở rộng `FashionItem`, `Outfit`, `Style` đúng danh sách ở Interfaces.

- [ ] **Step 4: Tạo `src/data/fixtures/categories.ts`**

Export `categories: Category[]` với 5 bản ghi. `name` lấy đúng chuỗi đang hard-code ở `src/app/wardrobe/page.tsx:4-10`: `tops`→"Áo", `bottoms`→"Quần & chân váy", `dresses`→"Váy liền", `outerwear`→"Áo khoác", `accessories`→"Phụ kiện". `intro` là 1 câu 20–30 từ nói category này giải quyết việc gì trong tủ đồ.

- [ ] **Step 5: Điền metadata cho 7 item hiện có**

Theo đúng bảng "15 item" (7 dòng tương ứng). Nội dung dài (`whatItIs`, `characteristics`, `howToStyle`, `whatToAvoid`) viết đủ budget từ ở mục "Khối lượng chữ" cho cả 7. Giữ nguyên `slug`, `name`, `excerpt`, `image`, `colorSlugs`, `styleSlugs`.

- [ ] **Step 6: Thêm `occasions` cho 3 outfit và nội dung dài cho 5 style**

`occasions` lấy từ bảng "10 outfit". `paragraphs`/`outfitFormulas` cho 5 style theo budget từ; công thức chỉ dùng tên item có trong catalog.

- [ ] **Step 7: Export và thêm repository function trong `src/data/index.ts`**

`allCategories`, `getCategories()`, `getCategoryBySlug(slug)` — cùng dạng async như các function đang có (ADR-007).

- [ ] **Step 8: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/types/content.ts src/data
git commit -m "feat(data): thêm vocabulary dịp mặc/fit/attribute và nội dung dài cho catalog"
```

---

## Task 2: Catalog lên 15 item

**Files:**
- Modify: `src/data/fixtures/items.ts`
- Test: `src/data/catalog.test.ts` (create)

**Interfaces:**
- Consumes: type và vocabulary từ Task 1
- Produces: 15 bản ghi `FashionItem` với 8 slug mới; không có API mới

- [ ] **Step 1: Viết test thất bại trong `src/data/catalog.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { allCategories, allItems } from '@/data'

describe('khối lượng catalog v1', () => {
  it('có đúng 15 item', () => {
    expect(allItems.length).toBe(15)
  })

  it('mỗi category có đúng 3 item', () => {
    for (const category of allCategories) {
      const count = allItems.filter((i) => i.category === category.slug).length
      expect(count, `category ${category.slug}`).toBe(3)
    }
  })

  it('mọi item có nội dung dài, không để trống', () => {
    for (const item of allItems) {
      expect(item.whatItIs.length, `item ${item.slug}`).toBeGreaterThan(80)
      expect(item.howToStyle.length, `item ${item.slug}`).toBeGreaterThan(120)
      expect(item.whatToAvoid.length, `item ${item.slug}`).toBeGreaterThan(80)
      expect(item.characteristics.length, `item ${item.slug}`).toBeGreaterThanOrEqual(3)
    }
  })
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/data/catalog.test.ts`
Expected: FAIL — `expected 7 to be 15`

- [ ] **Step 3: Thêm 8 item mới vào `src/data/fixtures/items.ts`**

Tám slug, metadata, `colorSlugs`, `styleSlugs` lấy đúng từ mục "15 item". `image: null` cho cả tám. `excerpt` 1 câu 15–25 từ. Bốn field nội dung dài theo budget từ — mỗi item phải nói được một quan hệ thật trong domain (phối với gì trong catalog, vì sao), không phải mô tả chung chung.

- [ ] **Step 4: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS — test tham chiếu chéo ở `src/data/index.test.ts` cũng phải xanh (color/style slug của item mới đều tồn tại)

- [ ] **Step 5: Commit**

```bash
git add src/data
git commit -m "feat(data): mở rộng catalog lên 15 item theo ADR-014"
```

---

## Task 3: 10 outfit và sàn hiển thị outfit liên quan

**Files:**
- Modify: `src/data/fixtures/outfits.ts`
- Modify: `src/data/index.ts`
- Test: `src/data/catalog.test.ts`

**Interfaces:**
- Consumes: 15 item từ Task 2
- Produces: `RelatedOutfit = { outfit: Outfit; relation: 'contains-item' | 'same-style' }`; `getRelatedOutfits(itemSlug: string): Promise<RelatedOutfit[]>`; `getOutfitsForStyle(styleSlug: string): Promise<Outfit[]>`

- [ ] **Step 1: Viết test thất bại trong `src/data/catalog.test.ts`**

```ts
describe('ràng buộc suất outfit', () => {
  it('có đúng 10 outfit', () => {
    expect(allOutfits.length).toBe(10)
  })

  it('mọi item nằm trong ít nhất một outfit', () => {
    const used = new Set(allOutfits.flatMap((o) => o.itemSlugs))
    for (const item of allItems) {
      expect(used, `item ${item.slug}`).toContain(item.slug)
    }
  })

  it('mọi item có ít nhất 2 outfit liên quan để hiển thị', async () => {
    for (const item of allItems) {
      const related = await getRelatedOutfits(item.slug)
      expect(related.length, `item ${item.slug}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('outfit chứa trực tiếp được xếp trước outfit cùng style', async () => {
    const related = await getRelatedOutfits('slip-dress')
    expect(related[0].relation).toBe('contains-item')
    expect(related.some((r) => r.relation === 'same-style')).toBe(true)
  })

  it('mọi dịp mặc có ít nhất 2 outfit', () => {
    const occasions = ['work', 'school', 'casual', 'date', 'event'] as const
    for (const occasion of occasions) {
      const count = allOutfits.filter((o) => o.occasions.includes(occasion)).length
      expect(count, `dịp ${occasion}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('không trả outfit trùng lặp', async () => {
    for (const item of allItems) {
      const slugs = (await getRelatedOutfits(item.slug)).map((r) => r.outfit.slug)
      expect(new Set(slugs).size, `item ${item.slug}`).toBe(slugs.length)
    }
  })
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/data/catalog.test.ts`
Expected: FAIL — `getRelatedOutfits` chưa tồn tại

- [ ] **Step 3: Viết 7 outfit mới và mở rộng 3 outfit cũ trong `src/data/fixtures/outfits.ts`**

`itemSlugs`, `occasions`, `styleSlugs` lấy đúng bảng "10 outfit" — **không tự sắp lại**, vì các bất biến ở Step 1 phụ thuộc chính xác bảng đó. `whyItWorks` cho 7 outfit mới: 1–2 câu, 40–70 từ, nói quan hệ thật (tỷ lệ, lớp lang, quan hệ màu), không hình dung chủ quan về người mặc. `image: null`.

- [ ] **Step 4: Thêm `getRelatedOutfits` và `getOutfitsForStyle` vào `src/data/index.ts`**

`getRelatedOutfits`: lấy outfit chứa `itemSlug` (gán `relation: 'contains-item'`), xếp theo thứ tự fixture; nếu < 2 thì bù bằng outfit có `styleSlugs` giao với `styleSlugs` của item (`relation: 'same-style'`), loại trùng, cho tới khi đủ 2. Thứ tự bù theo thứ tự fixture để kết quả tất định.

- [ ] **Step 5: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data
git commit -m "feat(data): 10 outfit và sàn hiển thị outfit liên quan"
```

---

## Task 4: Repository function cho trang chi tiết và cho stylist

**Files:**
- Modify: `src/data/index.ts`
- Test: `src/data/index.test.ts`

**Interfaces:**
- Consumes: catalog đầy đủ từ Task 1–3
- Produces: `getItemsByCategory(categorySlug: string): Promise<FashionItem[]>`; `getStyleBySlug(slug: string): Promise<Style | undefined>`; `getItemsForStyle(styleSlug: string): Promise<FashionItem[]>`; `getColorsForItem(itemSlug: string): Promise<Color[]>`; `getStylesForItem(itemSlug: string): Promise<Style[]>`; `getItemsForOutfit(outfitSlug: string): Promise<FashionItem[]>`; `getAvoidOptions(): Promise<ItemAttribute[]>`; `getStylistVocabulary(): Promise<StylistVocabulary>`
- Produces (trong `src/types/stylist.ts`, file mới): `StylistVocabulary = { styles: Array<{ slug: string; name: string; tagline: string }>; colors: Array<{ slug: string; name: string }> }`; `OutfitDescriptor = { slug: string; name: string; itemNames: string[]; colorNames: string[]; styleNames: string[] }`

`src/types/stylist.ts` tồn tại để `src/data` và `src/lib/ai` cùng dùng một định nghĩa mà không ai phải import của ai. Hai type này **chỉ chứa string phẳng** — không `Style`, không `Color`, không `FashionItem` — nên việc `src/lib/ai` import chúng không phá ranh giới §7.

- [ ] **Step 1: Viết test thất bại trong `src/data/index.test.ts`**

```ts
describe('repository cho trang chi tiết', () => {
  it('trả 3 item cho mỗi category', async () => {
    expect((await getItemsByCategory('dresses')).length).toBe(3)
  })

  it('trả mảng rỗng cho category không tồn tại', async () => {
    expect(await getItemsByCategory('khong-ton-tai')).toEqual([])
  })

  it('suy ra style của item từ styleSlugs', async () => {
    const styles = await getStylesForItem('so-mi-trang')
    expect(styles.map((s) => s.slug)).toEqual(['modern-classic', 'minimalist', 'quiet-luxury'])
  })

  it('suy ra item của style, không cần field riêng', async () => {
    const items = await getItemsForStyle('minimalist')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.styleSlugs).toContain('minimalist')
    }
  })

  it('giữ thứ tự itemSlugs khi trả item của outfit', async () => {
    const items = await getItemsForOutfit('modern-classic-di-lam')
    expect(items.map((i) => i.slug)).toEqual([
      'so-mi-trang', 'quan-wide-leg-chocolate', 'loafer', 'tui-co-ket-cau',
    ])
  })
})

describe('vocabulary cho stylist', () => {
  it('chỉ đưa ra lựa chọn tránh mà catalog thật sự tôn trọng được', async () => {
    expect((await getAvoidOptions()).sort()).toEqual(
      ['clingy', 'sheer', 'sleeveless', 'structured-shoulder'],
    )
  })

  it('vocabulary chỉ chứa dữ liệu phẳng, không chứa entity', async () => {
    const vocab = await getStylistVocabulary()
    expect(vocab.styles.length).toBe(5)
    expect(vocab.colors.length).toBe(5)
    expect(Object.keys(vocab.colors[0]).sort()).toEqual(['name', 'slug'])
  })
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/data/index.test.ts`
Expected: FAIL — các function chưa tồn tại

- [ ] **Step 3: Tạo `src/types/stylist.ts`**

Export `StylistVocabulary` và `OutfitDescriptor` đúng shape ở Interfaces. File này không import gì từ `src/types/content.ts`.

- [ ] **Step 4: Thêm các function vào `src/data/index.ts`**

`getAvoidOptions` trả union đã sort của mọi `item.attributes` — đây là chỗ duy nhất quyết định questionnaire hiện ô nào. `getStylistVocabulary` trả object phẳng (không `Style`/`Color`) để `src/lib/ai/` không phải biết type của catalog.

- [ ] **Step 5: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data src/types
git commit -m "feat(data): repository function cho trang chi tiết và vocabulary stylist"
```

---

## Task 5: Route category

**Files:**
- Modify: `src/app/wardrobe/page.tsx`
- Create: `src/app/wardrobe/[category]/page.tsx`
- Create: `src/components/wardrobe/CategoryItemRow.tsx`
- Test: `src/app/wardrobe/wardrobe.test.tsx`

**Interfaces:**
- Consumes: `getCategories`, `getCategoryBySlug`, `getItemsByCategory` (Task 1, 4)
- Produces: `CategoryItemRow({ item, index }: { item: FashionItem; index: number })`; route `/wardrobe/[category]`

- [ ] **Step 1: Viết test thất bại trong `src/app/wardrobe/wardrobe.test.tsx`**

```tsx
it('trang tủ đồ cho mỗi category một link', async () => {
  render(await WardrobePage())
  expect(screen.getByRole('link', { name: /Váy liền/ })).toHaveAttribute(
    'href', '/wardrobe/dresses',
  )
})

it('trang category render cả 3 item, mỗi item một link tới trang chi tiết', async () => {
  render(await CategoryPage({ params: Promise.resolve({ category: 'dresses' }) }))
  expect(screen.getByRole('link', { name: /Shirt dress/ })).toHaveAttribute(
    'href', '/wardrobe/dresses/shirt-dress',
  )
  expect(screen.getAllByRole('link')).toHaveLength(3)
})

it('hàng item so le theo chỉ số chẵn/lẻ', () => {
  const { container } = render(<CategoryItemRow item={item} index={1} />)
  expect(container.querySelector('[data-offset="1"]')).not.toBeNull()
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/app/wardrobe/wardrobe.test.tsx`
Expected: FAIL — module `[category]/page` không tồn tại

- [ ] **Step 3: Tạo `CategoryItemRow` trong `src/components/wardrobe/CategoryItemRow.tsx`**

Ảnh lớn cạnh khối chữ, so le theo `index % 2` (đặt `data-offset={index % 2}` để test bám vào). **Không dùng grid nhiều cột cho danh sách item** — §5 nói rõ ba món trong lưới 3 cột đọc ra là thiếu hàng. Dùng `EditorialImage` với `ratio="look"`, `Link` tới `/wardrobe/{item.category}/{item.slug}`.

- [ ] **Step 4: Tạo `src/app/wardrobe/[category]/page.tsx`**

Server component async. `generateStaticParams` từ `getCategories()`. `notFound()` khi `getCategoryBySlug` trả undefined. Render `SectionHeading` + `intro` + `CategoryItemRow` xếp dọc. Thêm `generateMetadata` dùng `category.name` + `intro`.

- [ ] **Step 5: Sửa `src/app/wardrobe/page.tsx` đọc từ data layer**

Bỏ mảng `CATEGORIES` hard-code (dòng 3–10), dùng `getCategories()`, mỗi dòng là `Link` tới `/wardrobe/{slug}` và hiện `intro`.

- [ ] **Step 6: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/wardrobe src/components/wardrobe
git commit -m "feat(wardrobe): route category với layout editorial xếp dọc"
```

---

## Task 6: Route item detail

**Files:**
- Create: `src/app/wardrobe/[category]/[slug]/page.tsx`
- Create: `src/components/wardrobe/ItemFacts.tsx`
- Create: `src/components/editorial/RelatedOutfits.tsx`
- Modify: `src/components/editorial/FashionItemTile.tsx`
- Test: `src/app/wardrobe/[category]/[slug]/item-detail.test.tsx`
- Test: `src/components/wardrobe/ItemFacts.test.tsx`

**Interfaces:**
- Consumes: `getItemBySlug`, `getStylesForItem`, `getColorsForItem`, `getRelatedOutfits` (Task 3, 4)
- Produces: `ItemFacts({ item, styles, colors })`; `RelatedOutfits({ related }: { related: RelatedOutfit[] })`; route `/wardrobe/[category]/[slug]`

- [ ] **Step 1: Viết test thất bại**

Trong `item-detail.test.tsx`:

```tsx
it('render đủ 8 khối nội dung của trang item', async () => {
  render(await ItemDetailPage({
    params: Promise.resolve({ category: 'tops', slug: 'so-mi-trang' }),
  }))
  for (const heading of [
    /Là gì/, /Đặc điểm/, /Phối thế nào/, /Nên tránh/,
    /Style phù hợp/, /Dịp mặc/, /Màu đi cùng/, /Look có món này/,
  ]) {
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  }
})

it('404 khi category trong URL không khớp category thật của item', async () => {
  await expect(ItemDetailPage({
    params: Promise.resolve({ category: 'tops', slug: 'blazer' }),
  })).rejects.toThrow()
})

it('404 khi slug không tồn tại', async () => {
  await expect(ItemDetailPage({
    params: Promise.resolve({ category: 'tops', slug: 'khong-ton-tai' }),
  })).rejects.toThrow()
})

it('luôn có ít nhất 2 look liên quan, kể cả với váy liền', async () => {
  render(await ItemDetailPage({
    params: Promise.resolve({ category: 'dresses', slug: 'slip-dress' }),
  }))
  expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThanOrEqual(2)
})
```

Trong `ItemFacts.test.tsx`:

```tsx
it('style và màu là link sang trang thật', () => {
  render(<ItemFacts item={item} styles={styles} colors={colors} />)
  expect(screen.getByRole('link', { name: /Modern Classic/ })).toHaveAttribute(
    'href', '/styles/modern-classic',
  )
})

it('dịp mặc hiện nhãn tiếng Việt, không hiện slug', () => {
  render(<ItemFacts item={item} styles={styles} colors={colors} />)
  expect(screen.getByText('Đi làm')).toBeInTheDocument()
  expect(screen.queryByText('work')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/app/wardrobe src/components/wardrobe`
Expected: FAIL — module chưa tồn tại

- [ ] **Step 3: Tạo `ItemFacts` trong `src/components/wardrobe/ItemFacts.tsx`**

Ba nhóm chip: dịp mặc (text, không link), style (link `/styles/{slug}`), màu (ô màu dùng `color.hex` + tên). Nhãn `Occasion` → tiếng Việt chốt ở đây và chỉ ở đây: `work`→"Đi làm", `school`→"Đi học", `casual`→"Thường ngày", `date`→"Đi hẹn", `event`→"Sự kiện". Export map đó là `OCCASION_LABEL` để Task 16 dùng lại.

- [ ] **Step 4: Tạo `RelatedOutfits` trong `src/components/editorial/RelatedOutfits.tsx`**

Bọc `OutfitLook` đã có. Hai nhóm có tiêu đề khác nhau: `contains-item` → "Look có món này", `same-style` → "Look cùng hướng style". Nhóm rỗng thì không render tiêu đề.

- [ ] **Step 5: Tạo `src/app/wardrobe/[category]/[slug]/page.tsx`**

Server component async. `generateStaticParams` sinh từ `allItems` (cặp `category` + `slug`). `notFound()` khi không tìm thấy item **hoặc** khi `item.category !== params.category`. Render theo thứ tự `docs/01_PRD.md:58-68`: `whatItIs` → `characteristics` → `howToStyle` → `whatToAvoid` → `ItemFacts` → `RelatedOutfits`. `generateMetadata` dùng `item.name` + `item.excerpt`.

- [ ] **Step 6: Sửa `FashionItemTile` dùng href thật**

`src/components/editorial/FashionItemTile.tsx:8` đang `href="/wardrobe"` cứng → `/wardrobe/{item.category}/{item.slug}`.

- [ ] **Step 7: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS — `src/app/page.test.tsx` cũng phải còn xanh sau khi `FashionItemTile` đổi href

- [ ] **Step 8: Commit**

```bash
git add src/app/wardrobe src/components
git commit -m "feat(wardrobe): trang item detail đủ 8 khối và link chéo thật"
```

---

## Task 7: Route style detail

**Files:**
- Create: `src/app/styles/[slug]/page.tsx`
- Modify: `src/app/styles/page.tsx`
- Modify: `src/app/page.tsx:63` (thẻ style ở homepage đang `href="/styles"` cứng)
- Test: `src/app/styles/styles.test.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `getStyleBySlug`, `getItemsForStyle`, `getOutfitsForStyle`, `getColorStory` (Task 3, 4)
- Produces: route `/styles/[slug]`

- [ ] **Step 1: Viết test thất bại trong `src/app/styles/styles.test.tsx`**

```tsx
it('trang styles cho mỗi style một link tới trang chi tiết', async () => {
  render(await StylesPage())
  expect(screen.getByRole('link', { name: /Quiet Luxury/ })).toHaveAttribute(
    'href', '/styles/quiet-luxury',
  )
})

it('trang style detail render palette, item chủ chốt, công thức phối và look', async () => {
  render(await StyleDetailPage({ params: Promise.resolve({ slug: 'minimalist' }) }))
  for (const heading of [/Bảng màu/, /Món chủ chốt/, /Công thức phối/, /Look mẫu/]) {
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  }
})

it('item chủ chốt link tới trang item thật', async () => {
  render(await StyleDetailPage({ params: Promise.resolve({ slug: 'minimalist' }) }))
  expect(screen.getByRole('link', { name: /Quần âu/ })).toHaveAttribute(
    'href', '/wardrobe/bottoms/quan-au',
  )
})

it('có CTA sang AI phối đồ', async () => {
  render(await StyleDetailPage({ params: Promise.resolve({ slug: 'minimalist' }) }))
  expect(screen.getByRole('link', { name: /AI phối đồ/ })).toHaveAttribute('href', '/stylist')
})

it('404 khi slug style không tồn tại', async () => {
  await expect(StyleDetailPage({
    params: Promise.resolve({ slug: 'khong-ton-tai' }),
  })).rejects.toThrow()
})
```

Thêm vào `src/app/page.test.tsx`:

```tsx
it('thẻ style ở homepage trỏ tới đúng style, không trỏ về index', async () => {
  render(await HomePage())
  expect(screen.getByRole('link', { name: /Quiet Luxury/ })).toHaveAttribute(
    'href', '/styles/quiet-luxury',
  )
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/app/styles`
Expected: FAIL — module `[slug]/page` không tồn tại

- [ ] **Step 3: Tạo `src/app/styles/[slug]/page.tsx`**

Server component async, `generateStaticParams` từ `getStyles()`, `notFound()` khi không có. Khối: hero (`EditorialImage` + `name` + `tagline`) → `paragraphs` → "Bảng màu" (lọc `getColorStory()` theo `style.colorSlugs`) → "Món chủ chốt" (`getItemsForStyle`, link tới item detail) → "Công thức phối" (`outfitFormulas`) → "Look mẫu" (`getOutfitsForStyle` qua `OutfitLook`) → CTA `/stylist`. `generateMetadata` dùng `name` + `tagline`.

- [ ] **Step 4: Sửa `src/app/styles/page.tsx` bọc mỗi style trong `Link`**

Giữ nguyên layout 5 cột hiện có, chỉ thêm `Link href={'/styles/' + style.slug}`.

- [ ] **Step 5: Sửa href cứng ở homepage**

`src/app/page.tsx:63` đang `href="/styles"` cho mọi thẻ style → `/styles/{style.slug}`.

- [ ] **Step 6: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/styles src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(styles): trang style detail và link từ index"
```

---

## Task 8: Zod schema, StylistProvider interface và input schema

**Files:**
- Create: `src/lib/ai/schema.ts`
- Create: `src/lib/ai/provider.ts`
- Create: `src/features/stylist/input.ts`
- Test: `src/features/stylist/input.test.ts`
- Modify: `package.json` (thêm `zod`)

**Interfaces:**
- Consumes: `Occasion`, `Fit`, `ItemAttribute` (Task 1)
- Produces:
  - `stylistAnalysisSchema`, `StylistAnalysis = { styleDirections: Array<{ styleSlug: string; affinity: number; reason: string }>; palette: Array<{ colorSlug: string; reason: string }>; notes: string[] }`
  - `stylistExplanationSchema`, `StylistExplanation = { outfits: Array<{ outfitSlug: string; whyThisWorks: string }> }`
  - `StylistProvider = { readonly id: 'gemini' | 'deterministic'; analyze(req: AnalyzeRequest): Promise<StylistAnalysis>; explain(req: ExplainRequest): Promise<StylistExplanation> }`
  - `AnalyzeRequest = { answers: StylistAnswers; photo?: { mediaType: string; data: Uint8Array }; vocabulary: StylistVocabulary }`
  - `ExplainRequest = { answers: StylistAnswers; vocabulary: StylistVocabulary; outfits: OutfitDescriptor[] }`
  - `StylistVocabulary` và `OutfitDescriptor` import từ `src/types/stylist.ts` (Task 4) — không định nghĩa lại ở đây.
  - `stylistInputSchema`, `StylistInput = { answers: StylistAnswers; photo?: { mediaType: string; data: Uint8Array } }`, `StylistAnswers = { occasions: Occasion[]; fitPreference: Fit | 'unsure'; avoids: ItemAttribute[]; goal: 'style' | 'outfits' | 'colors' | 'wardrobe-refresh' }`

`AnalyzeRequest`/`ExplainRequest` chỉ chứa **dữ liệu phẳng**. Đây là chỗ giữ ranh giới §7: `src/lib/ai/` không được import `@/data` hay `@/types/content` — vocabulary và outfit descriptor được caller truyền vào.

- [ ] **Step 1: Cài zod**

Run: `pnpm add zod`
`@ai-sdk/google@4` yêu cầu peer `zod ^3.25.76 || ^4.1.8` → dùng `zod@^4`.

- [ ] **Step 2: Viết test thất bại trong `src/features/stylist/input.test.ts`**

```ts
it('nhận input hợp lệ', () => {
  const parsed = stylistInputSchema.safeParse({
    answers: { occasions: ['work'], fitPreference: 'relaxed', avoids: [], goal: 'outfits' },
  })
  expect(parsed.success).toBe(true)
})

it('từ chối dịp mặc không có trong vocabulary', () => {
  const parsed = stylistInputSchema.safeParse({
    answers: { occasions: ['gym'], fitPreference: 'unsure', avoids: [], goal: 'style' },
  })
  expect(parsed.success).toBe(false)
})

it('từ chối khi không chọn dịp mặc nào', () => {
  const parsed = stylistInputSchema.safeParse({
    answers: { occasions: [], fitPreference: 'unsure', avoids: [], goal: 'style' },
  })
  expect(parsed.success).toBe(false)
})

it('cho phép không gửi ảnh', () => {
  const parsed = stylistInputSchema.safeParse({
    answers: { occasions: ['date'], fitPreference: 'unsure', avoids: ['sheer'], goal: 'colors' },
  })
  expect(parsed.success).toBe(true)
  expect(parsed.data?.photo).toBeUndefined()
})

it('clamp affinity ngoài khoảng [0,1] thành không hợp lệ', () => {
  expect(stylistAnalysisSchema.safeParse({
    styleDirections: [{ styleSlug: 'minimalist', affinity: 1.4, reason: 'x' }],
    palette: [], notes: [],
  }).success).toBe(false)
})

it('từ chối analysis thiếu lý do', () => {
  expect(stylistAnalysisSchema.safeParse({
    styleDirections: [{ styleSlug: 'minimalist', affinity: 0.5, reason: '' }],
    palette: [], notes: [],
  }).success).toBe(false)
})
```

- [ ] **Step 3: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/features/stylist/input.test.ts`
Expected: FAIL — module chưa tồn tại

- [ ] **Step 4: Viết `src/lib/ai/schema.ts`**

`affinity` là `z.number().min(0).max(1)`. `reason` và `whyThisWorks` là `z.string().min(1)`. `styleDirections` `.max(3)`, `palette` `.max(5)`, `notes` `.max(4)`. Không dùng `.optional()` ở field nào LLM phải trả — thiếu thì fail validate, không im lặng.

- [ ] **Step 5: Viết `src/lib/ai/provider.ts` và `src/features/stylist/input.ts`**

`provider.ts` chỉ có type, không có implementation. `input.ts` giữ `stylistInputSchema`: `occasions` `.min(1)`, `avoids` mặc định `[]`, `photo` optional với `mediaType` thuộc `['image/jpeg','image/png','image/webp']`.

- [ ] **Step 6: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/ai src/features/stylist
git commit -m "feat(stylist): Zod schema và StylistProvider interface"
```

---

## Task 9: DeterministicStylistProvider

**Files:**
- Create: `src/lib/ai/deterministic.ts`
- Test: `src/lib/ai/deterministic.test.ts`

**Interfaces:**
- Consumes: `StylistProvider`, `AnalyzeRequest`, `ExplainRequest`, schema (Task 8)
- Produces: `createDeterministicProvider(): StylistProvider` với `id: 'deterministic'`

- [ ] **Step 1: Viết test thất bại trong `src/lib/ai/deterministic.test.ts`**

```ts
it('luôn trả analysis hợp schema', async () => {
  const analysis = await provider.analyze(request)
  expect(stylistAnalysisSchema.safeParse(analysis).success).toBe(true)
})

it('chỉ trả slug có trong vocabulary được truyền vào', async () => {
  const analysis = await provider.analyze(request)
  const known = new Set(request.vocabulary.styles.map((s) => s.slug))
  for (const d of analysis.styleDirections) expect(known).toContain(d.styleSlug)
})

it('cùng input cho cùng output', async () => {
  expect(await provider.analyze(request)).toEqual(await provider.analyze(request))
})

it('đổi dịp mặc thì đổi hướng style', async () => {
  const work = await provider.analyze(withOccasions(['work']))
  const date = await provider.analyze(withOccasions(['date']))
  expect(work.styleDirections[0].styleSlug).not.toBe(date.styleDirections[0].styleSlug)
})

it('chỉ giải thích đúng các outfit được hỏi', async () => {
  const req = explainRequestFor(['modern-classic-di-lam', 'quiet-luxury-ngay-thuong'])
  const result = await provider.explain(req)
  expect(result.outfits.map((o) => o.outfitSlug)).toEqual([
    'modern-classic-di-lam', 'quiet-luxury-ngay-thuong',
  ])
})

it('không gọi mạng', async () => {
  const spy = vi.spyOn(globalThis, 'fetch')
  await provider.analyze(request)
  expect(spy).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/lib/ai/deterministic.test.ts`
Expected: FAIL — `createDeterministicProvider` chưa tồn tại

- [ ] **Step 3: Implement `createDeterministicProvider()` trong `src/lib/ai/deterministic.ts`**

`analyze`: map dịp mặc → style slug theo bảng cố định, giao với `vocabulary.styles` để không bao giờ trả slug ngoài vocabulary, affinity giảm dần `0.8 / 0.6 / 0.4`:

```ts
const OCCASION_STYLE: Record<Occasion, string[]> = {
  work:   ['modern-classic', 'minimalist', 'quiet-luxury'],
  school: ['casual-chic', 'minimalist', 'soft-feminine'],
  casual: ['casual-chic', 'quiet-luxury', 'modern-classic'],
  date:   ['soft-feminine', 'quiet-luxury', 'casual-chic'],
  event:  ['quiet-luxury', 'modern-classic', 'soft-feminine'],
}
```

`palette` lấy 3 color đầu của `vocabulary.colors`. `explain`: với mỗi outfit được hỏi, ghép câu từ `itemNames` + `colorNames` + `styleNames` — nêu quan hệ (tỷ lệ, lớp lang, màu), **không nhận xét về người mặc**. `notes` có một dòng nói đang ở chế độ dự phòng.

- [ ] **Step 4: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai
git commit -m "feat(stylist): provider tất định làm fallback và test seam"
```

---

## Task 10: resolveAnalysis — loại slug bịa

**Files:**
- Create: `src/features/stylist/resolve.ts`
- Test: `src/features/stylist/resolve.test.ts`

**Interfaces:**
- Consumes: `StylistAnalysis` (Task 8), `allStyles`/`allColors` (Task 1)
- Produces:
  - `StylistCatalog = { items: readonly FashionItem[]; outfits: readonly Outfit[]; styles: readonly Style[]; colors: readonly Color[] }` — **định nghĩa một lần ở đây**, Task 11 và 13 dùng lại đúng type này
  - `ResolvedAnalysis = { styleDirections: Array<{ style: Style; affinity: number; reason: string }>; palette: Array<{ color: Color; reason: string }>; notes: string[]; droppedSlugs: string[] }`
  - `resolveAnalysis(analysis: StylistAnalysis, catalog: StylistCatalog): ResolvedAnalysis`

Đây là bất biến trung tâm của cả thiết kế (spec §4, "Bốn chỗ phải chặn", mục 1). Test ở task này là thứ giữ nó.

- [ ] **Step 1: Viết test thất bại trong `src/features/stylist/resolve.test.ts`**

```ts
it('loại style slug không có trong catalog', () => {
  const resolved = resolveAnalysis({
    styleDirections: [
      { styleSlug: 'minimalist', affinity: 0.8, reason: 'a' },
      { styleSlug: 'dark-academia', affinity: 0.9, reason: 'b' },
    ],
    palette: [], notes: [],
  }, catalog)
  expect(resolved.styleDirections.map((d) => d.style.slug)).toEqual(['minimalist'])
  expect(resolved.droppedSlugs).toContain('dark-academia')
})

it('loại color slug không có trong catalog', () => {
  const resolved = resolveAnalysis({
    styleDirections: [],
    palette: [{ colorSlug: 'neon-lime', reason: 'x' }, { colorSlug: 'kem', reason: 'y' }],
    notes: [],
  }, catalog)
  expect(resolved.palette.map((p) => p.color.slug)).toEqual(['kem'])
  expect(resolved.droppedSlugs).toContain('neon-lime')
})

it('trả rỗng khi mọi slug đều bịa, không throw', () => {
  const resolved = resolveAnalysis({
    styleDirections: [{ styleSlug: 'y2k', affinity: 0.9, reason: 'a' }],
    palette: [{ colorSlug: 'neon-lime', reason: 'b' }],
    notes: [],
  }, catalog)
  expect(resolved.styleDirections).toEqual([])
  expect(resolved.palette).toEqual([])
})

it('bỏ slug trùng, giữ bản có affinity cao nhất', () => {
  const resolved = resolveAnalysis({
    styleDirections: [
      { styleSlug: 'minimalist', affinity: 0.4, reason: 'a' },
      { styleSlug: 'minimalist', affinity: 0.9, reason: 'b' },
    ],
    palette: [], notes: [],
  }, catalog)
  expect(resolved.styleDirections).toHaveLength(1)
  expect(resolved.styleDirections[0].affinity).toBe(0.9)
})

it('xếp hướng style theo affinity giảm dần', () => {
  const resolved = resolveAnalysis({
    styleDirections: [
      { styleSlug: 'minimalist', affinity: 0.3, reason: 'a' },
      { styleSlug: 'quiet-luxury', affinity: 0.9, reason: 'b' },
    ],
    palette: [], notes: [],
  }, catalog)
  expect(resolved.styleDirections.map((d) => d.style.slug)).toEqual(
    ['quiet-luxury', 'minimalist'],
  )
})

it('giữ nguyên notes', () => {
  const resolved = resolveAnalysis(
    { styleDirections: [], palette: [], notes: ['ghi chú'] }, catalog,
  )
  expect(resolved.notes).toEqual(['ghi chú'])
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/features/stylist/resolve.test.ts`
Expected: FAIL — `resolveAnalysis` chưa tồn tại

- [ ] **Step 3: Implement `resolveAnalysis` trong `src/features/stylist/resolve.ts`**

Dedupe theo slug giữ affinity cao nhất, sort giảm dần theo affinity, tie-break theo slug để tất định.

- [ ] **Step 4: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/stylist
git commit -m "feat(stylist): resolveAnalysis loại mọi slug không có trong catalog"
```

---

## Task 11: rankOutfits / rankItems

**Files:**
- Create: `src/features/stylist/rank.ts`
- Test: `src/features/stylist/rank.test.ts`

**Interfaces:**
- Consumes: `ResolvedAnalysis` (Task 10), `StylistAnswers` (Task 8), catalog (Task 1–3)
- Produces: `RankedOutfit = { outfit: Outfit; score: number; matchedStyleSlugs: string[]; matchedColorSlugs: string[]; matchedOccasions: Occasion[] }`; `rankOutfits(analysis: ResolvedAnalysis, answers: StylistAnswers, catalog: StylistCatalog, limit?: number): RankedOutfit[]` (limit mặc định 3); `rankItems(analysis: ResolvedAnalysis, answers: StylistAnswers, catalog: StylistCatalog, limit?: number): FashionItem[]` (limit mặc định 5)

Luật tất định, chốt ở plan này:

1. **Lọc cứng avoid** — outfit bị loại nếu **bất kỳ** item trong nó có attribute thuộc `answers.avoids`. Loại hẳn, không hạ điểm.
2. **Lọc cứng dịp mặc** — outfit bị loại nếu `outfit.occasions` không giao với `answers.occasions`.
3. **Điểm** = `3 × Σ affinity(style ∈ outfit.styleSlugs ∩ analysis)` + `2 × |màu của item trong outfit ∩ palette|` + `1 × số item có fit = answers.fitPreference` (bỏ qua khi `'unsure'`; item `fit: null` không tính) + `1 × |outfit.occasions ∩ answers.occasions|`.
4. **Tie-break** theo `outfit.slug` tăng dần.
5. Trả `limit` phần tử đầu.

`rankItems` dùng luật tương tự ở mức item: lọc cứng avoid theo `item.attributes`, lọc cứng dịp theo `item.occasions`, điểm = `3 × Σ affinity(style ∈ item.styleSlugs)` + `2 × |item.colorSlugs ∩ palette|` + `1` nếu `item.fit === answers.fitPreference`, tie-break theo slug.

- [ ] **Step 1: Viết test thất bại trong `src/features/stylist/rank.test.ts`**

```ts
it('loại hẳn outfit chứa item mang attribute bị tránh', () => {
  const ranked = rankOutfits(analysisAll, answers({ avoids: ['sleeveless'] }), catalog, 10)
  const slugs = ranked.map((r) => r.outfit.slug)
  expect(slugs).not.toContain('slip-dress-trench-buoi-toi')
  expect(slugs).not.toContain('a-line-dress-cardigan')
})

it('attribute bị tránh không bao giờ xuất hiện trong kết quả', () => {
  const ranked = rankOutfits(analysisAll, answers({ avoids: ['structured-shoulder'] }), catalog, 10)
  for (const r of ranked) {
    for (const item of itemsOf(r.outfit)) {
      expect(item.attributes, `outfit ${r.outfit.slug}`).not.toContain('structured-shoulder')
    }
  }
})

it('loại outfit không khớp dịp mặc', () => {
  const ranked = rankOutfits(analysisAll, answers({ occasions: ['school'] }), catalog, 10)
  for (const r of ranked) expect(r.outfit.occasions).toContain('school')
})

it('mỗi dịp mặc đơn lẻ vẫn ra ít nhất 2 outfit', () => {
  for (const occasion of ['work', 'school', 'casual', 'date', 'event'] as const) {
    const ranked = rankOutfits(analysisAll, answers({ occasions: [occasion] }), catalog, 10)
    expect(ranked.length, `dịp ${occasion}`).toBeGreaterThanOrEqual(2)
  }
})

it('trả rỗng khi avoid loại hết, không throw', () => {
  const ranked = rankOutfits(
    analysisAll,
    answers({ occasions: ['date'], avoids: ['sleeveless', 'clingy', 'sheer'] }),
    catalog, 10,
  )
  expect(ranked).toEqual([])
})

it('affinity cao hơn thì outfit cùng style được xếp trên', () => {
  const minimalistFirst = rankOutfits(analysisWeighted('minimalist'), answers(), catalog, 10)
  const classicFirst = rankOutfits(analysisWeighted('modern-classic'), answers(), catalog, 10)
  expect(minimalistFirst[0].outfit.slug).not.toBe(classicFirst[0].outfit.slug)
})

it('fitPreference unsure không đổi thứ tự', () => {
  expect(rankOutfits(analysisAll, answers({ fitPreference: 'unsure' }), catalog, 10))
    .toEqual(rankOutfits(analysisAll, answers({ fitPreference: 'unsure' }), catalog, 10))
})

it('điểm bằng nhau thì xếp theo slug', () => {
  const ranked = rankOutfits(emptyAnalysis, answers({ occasions: ['work'] }), catalog, 10)
  expect(ranked.map((r) => r.outfit.slug)).toEqual([...ranked.map((r) => r.outfit.slug)].sort())
})

it('mặc định trả tối đa 3 outfit', () => {
  expect(rankOutfits(analysisAll, answers(), catalog).length).toBeLessThanOrEqual(3)
})

it('rankItems cũng loại cứng theo avoid', () => {
  const items = rankItems(analysisAll, answers({ avoids: ['sheer'] }), catalog, 20)
  expect(items.map((i) => i.slug)).not.toContain('ao-lua')
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/features/stylist/rank.test.ts`
Expected: FAIL — `rankOutfits` chưa tồn tại

- [ ] **Step 3: Implement `rankOutfits` và `rankItems` trong `src/features/stylist/rank.ts`**

Theo đúng 5 luật trên. Trọng số đặt thành const có tên ở đầu file (`STYLE_WEIGHT = 3`, `COLOR_WEIGHT = 2`, `FIT_WEIGHT = 1`, `OCCASION_WEIGHT = 1`) để đọc ra ý định.

- [ ] **Step 4: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/stylist
git commit -m "feat(stylist): xếp hạng tất định với avoid loại cứng"
```

---

## Task 12: GeminiStylistProvider

**Files:**
- Create: `src/lib/ai/model.ts`
- Create: `src/lib/ai/prompts.ts`
- Create: `src/lib/ai/gemini.ts`
- Test: `src/lib/ai/gemini.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `StylistProvider`, schema, request type (Task 8)
- Produces: `resolveModelId(env?: NodeJS.ProcessEnv): string`; `ANALYSIS_SYSTEM_PROMPT`, `EXPLAIN_SYSTEM_PROMPT`; `createGeminiProvider(deps?: { generate?: typeof generateText }): StylistProvider` với `id: 'gemini'`

`deps.generate` injectable là cách test không gọi mạng.

**Lưu ý API:** `generateObject` **không còn tồn tại trong AI SDK 7**. Structured output là `generateText({ model, output: Output.object({ schema }), ... })` và đọc ở `result.output`. Ảnh là message part `{ type: 'file', mediaType: 'image/jpeg', data: <Uint8Array> }` — **không phải** `{ type: 'image' }`.

- [ ] **Step 1: Cài dependency**

Run: `pnpm add ai @ai-sdk/google`

- [ ] **Step 2: Chốt model id**

Run: `curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_GENERATIVE_AI_API_KEY" | jq -r '.models[] | select(.supportedGenerationMethods[]? == "generateContent") | .name'`
Expected: danh sách model, không in key. Chọn model `*-flash*` multimodal có số phiên bản cao nhất trong danh sách; đặt làm `DEFAULT_MODEL_ID` ở `src/lib/ai/model.ts`. Nếu lệnh không chạy được (chưa có key), dùng `gemini-2.5-flash` làm default và ghi lại trong commit message rằng chưa xác thực được bằng key thật.

- [ ] **Step 3: Viết test thất bại trong `src/lib/ai/gemini.test.ts`**

```ts
it('model id mặc định có thể override bằng env', () => {
  expect(resolveModelId({ BIMAC_STYLIST_MODEL: 'gemini-x' } as NodeJS.ProcessEnv)).toBe('gemini-x')
  expect(resolveModelId({} as NodeJS.ProcessEnv)).toBe(DEFAULT_MODEL_ID)
})

it('gửi danh sách slug hợp lệ vào prompt', async () => {
  const generate = vi.fn().mockResolvedValue({ output: validAnalysis })
  await createGeminiProvider({ generate }).analyze(request)
  const prompt = JSON.stringify(generate.mock.calls[0][0])
  expect(prompt).toContain('minimalist')
  expect(prompt).toContain('burgundy')
})

it('đính ảnh dưới dạng file part với mediaType', async () => {
  const generate = vi.fn().mockResolvedValue({ output: validAnalysis })
  await createGeminiProvider({ generate }).analyze({
    ...request, photo: { mediaType: 'image/png', data: new Uint8Array([1, 2, 3]) },
  })
  const parts = generate.mock.calls[0][0].messages[0].content
  expect(parts).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'file', mediaType: 'image/png' }),
  ]))
})

it('không gửi part ảnh khi không có ảnh', async () => {
  const generate = vi.fn().mockResolvedValue({ output: validAnalysis })
  await createGeminiProvider({ generate }).analyze(request)
  const parts = generate.mock.calls[0][0].messages[0].content
  expect(parts.some((p: { type: string }) => p.type === 'file')).toBe(false)
})

it('throw khi output không hợp schema', async () => {
  const generate = vi.fn().mockResolvedValue({ output: { styleDirections: 'sai' } })
  await expect(createGeminiProvider({ generate }).analyze(request)).rejects.toThrow()
})

it('throw khi provider lỗi, không trả object nửa vời', async () => {
  const generate = vi.fn().mockRejectedValue(new Error('429'))
  await expect(createGeminiProvider({ generate }).analyze(request)).rejects.toThrow('429')
})

it('explain chỉ hỏi về đúng outfit được truyền vào', async () => {
  const generate = vi.fn().mockResolvedValue({ output: validExplanation })
  await createGeminiProvider({ generate }).explain(explainRequest)
  const prompt = JSON.stringify(generate.mock.calls[0][0])
  expect(prompt).toContain('modern-classic-di-lam')
  expect(prompt).not.toContain('slip-dress-trench-buoi-toi')
})

it('prompt chứa ràng buộc an toàn', () => {
  for (const prompt of [ANALYSIS_SYSTEM_PROMPT, EXPLAIN_SYSTEM_PROMPT]) {
    expect(prompt).toMatch(/không.*(chấm điểm|nhận xét).*(cơ thể|ngoại hình)/i)
  }
})

it('không gọi mạng trong test', async () => {
  const spy = vi.spyOn(globalThis, 'fetch')
  await createGeminiProvider({ generate: vi.fn().mockResolvedValue({ output: validAnalysis }) })
    .analyze(request)
  expect(spy).not.toHaveBeenCalled()
})
```

- [ ] **Step 4: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/lib/ai/gemini.test.ts`
Expected: FAIL — module chưa tồn tại

- [ ] **Step 5: Viết `src/lib/ai/prompts.ts`**

Hai system prompt tiếng Việt. Cả hai phải nêu rõ, bằng chữ: chỉ được chọn slug trong danh sách được cung cấp; `affinity` là tín hiệu xếp hạng nội bộ chứ không phải xác suất; **không suy luận đặc điểm nhạy cảm, không chấm điểm cơ thể hay ngoại hình, không trình bày phán đoán thị giác như sự thật khoa học** (docs/07). `EXPLAIN_SYSTEM_PROMPT` còn phải giới hạn lời giải thích vào đúng các yếu tố `docs/05` liệt kê: dịp mặc, fit, quan hệ màu, cân bằng silhouette, nguyên tắc style, ràng buộc tránh.

- [ ] **Step 6: Viết `src/lib/ai/model.ts` và `src/lib/ai/gemini.ts`**

`model.ts`: `DEFAULT_MODEL_ID` từ Step 2, `resolveModelId` đọc `BIMAC_STYLIST_MODEL`.
`gemini.ts`: `import { google } from '@ai-sdk/google'`, `import { generateText, Output } from 'ai'`. `analyze` dựng một message `role: 'user'` với text part (answers + vocabulary dạng JSON) và, khi có ảnh, một `{ type: 'file', mediaType, data }` part. Parse `result.output` qua `stylistAnalysisSchema.parse` — **validate lại kể cả khi `Output.object` đã ép schema**, để output không hợp lệ không bao giờ đi tiếp.

- [ ] **Step 7: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/ai
git commit -m "feat(stylist): provider Gemini qua AI SDK 7 Output.object"
```

---

## Task 13: Pipeline runStylist

**Files:**
- Create: `src/features/stylist/pipeline.ts`
- Test: `src/features/stylist/pipeline.test.ts`

**Interfaces:**
- Consumes: `resolveAnalysis` (10), `rankOutfits`/`rankItems` (11), `StylistProvider` (8), repository (4)
- Produces:
  - `StylistOutcome = { goal: StylistAnswers['goal']; providerId: 'gemini' | 'deterministic'; degraded: boolean; degradedReason: 'timeout' | 'provider-error' | 'rate-limited' | 'no-key' | null; styleDirections: Array<{ slug: string; name: string; affinity: number; reason: string; href: string }>; palette: Array<{ slug: string; name: string; hex: string; reason: string }>; outfits: Array<{ slug: string; name: string; image: string | null; whyThisWorks: string; items: Array<{ slug: string; name: string; href: string }> }>; items: Array<{ slug: string; name: string; excerpt: string; image: string | null; href: string }>; notes: string[] }`
  - `StylistDeps = { primary: StylistProvider | null; fallback: StylistProvider; catalog: StylistCatalog; timeoutMs?: number }`
  - `runStylist(input: StylistInput, deps: StylistDeps): Promise<StylistOutcome>`

`StylistOutcome` chỉ chứa dữ liệu đã resolve và `href` đã dựng — UI không tự ghép URL, nên không có đường nào để slug chưa resolve lọt ra view.

- [ ] **Step 1: Viết test thất bại trong `src/features/stylist/pipeline.test.ts`**

```ts
it('dùng provider chính khi nó chạy được', async () => {
  const outcome = await runStylist(input, { ...deps, primary: okProvider })
  expect(outcome.providerId).toBe('gemini')
  expect(outcome.degraded).toBe(false)
})

it('chuyển sang fallback khi provider chính throw', async () => {
  const outcome = await runStylist(input, { ...deps, primary: throwingProvider })
  expect(outcome.providerId).toBe('deterministic')
  expect(outcome.degraded).toBe(true)
  expect(outcome.degradedReason).toBe('provider-error')
})

it('chuyển sang fallback khi provider chính quá hạn', async () => {
  const outcome = await runStylist(input, { ...deps, primary: slowProvider, timeoutMs: 20 })
  expect(outcome.degradedReason).toBe('timeout')
})

it('dùng fallback khi không có provider chính', async () => {
  const outcome = await runStylist(input, { ...deps, primary: null })
  expect(outcome.degradedReason).toBe('no-key')
})

it('mọi href trong kết quả trỏ tới route thật', async () => {
  const outcome = await runStylist(input, deps)
  for (const d of outcome.styleDirections) expect(d.href).toMatch(/^\/styles\/[a-z-]+$/)
  for (const i of outcome.items) expect(i.href).toMatch(/^\/wardrobe\/[a-z]+\/[a-z0-9-]+$/)
  for (const o of outcome.outfits) {
    for (const i of o.items) expect(i.href).toMatch(/^\/wardrobe\/[a-z]+\/[a-z0-9-]+$/)
  }
})

it('không bao giờ render style LLM bịa ra', async () => {
  const outcome = await runStylist(input, { ...deps, primary: hallucinatingProvider })
  expect(outcome.styleDirections.map((d) => d.slug)).not.toContain('dark-academia')
})

it('analysis rỗng vẫn trả outcome có ghi chú, không rỗng hoàn toàn', async () => {
  const outcome = await runStylist(input, { ...deps, primary: emptyAnalysisProvider })
  expect(outcome.styleDirections).toEqual([])
  expect(outcome.notes.length).toBeGreaterThan(0)
})

it('bỏ lời giải thích cho outfit không nằm trong danh sách đã chọn', async () => {
  const outcome = await runStylist(input, { ...deps, primary: strayExplainProvider })
  const slugs = new Set(outcome.outfits.map((o) => o.slug))
  expect(slugs.has('khong-duoc-hoi')).toBe(false)
  for (const o of outcome.outfits) expect(o.whyThisWorks.length).toBeGreaterThan(0)
})

it('outfit thiếu lời giải thích thì dùng whyItWorks của catalog', async () => {
  const outcome = await runStylist(input, { ...deps, primary: partialExplainProvider })
  for (const o of outcome.outfits) expect(o.whyThisWorks.length).toBeGreaterThan(0)
})

it('explain lỗi thì vẫn trả outfit, chỉ hạ cấp lời giải thích', async () => {
  const outcome = await runStylist(input, { ...deps, primary: explainThrowsProvider })
  expect(outcome.outfits.length).toBeGreaterThan(0)
  expect(outcome.degraded).toBe(true)
})

it('avoid loại hết thì trả outfit rỗng kèm ghi chú', async () => {
  const outcome = await runStylist(
    { ...input, answers: { ...input.answers, occasions: ['date'], avoids: ['sleeveless', 'clingy', 'sheer'] } },
    deps,
  )
  expect(outcome.outfits).toEqual([])
  expect(outcome.notes.join(' ')).toMatch(/tránh/i)
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/features/stylist/pipeline.test.ts`
Expected: FAIL — `runStylist` chưa tồn tại

- [ ] **Step 3: Implement `runStylist` trong `src/features/stylist/pipeline.ts`**

Thứ tự: `analyze` (primary, bọc timeout) → lỗi/timeout/null thì `fallback.analyze` và set `degraded` + `degradedReason` → `resolveAnalysis` → `rankOutfits` + `rankItems` → `explain` trên **đúng** các outfit đã xếp hạng → ghép.

Ba luật ghép lời giải thích: chỉ nhận entry có `outfitSlug` nằm trong danh sách đã xếp hạng; outfit thiếu entry thì lấy `outfit.whyItWorks` của catalog; `explain` throw/timeout thì lấy `whyItWorks` cho tất cả và set `degraded = true`.

Khi `outfits` rỗng, thêm vào `notes` một dòng nói rõ lý do (ràng buộc tránh thu hẹp quá nhiều) và mời khám phá theo style — docs/05 yêu cầu "still offer non-AI style discovery".

- [ ] **Step 4: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/stylist
git commit -m "feat(stylist): pipeline hai lượt với fallback và grounding đầy đủ"
```

---

## Task 14: Rate limiter trong RAM với seam Upstash

**Files:**
- Create: `src/lib/rate-limit/index.ts`
- Create: `src/lib/rate-limit/memory.ts`
- Test: `src/lib/rate-limit/memory.test.ts`

**Interfaces:**
- Consumes: không
- Produces: `RateLimitDecision = { allowed: boolean; remaining: number; retryAfterMs: number }`; `RateLimiter = { check(key: string): Promise<RateLimitDecision> }`; `createMemoryRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter`

`src/lib/rate-limit/index.ts` export interface + `createMemoryRateLimiter`, và có khối comment nói rõ đây là seam: thay bằng Upstash Redis sliding window thì chỉ cần một implementation khác của `RateLimiter`, không sửa call site. Ghi thẳng giới hạn đã biết: bộ đếm trong RAM là **per-instance**, nên trên Vercel nhiều instance thì hạn mức thực tế = `limit × số instance`.

- [ ] **Step 1: Viết test thất bại trong `src/lib/rate-limit/memory.test.ts`**

```ts
it('cho qua tới đúng hạn mức', async () => {
  const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 1000, now: () => 0 })
  for (let i = 0; i < 3; i += 1) expect((await limiter.check('ip')).allowed).toBe(true)
  expect((await limiter.check('ip')).allowed).toBe(false)
})

it('đếm riêng theo key', async () => {
  const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
  expect((await limiter.check('a')).allowed).toBe(true)
  expect((await limiter.check('b')).allowed).toBe(true)
})

it('cửa sổ trôi thì mở lại', async () => {
  let t = 0
  const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
  expect((await limiter.check('ip')).allowed).toBe(true)
  expect((await limiter.check('ip')).allowed).toBe(false)
  t = 1001
  expect((await limiter.check('ip')).allowed).toBe(true)
})

it('báo remaining và retryAfterMs đúng', async () => {
  const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 })
  expect((await limiter.check('ip')).remaining).toBe(1)
  await limiter.check('ip')
  const blocked = await limiter.check('ip')
  expect(blocked.remaining).toBe(0)
  expect(blocked.retryAfterMs).toBe(1000)
})

it('nhiều lượt gọi song song cùng key không đếm thiếu', async () => {
  const limiter = createMemoryRateLimiter({ limit: 5, windowMs: 1000, now: () => 0 })
  const results = await Promise.all(Array.from({ length: 8 }, () => limiter.check('ip')))
  expect(results.filter((r) => r.allowed)).toHaveLength(5)
})

it('không giữ key đã hết hạn', async () => {
  let t = 0
  const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 100, now: () => t })
  for (let i = 0; i < 500; i += 1) { await limiter.check(`ip-${i}`); t += 1 }
  t += 1000
  expect((await limiter.check('ip-0')).allowed).toBe(true)
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/lib/rate-limit/memory.test.ts`
Expected: FAIL — module chưa tồn tại

- [ ] **Step 3: Implement `createMemoryRateLimiter` trong `src/lib/rate-limit/memory.ts`**

`Map<string, number[]>` giữ timestamp. Mỗi `check` lọc bỏ timestamp ngoài cửa sổ **trước** khi so với `limit`, và dọn luôn các key đã rỗng để Map không phình. `check` là đồng bộ bên trong (không `await` giữa đọc và ghi) nên lượt gọi song song không đếm thiếu.

- [ ] **Step 4: Viết `src/lib/rate-limit/index.ts`**

Re-export type + factory, kèm khối comment seam nói trên.

- [ ] **Step 5: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit
git commit -m "feat(stylist): rate limiter sliding window trong RAM, seam cho Upstash"
```

---

## Task 15: Route handler POST /api/stylist

**Files:**
- Create: `src/app/api/stylist/route.ts`
- Test: `src/app/api/stylist/route.test.ts`

**Interfaces:**
- Consumes: `stylistInputSchema` (8), `runStylist` (13), `createMemoryRateLimiter` (14), provider (9, 12), repository (4)
- Produces: `POST(request: Request): Promise<Response>`; hằng `MAX_PHOTO_BYTES = 4_000_000`, `ALLOWED_PHOTO_TYPES`, `PER_IP_LIMIT = 5`, `PER_IP_WINDOW_MS = 600_000`, `DAILY_LIMIT = 200`, `STYLIST_TIMEOUT_MS = 12_000`

**Giao thức:** `multipart/form-data` vào — field `answers` là JSON string, field `photo` là `File` tùy chọn. Ra là `application/x-ndjson`, hai dòng:

```
{"type":"analysis","styleDirections":[...],"palette":[...],"notes":[...],"degraded":false}
{"type":"result","outfits":[...],"items":[...],"providerId":"gemini","degraded":false,"degradedReason":null}
```

Streaming **theo chặng, không theo token**: docs AI SDK nói rõ *"Partial outputs streamed via streamText cannot be validated against your provided schema"*, nên stream token sẽ đẩy slug chưa validate ra UI và phá bất biến trung tâm. Chặng 1 gửi ngay khi `analyze` + `resolve` + `rank` xong; chặng 2 gửi sau `explain`.

**Không log bytes ảnh** (ADR-012).

- [ ] **Step 1: Viết test thất bại trong `src/app/api/stylist/route.test.ts`**

```ts
it('trả 400 khi answers không hợp schema', async () => {
  const res = await POST(formRequest({ answers: '{"occasions":[]}' }))
  expect(res.status).toBe(400)
})

it('trả 400 khi answers không phải JSON', async () => {
  expect((await POST(formRequest({ answers: 'khong-phai-json' }))).status).toBe(400)
})

it('trả 415 khi ảnh sai mediaType', async () => {
  const res = await POST(formRequest({ answers: validAnswers, photo: file('a.gif', 'image/gif') }))
  expect(res.status).toBe(415)
})

it('trả 413 khi ảnh quá to', async () => {
  const res = await POST(formRequest({
    answers: validAnswers, photo: file('a.jpg', 'image/jpeg', MAX_PHOTO_BYTES + 1),
  }))
  expect(res.status).toBe(413)
})

it('ảnh 0 byte thì dùng fallback, không 500', async () => {
  const res = await POST(formRequest({
    answers: validAnswers, photo: file('a.jpg', 'image/jpeg', 0),
  }))
  expect(res.status).toBe(200)
  const lines = await ndjson(res)
  expect(lines.at(-1)).toMatchObject({ providerId: 'deterministic', degraded: true })
})

it('trả 200 và hai dòng NDJSON cho request hợp lệ', async () => {
  const res = await POST(formRequest({ answers: validAnswers }))
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('application/x-ndjson')
  const lines = await ndjson(res)
  expect(lines.map((l) => l.type)).toEqual(['analysis', 'result'])
})

it('vượt hạn mức thì vẫn 200 bằng fallback, không trả lỗi', async () => {
  for (let i = 0; i < PER_IP_LIMIT; i += 1) await POST(formRequest({ answers: validAnswers }))
  const res = await POST(formRequest({ answers: validAnswers }))
  expect(res.status).toBe(200)
  const lines = await ndjson(res)
  expect(lines.at(-1)).toMatchObject({ degradedReason: 'rate-limited' })
})

it('không có key thì chạy bằng fallback', async () => {
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')
  const lines = await ndjson(await POST(formRequest({ answers: validAnswers })))
  expect(lines.at(-1)).toMatchObject({ providerId: 'deterministic', degradedReason: 'no-key' })
})

it('không ghi bytes ảnh ra log', async () => {
  const spy = vi.spyOn(console, 'log')
  const errSpy = vi.spyOn(console, 'error')
  await POST(formRequest({ answers: validAnswers, photo: file('a.jpg', 'image/jpeg', 32) }))
  for (const s of [spy, errSpy]) {
    for (const call of s.mock.calls) {
      expect(JSON.stringify(call)).not.toMatch(/Uint8Array|base64,|\[object ArrayBuffer\]/)
    }
  }
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/app/api/stylist/route.test.ts`
Expected: FAIL — module chưa tồn tại

- [ ] **Step 3: Implement `POST` trong `src/app/api/stylist/route.ts`**

Thứ tự: đọc `formData` → validate `photo` (mediaType rồi `size`) → parse `answers` qua `stylistInputSchema` → rate limit theo IP (`x-forwarded-for` dòng đầu, không có thì `'unknown'`) và hạn mức ngày toàn cục → chọn provider (`process.env.GOOGLE_GENERATIVE_AI_API_KEY` rỗng hoặc vượt hạn mức → `primary: null`) → `runStylist` → dựng `ReadableStream` ghi hai dòng NDJSON.

Thứ tự validate quan trọng: mediaType trước size, size trước khi đọc bytes, và cả hai trước rate limit — để request rác không tiêu hạn mức.

Runtime để mặc định Node.js, **không** đặt `runtime = 'edge'`.

- [ ] **Step 4: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api
git commit -m "feat(stylist): route handler NDJSON hai chặng, cap input, rate limit"
```

---

## Task 16: UI questionnaire và kết quả

**Files:**
- Create: `src/components/stylist/Questionnaire.tsx`
- Create: `src/components/stylist/StylistFlow.tsx`
- Create: `src/components/stylist/StylistResult.tsx`
- Modify: `src/app/stylist/page.tsx`
- Test: `src/components/stylist/Questionnaire.test.tsx`
- Test: `src/components/stylist/StylistResult.test.tsx`

**Interfaces:**
- Consumes: `StylistOutcome` (13), `getAvoidOptions` (4), `OCCASION_LABEL` (6)
- Produces: `Questionnaire({ avoidOptions, onSubmit, pending })`; `StylistFlow({ avoidOptions })` (client); `StylistResult({ outcome })`

- [ ] **Step 1: Viết test thất bại**

Trong `Questionnaire.test.tsx`:

```tsx
it('chỉ hiện lựa chọn tránh mà catalog tôn trọng được', () => {
  render(<Questionnaire avoidOptions={['sheer', 'sleeveless']} onSubmit={vi.fn()} pending={false} />)
  expect(screen.getByLabelText(/Chất liệu mỏng/)).toBeInTheDocument()
  expect(screen.queryByLabelText(/Cao gót/)).not.toBeInTheDocument()
})

it('không gửi khi chưa chọn dịp mặc nào', async () => {
  const onSubmit = vi.fn()
  render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)
  await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent(/dịp mặc/i)
})

it('gửi đúng answers đã chọn', async () => {
  const onSubmit = vi.fn()
  render(<Questionnaire avoidOptions={['sheer']} onSubmit={onSubmit} pending={false} />)
  await userEvent.click(screen.getByLabelText('Đi làm'))
  await userEvent.click(screen.getByLabelText(/Chất liệu mỏng/))
  await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    answers: expect.objectContaining({ occasions: ['work'], avoids: ['sheer'] }),
  }))
})

it('có dòng disclosure về ảnh ngay cạnh ô chọn ảnh', () => {
  render(<Questionnaire avoidOptions={[]} onSubmit={vi.fn()} pending={false} />)
  expect(screen.getByText(/gửi tới Google.*không được lưu/i)).toBeInTheDocument()
})

it('ảnh là tuỳ chọn, bỏ ảnh ra vẫn gửi được', async () => {
  const onSubmit = vi.fn()
  render(<Questionnaire avoidOptions={[]} onSubmit={onSubmit} pending={false} />)
  await userEvent.click(screen.getByLabelText('Đi làm'))
  await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý/ }))
  expect(onSubmit.mock.calls[0][0].photo).toBeUndefined()
})
```

Trong `StylistResult.test.tsx`:

```tsx
it('mỗi gợi ý là link sang entity thật', () => {
  render(<StylistResult outcome={outcome} />)
  expect(screen.getByRole('link', { name: /Minimalist/ })).toHaveAttribute(
    'href', '/styles/minimalist',
  )
  expect(screen.getByRole('link', { name: /Sơ mi trắng/ })).toHaveAttribute(
    'href', '/wardrobe/tops/so-mi-trang',
  )
})

it('nói rõ đang ở chế độ dự phòng khi degraded', () => {
  render(<StylistResult outcome={{ ...outcome, degraded: true, degradedReason: 'timeout' }} />)
  expect(screen.getByRole('status')).toHaveTextContent(/dự phòng/i)
})

it('không hiện affinity dạng phần trăm', () => {
  render(<StylistResult outcome={outcome} />)
  expect(screen.queryByText(/%/)).not.toBeInTheDocument()
})

it('outfit rỗng thì ra empty state có đường đi tiếp', () => {
  render(<StylistResult outcome={{ ...outcome, outfits: [], notes: ['Ràng buộc tránh hơi hẹp.'] }} />)
  expect(screen.getByText(/Ràng buộc tránh hơi hẹp/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Khám phá theo style/ })).toHaveAttribute(
    'href', '/styles',
  )
})

it('analysis rỗng hoàn toàn vẫn không ra màn hình trắng', () => {
  render(<StylistResult outcome={{
    ...outcome, styleDirections: [], palette: [], outfits: [], items: [],
    notes: ['Chưa đủ dữ kiện để chốt một hướng.'],
  }} />)
  expect(screen.getByText(/Chưa đủ dữ kiện/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Khám phá theo style/ })).toBeInTheDocument()
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm vitest run src/components/stylist`
Expected: FAIL — module chưa tồn tại

- [ ] **Step 3: Viết `Questionnaire.tsx`**

Client component. Bốn nhóm theo `docs/05`: dịp mặc (checkbox nhiều, bắt buộc ≥1), fit (radio, có "Chưa chắc"), tránh (checkbox từ `avoidOptions`), mục tiêu (radio 4 lựa chọn). Ô chọn ảnh `accept="image/jpeg,image/png,image/webp"` kèm nút bỏ ảnh. Nhãn tiếng Việt cho `ItemAttribute` chốt ở file này: `sheer`→"Chất liệu mỏng, nhìn xuyên", `sleeveless`→"Áo/váy sát nách", `clingy`→"Đồ bám sát cơ thể", `structured-shoulder`→"Vai cứng, có cấu trúc", `cropped`→"Áo croptop", `high-heel`→"Cao gót", `short-hem`→"Váy ngắn", `bright-color`→"Màu rực". Dòng disclosure cạnh ô ảnh phải nói rõ ảnh được gửi tới Google để phân tích và không được lưu lại (§4).

- [ ] **Step 4: Viết `StylistFlow.tsx`**

Client component giữ state `idle | pending | partial | done | error`. `onSubmit` dựng `FormData`, `fetch('/api/stylist', { method: 'POST' })`, đọc body theo dòng NDJSON: dòng `analysis` → render ngay phần hướng style + bảng màu; dòng `result` → render outfit + item. Lỗi mạng → thông báo kèm link `/styles`.

- [ ] **Step 5: Viết `StylistResult.tsx`**

Thứ tự khối đổi theo `outcome.goal` (field này do Task 13 đặt vào `StylistOutcome`, nên component chỉ cần một prop): `style` → hướng style trước; `colors` → bảng màu trước; `outfits` → outfit trước; `wardrobe-refresh` → item trước. `affinity` hiển thị dạng nhãn định tính ("rất khớp / khớp / có thể thử"), **không phần trăm**. `degraded` → banner `role="status"` nói rõ đang dùng chế độ dự phòng. Mọi khối rỗng → empty state có link `/styles` và `/wardrobe`.

- [ ] **Step 6: Sửa `src/app/stylist/page.tsx`**

Giữ `SectionHeading` và hai đoạn copy hiện có, thêm `<StylistFlow avoidOptions={await getAvoidOptions()} />`. Page vẫn là server component.

- [ ] **Step 7: Chạy kiểm chứng**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: PASS — `pnpm build` phải xanh **khi không có** `GOOGLE_GENERATIVE_AI_API_KEY`

- [ ] **Step 8: Commit**

```bash
git add src/components/stylist src/app/stylist
git commit -m "feat(stylist): questionnaire và UI kết quả bấm được sang catalog"
```

---

## Task 17: Playwright đường demo

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/demo-path.spec.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: mọi route từ Task 5–7, 16
- Produces: script `pnpm test:e2e`

Spec §8 đặt Playwright ở M4; kéo lên đây vì bất biến "đường demo hai phút phải luôn xanh từ cuối M2". Chặng cuối (`lưu vào closet`) thuộc M4 nên spec này dừng ở màn hình kết quả stylist.

- [ ] **Step 1: Cài Playwright**

Run: `pnpm add -D @playwright/test && pnpm exec playwright install chromium`

- [ ] **Step 2: Viết `e2e/demo-path.spec.ts`**

```ts
test('đi hết đường demo mà không gặp link chết', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Sơ mi trắng/ }).first().click()
  await expect(page).toHaveURL('/wardrobe/tops/so-mi-trang')
  await page.getByRole('link', { name: 'Modern Classic' }).first().click()
  await expect(page).toHaveURL('/styles/modern-classic')
  await page.getByRole('link', { name: /AI phối đồ/ }).first().click()
  await expect(page).toHaveURL('/stylist')
  await page.getByLabel('Đi làm').check()
  await page.getByRole('button', { name: /Xem gợi ý/ }).click()
  await expect(page.getByRole('heading', { name: /Hướng style/ })).toBeVisible({ timeout: 30_000 })
  const href = await page.getByTestId('recommended-outfit-item').first().getAttribute('href')
  await page.goto(href!)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('mọi trang chi tiết trả 200', async ({ page }) => {
  for (const path of ALL_DETAIL_PATHS) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
  }
})

test('không vỡ layout ở 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  for (const path of ['/', '/wardrobe/tops/so-mi-trang', '/styles/minimalist', '/stylist']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(overflow, path).toBe(false)
  }
})
```

`ALL_DETAIL_PATHS` sinh từ `allItems` + `allStyles`. Thêm `data-testid="recommended-outfit-item"` vào link item trong `StylistResult` ở Task 16 nếu chưa có.

- [ ] **Step 3: Viết `playwright.config.ts`**

`webServer` chạy `pnpm build && pnpm start`, `baseURL: 'http://localhost:3000'`, chỉ `chromium`, `reuseExistingServer: !process.env.CI`. Chạy **không** set `GOOGLE_GENERATIVE_AI_API_KEY` để spec kiểm luôn nhánh fallback.

- [ ] **Step 4: Thêm script và gitignore**

`package.json` → `"test:e2e": "playwright test"`. `.gitignore` → `/test-results`, `/playwright-report`.

- [ ] **Step 5: Chạy kiểm chứng**

Run: `pnpm test:e2e`
Expected: 3 test PASS

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e package.json pnpm-lock.yaml .gitignore
git commit -m "test: Playwright khoá đường demo hai phút"
```

---

## Task 18: Ghi quyết định và cập nhật tài liệu

**Files:**
- Modify: `docs/11_DECISIONS.md`
- Modify: `docs/04_DATA_MODEL.md`
- Modify: `docs/05_AI_STYLIST_SPEC.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: mọi quyết định đã thực thi ở Task 1–17
- Produces: không có API

- [ ] **Step 1: Thêm ba ADR vào `docs/11_DECISIONS.md`**

Theo template cuối file (`## ADR-NNN — Title`, Status, Decision, Reason):

- **ADR-016 — Metadata xếp hạng và avoid loại cứng.** `FashionItem` mang `occasions`/`fit`/`attributes`; questionnaire chỉ hiện lựa chọn tránh mà catalog tôn trọng được (`getAvoidOptions()`); outfit chứa item có attribute bị tránh bị **loại khỏi kết quả**, không hạ điểm. Lý do: một avoid-list chỉ hạ điểm vẫn là lời hứa bị phá, và trang `/stylist` đã hứa ra mặt.
- **ADR-017 — Sàn outfit là sàn hiển thị, không phải sàn trực tiếp.** Sửa ràng buộc "mỗi item ≥2 outfit" ở spec §5: con số đó bất khả thi ở 15 item / 10 outfit vì outfit có váy liền loại trừ áo và quần. Thay bằng: mọi item ≥1 outfit trực tiếp, và `getRelatedOutfits()` đảm bảo ≥2 outfit hiển thị, bù từ outfit cùng style. Lý do: giữ đúng mục tiêu (trang item không trống) thay vì giữ con số.
- **ADR-018 — Structured output qua `Output.object`; streaming theo chặng.** `generateObject` không còn tồn tại trong AI SDK 7; dùng `generateText` + `Output.object({ schema })`. Streaming là NDJSON hai chặng, không phải token — vì docs AI SDK nói partial output của `streamText` **không** validate được theo schema, nên stream token sẽ đẩy slug chưa resolve ra UI và phá bất biến ở spec §4. Rate limit là sliding window trong RAM với Upstash Redis ở lại dạng seam (sửa spec §4), giới hạn per-instance được ghi rõ trong `src/lib/rate-limit/index.ts`.

- [ ] **Step 2: Cập nhật `docs/04_DATA_MODEL.md`**

Thêm `occasions`/`fit`/`attributes` và bốn field nội dung vào `fashion_items`, `occasions` vào `outfits`, `paragraphs`/`outfitFormulas` vào `styles`, và bảng `categories`. Ghi rõ "suitable styles / compatible colors / example outfits" là **suy ra**, không lưu.

- [ ] **Step 3: Thêm dòng trỏ ở đầu `docs/05_AI_STYLIST_SPEC.md`**

Nối tới ADR-016 và ADR-018, nói rõ `generateObject` trong tài liệu đã lỗi thời và contract thật nằm ở `src/lib/ai/provider.ts`.

- [ ] **Step 4: Cập nhật `CLAUDE.md`**

Sửa khối "Repository state": M2 và M3 đã xong; `/stylist` **không còn** là copy-only shell; `/closet` vẫn là shell (không lưu, không persistence) và đó là M4. Thêm vào mục Commands: `pnpm test:e2e`. Ghi rõ env `GOOGLE_GENERATIVE_AI_API_KEY` là tuỳ chọn và app chạy bằng fallback khi thiếu.

- [ ] **Step 5: Chạy kiểm chứng đầy đủ**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: tất cả PASS

- [ ] **Step 6: Kiểm bằng tay (spec §11)**

Với key thật trong `.env`: đi luồng stylist, xác nhận `providerId: 'gemini'` và `degraded: false`, và mọi link trong kết quả mở ra trang thật. Rồi xoá key: luồng vẫn chạy, banner dự phòng hiện ra.

- [ ] **Step 7: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs: ADR-016/017/018 và cập nhật data model, CLAUDE.md"
```
