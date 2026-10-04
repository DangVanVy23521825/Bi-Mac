# Bí Mặc — M0 Foundation + M1 Art Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một URL Bí Mặc live trên Vercel, đã ra dáng thương hiệu, năm mục nav đều là trang thật, nội dung chạy qua lớp repository có type — cộng một art direction đã được kiểm chứng bằng 4 ảnh thật.

**Architecture:** Next.js App Router, toàn bộ trang static vì nội dung là fixture build-time. Presentation (`src/components/`) không bao giờ đọc fixture trực tiếp; mọi trang gọi qua repository function async trong `src/data/`, nên M2 đổi sang Postgres chỉ sửa một thư mục. Ảnh chưa có thì `EditorialImage` render khối tô theo token ở đúng tỷ lệ đã reserve, nên nhịp layout đúng từ trước khi có ảnh.

**Tech Stack:** Next.js App Router · TypeScript strict · Tailwind CSS · pnpm · Vitest + Testing Library · Vercel

**Spec:** `docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md`

## Global Constraints

- **Không có ecommerce** dưới mọi hình thức: cart, checkout, payment, seller, giá tiền, "mua ngay" (`ADR-001`).
- **Không Supabase, không auth, không AI trong M0/M1.** Seam AI thuộc M3 theo spec §8 — không dựng sớm.
- **Palette chỉ 5 màu:** Warm Ivory `#F5F0E8` · Burgundy `#681F32` · Chocolate `#49312B` · Soft Taupe `#B7A89B` · Ink Black `#151515`. Component **không được dùng hex thô** — chỉ dùng token semantic.
- **Cấm về mặt thị giác** (`docs/06`): gradient trang trí, glassmorphism, shadow mềm lớn, bo góc lớn, mọi section bọc trong card, nhiều icon, animation ồn.
- **Ngôn ngữ sản phẩm là tiếng Việt.** Identifier/schema/comment kỹ thuật dùng tiếng Anh.
- **Không link chết.** Link nào chưa có trang đích thì trỏ về trang index của khu vực đó.
- **Mobile từ 360px.** Body ≥ 16px trên mobile.
- **Chạy được không cần credential.** Không biến môi trường nào là bắt buộc để `pnpm dev` và `pnpm build` chạy.
- **Mọi khẳng định "đã pass" phải kèm output thật.** `CLAUDE.md`: không bao giờ nói validation pass khi chưa chạy.
- **Commit:** `CLAUDE.md` cấm commit khi chưa được yêu cầu. Các step commit dưới đây giả định người dùng đã cho phép commit cho lần thực thi này — **hỏi trước commit đầu tiên**.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/types/content.ts` | Type của mọi entity nội dung. Chỉ các field M0 render — M2 mở rộng thêm |
| `src/data/fixtures/*.ts` | Nội dung thật, mỗi file một entity |
| `src/data/index.ts` | Repository function async — **mặt tiếp xúc duy nhất** mà page được gọi |
| `src/components/ui/EditorialImage.tsx` | Ảnh hoặc khối placeholder, giữ đúng tỷ lệ |
| `src/components/ui/SectionHeading.tsx` | Eyebrow + tiêu đề serif, dùng lại ở mọi section |
| `src/components/editorial/*.tsx` | Primitive nội dung: hero, tile, look, swatch, card, CTA |
| `src/components/layout/nav.ts` | Cấu hình nav + `isActive()` — logic thuần, test được |
| `src/components/layout/SiteHeader.tsx` | Header server component |
| `src/components/layout/MobileNavigation.tsx` | Client component duy nhất trong M0 |
| `src/components/layout/Footer.tsx` | Footer + dòng công bố ảnh AI |
| `src/app/page.tsx` | Trang chủ: chỉ gọi repository rồi compose primitive |
| `src/app/{wardrobe,styles,stylist,closet}/page.tsx` | Route shell |
| `docs/13_ART_DIRECTION.md` | Spec art direction + prompt (M1) |

**Nguyên tắc test của plan này:** TDD cho phần có logic — repository, `isActive()`, fallback của `EditorialImage`, toàn vẹn tham chiếu giữa fixture. Component thuần thị giác chỉ cần render smoke test. Viết test đơn vị cho một khối hero là tốn công mà không bắt được lỗi nào thật; lỗi của nó là lỗi mắt nhìn.

---

### Task 1: Ghi quyết định và chặn bẫy docs cũ

Docs hiện tại mâu thuẫn với spec ở 7 chỗ. Session sau đọc `docs/01` rồi đi làm auth là hỏng. Task này làm trước mọi dòng code.

**Files:**
- Modify: `docs/11_DECISIONS.md`
- Modify: `docs/00_PROJECT_CONTEXT.md`, `docs/01_PRD.md`, `docs/05_AI_STYLIST_SPEC.md`, `docs/07_SECURITY_PRIVACY.md`, `docs/08_SEED_CONTENT.md`, `docs/09_MVP_ROADMAP.md`
- Modify: `docs/plans/0001-foundation.md`

**Interfaces:**
- Consumes: spec §10
- Produces: ADR-006 … ADR-015 tồn tại và được tham chiếu bởi các task sau

- [ ] **Step 1: Thêm 10 ADR vào `docs/11_DECISIONS.md`**

Chèn trước mục `## Template for new decisions`, dùng đúng format của các ADR đang có (`## ADR-NNN — Title`, `**Status:**`, `**Decision:**`, `**Reason:**`). Nội dung:

| ADR | Decision | Reason |
|---|---|---|
| 006 | Display font Cormorant Garamond, body font Inter. Nếu Cormorant không có subset `vietnamese` thì dùng Playfair Display | Serif editorial cho tiêu đề; sans đọc tốt chữ có dấu ở cỡ nhỏ |
| 007 | Repository function async từ đầu dù đang đọc fixture đồng bộ | M2 đổi sang Postgres không chạm component nào |
| 008 | Chưa dùng route group `(public)`/`(account)` | Chỉ thêm khi có ranh giới layout auth thật |
| 009 | Mục tiêu là portfolio; người xem là khách freelance/đối tác | Quyết định gốc, mọi ưu tiên phía sau suy ra từ đây |
| 010 | My Closet v1 lưu `localStorage`, không đăng nhập | Form đăng nhập làm chết demo hai phút; save/unsave là CRUD, không gây ấn tượng |
| 011 | Gemini là provider chính của AI Stylist; engine tất định hạ xuống fallback + test seam | Sửa `ADR-003` (đang là mock-first) |
| 012 | Ảnh người dùng không lưu ở đâu, xử lý trong RAM mỗi request | Mạnh hơn private bucket, và gỡ Supabase Storage khỏi v1. Sửa `ADR-005` |
| 013 | Ảnh là AI sinh, art direction khoá cứng, không mặt nhận diện được | Mặt AI là dấu hiệu lộ số một; crop không mặt cũng đúng ngôn ngữ editorial |
| 014 | Catalog v1: 15 item (3/category) / 5 style / 10 outfit / 3 story | Ngân sách ảnh quyết định khối lượng. Sửa `docs/08` |
| 015 | Deploy từ M0; roadmap sắp lại theo spec §8 | Lỗi hạ tầng tìm thấy ngày đầu mất một tiếng, tìm thấy ở cuối mất buổi gặp |

Status của cả 10: `Accepted`.

- [ ] **Step 2: Chèn dòng trỏ vào 6 file docs bị sửa**

Thêm ngay dưới dòng tiêu đề `#` của mỗi file, nguyên văn (đổi phần trong ngoặc):

```markdown
> **Đã được sửa bởi** `docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md`
> ([ADR-0NN]). Đọc spec trước khi làm theo file này.
```

| File | ADR |
|---|---|
| `docs/00_PROJECT_CONTEXT.md` | ADR-009 |
| `docs/01_PRD.md` | ADR-010 — mục Authentication không còn bắt buộc auth để lưu |
| `docs/05_AI_STYLIST_SPEC.md` | ADR-011, ADR-012 |
| `docs/07_SECURITY_PRIVACY.md` | ADR-012 — ảnh không lưu, không có bucket ở v1 |
| `docs/08_SEED_CONTENT.md` | ADR-014 |
| `docs/09_MVP_ROADMAP.md` | ADR-015 |

- [ ] **Step 3: Đánh dấu plan cũ hết hiệu lực**

Chèn dưới tiêu đề `docs/plans/0001-foundation.md`:

```markdown
> **HẾT HIỆU LỰC (2026-10-04).** Plan này giả định thứ tự mốc của `docs/09` và AI
> mock-first. Thay bởi `docs/superpowers/plans/2026-10-04-m0-foundation-m1-art-direction.md`.
```

- [ ] **Step 4: Kiểm**

Dòng trỏ và ADR viết bằng **tiếng Anh** để khớp `docs/11_DECISIONS.md` (đã có ADR-001..005
tiếng Anh) và khớp toàn bộ `docs/00`..`docs/12`. `CLAUDE.md` chỉ bắt buộc tiếng Việt cho
ngôn ngữ sản phẩm.

Run: `grep -lc "Superseded in part by" docs/*.md | wc -l`
Expected: `6` — và đúng 6 file `00, 01, 05, 07, 08, 09`

Run: `grep -c "^## ADR-0" docs/11_DECISIONS.md`
Expected: `15`

Lưu ý: dùng `^## ADR-0` chứ không phải `^## ADR-`. Mục `## Template for new decisions`
chứa ví dụ `## ADR-NNN — Title`, nên pattern rộng trả về 16 và làm tưởng là lỗi.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: record ADR-006..015 and flag superseded sections"
```

---

### Task 2: Scaffold + strict TypeScript + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `test/setup.ts`, `.gitignore`
- Delete: boilerplate của create-next-app trong `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: script `dev`/`build`/`lint`/`typecheck`/`test`; alias `@/*` → `src/*`

- [ ] **Step 1: Scaffold vào thư mục gốc**

```bash
pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Không thêm cờ nào ngoài danh sách trên — cờ không tồn tại làm create-next-app dừng.
Nếu nó vẫn hỏi tương tác thì trả lời: TypeScript **yes**, ESLint **yes**, Tailwind
**yes**, `src/` **yes**, App Router **yes**, import alias **`@/*`**, Turbopack **theo
mặc định nó đề xuất**.

Nó sẽ hỏi về file đang có — giữ `CLAUDE.md`, `README.md`, `docs/`, `PROMPT_INIT_CLAUDE.md`,
`.gitignore`.

Ghi lại version Next và Tailwind thật vào plan log; Task 3 phân nhánh theo Tailwind v3 hay v4.

- [ ] **Step 2: Bật strict trong `tsconfig.json`**

Trong `compilerOptions`, thêm/đảm bảo:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

- [ ] **Step 3: Cài test dependency**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom vite-tsconfig-paths
```

- [ ] **Step 4: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 5: Tạo `test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 6: Thêm script vào `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Xoá boilerplate**

Rút `src/app/page.tsx` về. **Không dùng `<main>` ở đây** — Task 6 sẽ đặt `<main>` vào
layout, và `<main>` lồng `<main>` là HTML không hợp lệ:

```tsx
export default function Home() {
  return <div />
}
```

Xoá toàn bộ nội dung `src/app/globals.css` trừ dòng import Tailwind. Xoá các file SVG mẫu trong `public/`.

- [ ] **Step 8: Kiểm — bốn lệnh phải xanh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: cả bốn pass. `pnpm test` báo "No test files found" — chấp nhận ở bước này, Task 4 thêm test đầu tiên.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js app with strict ts and vitest"
```

---

### Task 3: Design token và font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: utility class `bg-background` `text-foreground` `text-accent` `bg-muted` `font-display` `font-body`; không component nào được dùng hex thô sau task này

- [ ] **Step 1: Khai báo token trong `src/app/globals.css` (Tailwind v4)**

```css
@import "tailwindcss";

@theme {
  --color-ivory: #F5F0E8;
  --color-burgundy: #681F32;
  --color-chocolate: #49312B;
  --color-taupe: #B7A89B;
  --color-ink: #151515;

  --color-background: #F5F0E8;
  --color-foreground: #151515;
  --color-accent: #681F32;
  --color-accent-soft: #49312B;
  --color-muted: #B7A89B;

  --font-display: var(--font-display-src), ui-serif, Georgia, serif;
  --font-body: var(--font-body-src), ui-sans-serif, system-ui, sans-serif;
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

::selection {
  background-color: var(--color-accent);
  color: var(--color-ivory);
}
```

Nếu scaffold ra Tailwind v3 thì chuyển khối `@theme` vào `theme.extend.colors` / `theme.extend.fontFamily` trong `tailwind.config.ts`, giữ nguyên tên token.

- [ ] **Step 2: Nạp font trong `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'

const display = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '600'],
  variable: '--font-display-src',
  display: 'swap',
})

const body = Inter({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  variable: '--font-body-src',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bí Mặc — Hiểu để mặc đẹp',
  description:
    'Từ điển thời trang, cách phối đồ theo style, và gợi ý phối đồ cá nhân cho phụ nữ Việt.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Kiểm font có hỗ trợ tiếng Việt — đây là chỗ dễ sập**

Run: `pnpm build`

`next/font` validate subset lúc build. Nếu Cormorant Garamond **không** có subset `vietnamese`, build fail và in ra danh sách subset hợp lệ.

Khi đó: đổi sang `Playfair_Display` (đã có subset `vietnamese`), đổi `weight` thành `['400','500','600']`, và **cập nhật ADR-006** trong `docs/11_DECISIONS.md` để ghi lý do đổi. Không im lặng đổi font.

- [ ] **Step 4: Kiểm bằng mắt chữ có dấu**

Đặt tạm vào `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <div className="p-10 space-y-6">
      <h1 className="font-display text-6xl">Tủ đồ của tôi — Phối theo style</h1>
      <p className="font-body text-base">AI phối đồ · Chocolate Brown: từ màu khó mặc đến neutral mới</p>
    </div>
  )
}
```

Run: `pnpm dev`, mở `http://localhost:3000`.
Expected: mọi dấu `ủ ồ ố ế ớ ừ đ` hiện đúng ở **cả hai** font, không ô vuông, không dấu bị cắt ngọn ở cỡ 6xl.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx docs/11_DECISIONS.md
git commit -m "feat: add design tokens and vietnamese-capable font pair"
```

---

### Task 4: Type, fixture, repository

**Files:**
- Create: `src/types/content.ts`
- Create: `src/data/fixtures/{colors,styles,items,outfits,stories}.ts`
- Create: `src/data/index.ts`
- Test: `src/data/index.test.ts`

**Interfaces:**
- Produces:
  - `type CategorySlug = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'`
  - `type Color = { slug: string; name: string; hex: string }`
  - `type FashionItem = { slug: string; name: string; category: CategorySlug; excerpt: string; image: string | null; colorSlugs: string[]; styleSlugs: string[] }`
  - `type Style = { slug: string; name: string; tagline: string; image: string | null; colorSlugs: string[] }`
  - `type Outfit = { slug: string; name: string; whyItWorks: string; image: string | null; itemSlugs: string[]; styleSlugs: string[] }`
  - `type Story = { slug: string; title: string; excerpt: string; image: string | null }`
  - `getTrendingItems(): Promise<FashionItem[]>`, `getEssentialItems(): Promise<FashionItem[]>`, `getStyles(): Promise<Style[]>`, `getFeaturedLooks(): Promise<Outfit[]>`, `getColorStory(): Promise<Color[]>`, `getFeaturedStories(): Promise<Story[]>`, `getItemBySlug(slug: string): Promise<FashionItem | undefined>`
  - `allItems`, `allStyles`, `allOutfits`, `allColors`, `allStories` export từ `src/data/index.ts` cho test toàn vẹn

- [ ] **Step 1: Viết test trước — `src/data/index.test.ts`**

Test thứ ba là test giá trị nhất của M0: nó giữ bất biến "mọi cross-reference phải resolve", chính là tổ tiên của test grounding ở M3.

```ts
import { describe, expect, it } from 'vitest'
import {
  allColors, allItems, allOutfits, allStyles,
  getItemBySlug, getFeaturedStories,
} from '@/data'

describe('repository', () => {
  it('trả về undefined cho slug không tồn tại', async () => {
    expect(await getItemBySlug('khong-ton-tai')).toBeUndefined()
  })

  it('trả về đúng item theo slug', async () => {
    const item = await getItemBySlug('so-mi-trang')
    expect(item?.name).toBe('Sơ mi trắng')
  })

  it('trả về tối đa 3 story', async () => {
    expect((await getFeaturedStories()).length).toBeLessThanOrEqual(3)
  })
})

describe('toàn vẹn tham chiếu fixture', () => {
  const colorSlugs = new Set(allColors.map((c) => c.slug))
  const styleSlugs = new Set(allStyles.map((s) => s.slug))
  const itemSlugs = new Set(allItems.map((i) => i.slug))

  it('mọi colorSlug của item đều tồn tại', () => {
    for (const item of allItems) {
      for (const slug of item.colorSlugs) {
        expect(colorSlugs, `item ${item.slug}`).toContain(slug)
      }
    }
  })

  it('mọi styleSlug của item đều tồn tại', () => {
    for (const item of allItems) {
      for (const slug of item.styleSlugs) {
        expect(styleSlugs, `item ${item.slug}`).toContain(slug)
      }
    }
  })

  it('mọi itemSlug của outfit đều tồn tại', () => {
    for (const outfit of allOutfits) {
      for (const slug of outfit.itemSlugs) {
        expect(itemSlugs, `outfit ${outfit.slug}`).toContain(slug)
      }
    }
  })

  it('không có slug trùng trong cùng một tập', () => {
    expect(new Set(allItems.map((i) => i.slug)).size).toBe(allItems.length)
    expect(new Set(allStyles.map((s) => s.slug)).size).toBe(allStyles.length)
  })
})
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `pnpm vitest run src/data/index.test.ts`
Expected: FAIL — không resolve được module `@/data`.

- [ ] **Step 3: Viết `src/types/content.ts`**

Chỉ các field M0 render. M2 sẽ thêm `characteristics`, `howToStyle`, `whatToAvoid`, `occasionSlugs` — đừng dựng sớm.

```ts
export type CategorySlug = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'

export type Color = { slug: string; name: string; hex: string }

export type FashionItem = {
  slug: string
  name: string
  category: CategorySlug
  excerpt: string
  image: string | null
  colorSlugs: string[]
  styleSlugs: string[]
}

export type Style = {
  slug: string
  name: string
  tagline: string
  image: string | null
  colorSlugs: string[]
}

export type Outfit = {
  slug: string
  name: string
  whyItWorks: string
  image: string | null
  itemSlugs: string[]
  styleSlugs: string[]
}

export type Story = {
  slug: string
  title: string
  excerpt: string
  image: string | null
}
```

- [ ] **Step 4: Viết fixture**

`src/data/fixtures/colors.ts`:

```ts
import type { Color } from '@/types/content'

export const colors: Color[] = [
  { slug: 'kem', name: 'Kem', hex: '#F5F0E8' },
  { slug: 'chocolate', name: 'Chocolate', hex: '#49312B' },
  { slug: 'burgundy', name: 'Burgundy', hex: '#681F32' },
  { slug: 'be-xam', name: 'Be xám', hex: '#B7A89B' },
  { slug: 'den', name: 'Đen', hex: '#151515' },
]
```

`src/data/fixtures/styles.ts` — 5 style của `docs/08`:

```ts
import type { Style } from '@/types/content'

export const styles: Style[] = [
  {
    slug: 'modern-classic',
    name: 'Modern Classic',
    tagline: 'Đường cắt gọn, màu tiết chế, mặc được mười năm không cũ.',
    image: null,
    colorSlugs: ['kem', 'chocolate', 'den'],
  },
  {
    slug: 'quiet-luxury',
    name: 'Quiet Luxury',
    tagline: 'Không logo, không ồn ào. Chất liệu và dáng áo nói thay.',
    image: null,
    colorSlugs: ['kem', 'be-xam', 'chocolate'],
  },
  {
    slug: 'minimalist',
    name: 'Minimalist',
    tagline: 'Ít chi tiết nhất có thể, nhưng mỗi chi tiết đều đúng chỗ.',
    image: null,
    colorSlugs: ['kem', 'den', 'be-xam'],
  },
  {
    slug: 'soft-feminine',
    name: 'Soft Feminine',
    tagline: 'Mềm mà không ngọt. Dáng rủ, màu ấm, đường viền nhẹ.',
    image: null,
    colorSlugs: ['kem', 'burgundy', 'be-xam'],
  },
  {
    slug: 'casual-chic',
    name: 'Casual Chic',
    tagline: 'Thoải mái nhưng vẫn có chủ ý. Thường ngày mà không tạm bợ.',
    image: null,
    colorSlugs: ['kem', 'den', 'chocolate'],
  },
]
```

`src/data/fixtures/items.ts` — M0 chỉ cần 6 item cho trang chủ; 9 item còn lại thuộc M2:

```ts
import type { FashionItem } from '@/types/content'

export const items: FashionItem[] = [
  {
    slug: 'so-mi-trang',
    name: 'Sơ mi trắng',
    category: 'tops',
    excerpt: 'Món nền của gần như mọi outfit chỉn chu. Khác biệt nằm ở dáng cổ và độ đứng của vải.',
    image: null,
    colorSlugs: ['kem'],
    styleSlugs: ['modern-classic', 'minimalist', 'quiet-luxury'],
  },
  {
    slug: 'ao-lua',
    name: 'Áo lụa',
    category: 'tops',
    excerpt: 'Độ rủ và ánh sáng trên bề mặt làm outfit mềm lại mà không cần thêm chi tiết nào.',
    image: null,
    colorSlugs: ['kem', 'burgundy'],
    styleSlugs: ['soft-feminine', 'quiet-luxury'],
  },
  {
    slug: 'quan-wide-leg-chocolate',
    name: 'Quần wide-leg chocolate',
    category: 'bottoms',
    excerpt: 'Ống rộng kéo dáng và màu chocolate ấm hơn đen — dễ mặc hơn vẻ ngoài của nó.',
    image: null,
    colorSlugs: ['chocolate'],
    styleSlugs: ['modern-classic', 'casual-chic'],
  },
  {
    slug: 'chan-vay-midi',
    name: 'Chân váy midi',
    category: 'bottoms',
    excerpt: 'Độ dài qua bắp chân là chỗ cân bằng giữa thoải mái và trang trọng.',
    image: null,
    colorSlugs: ['be-xam', 'den'],
    styleSlugs: ['soft-feminine', 'modern-classic'],
  },
  {
    slug: 'blazer',
    name: 'Blazer',
    category: 'outerwear',
    excerpt: 'Thêm cấu trúc cho vai và biến một outfit thường ngày thành outfit đi làm.',
    image: null,
    colorSlugs: ['den', 'chocolate'],
    styleSlugs: ['modern-classic', 'minimalist'],
  },
  {
    slug: 'loafer',
    name: 'Loafer',
    category: 'accessories',
    excerpt: 'Phẳng, kín mũi, đứng dáng — đôi giày làm outfit nghiêm túc hơn mà vẫn đi bộ được.',
    image: null,
    colorSlugs: ['chocolate', 'den'],
    styleSlugs: ['modern-classic', 'casual-chic', 'quiet-luxury'],
  },
]
```

`src/data/fixtures/outfits.ts` — M0 cần 2 look; 8 look còn lại thuộc M2:

```ts
import type { Outfit } from '@/types/content'

export const outfits: Outfit[] = [
  {
    slug: 'modern-classic-di-lam',
    name: 'Modern Classic đi làm',
    whyItWorks:
      'Sơ mi trắng giữ phần trên gọn, ống quần rộng cân lại tỷ lệ, và cả bộ chỉ dùng ba màu nên không có chi tiết nào phải giành chú ý.',
    image: null,
    itemSlugs: ['so-mi-trang', 'quan-wide-leg-chocolate', 'loafer'],
    styleSlugs: ['modern-classic'],
  },
  {
    slug: 'soft-feminine-cuoi-tuan',
    name: 'Soft Feminine cuối tuần',
    whyItWorks:
      'Áo lụa rủ xuống gặp chân váy midi tạo một đường dọc liền mạch; sắc burgundy ấm giữ outfit khỏi nhạt.',
    image: null,
    itemSlugs: ['ao-lua', 'chan-vay-midi', 'loafer'],
    styleSlugs: ['soft-feminine'],
  },
]
```

`src/data/fixtures/stories.ts` — 3 tiêu đề lấy từ `docs/08`:

```ts
import type { Story } from '@/types/content'

export const stories: Story[] = [
  {
    slug: 'mua-thu-nay-mac-mau-gi',
    title: 'Mùa thu này mặc màu gì?',
    excerpt: 'Chocolate, burgundy và những sắc trung tính mới của mùa.',
    image: null,
  },
  {
    slug: 'chocolate-brown',
    title: 'Chocolate Brown: từ màu khó mặc đến neutral mới',
    excerpt: 'Vì sao một màu từng bị tránh giờ thay được đen trong gần như mọi outfit.',
    image: null,
  },
  {
    slug: 'so-mi-trang-phoi-the-nao',
    title: 'Một chiếc sơ mi trắng có thể phối như thế nào?',
    excerpt: 'Bốn cách mặc cùng một chiếc áo cho bốn hoàn cảnh khác nhau.',
    image: null,
  },
]
```

- [ ] **Step 5: Viết `src/data/index.ts`**

Async từ đầu theo ADR-007, dù nguồn đang là mảng đồng bộ.

```ts
import type { Color, FashionItem, Outfit, Story, Style } from '@/types/content'
import { colors } from './fixtures/colors'
import { items } from './fixtures/items'
import { outfits } from './fixtures/outfits'
import { stories } from './fixtures/stories'
import { styles } from './fixtures/styles'

export const allColors: readonly Color[] = colors
export const allItems: readonly FashionItem[] = items
export const allOutfits: readonly Outfit[] = outfits
export const allStories: readonly Story[] = stories
export const allStyles: readonly Style[] = styles

export async function getTrendingItems(): Promise<FashionItem[]> {
  return items.slice(0, 3)
}

export async function getEssentialItems(): Promise<FashionItem[]> {
  return items.slice(0, 4)
}

export async function getStyles(): Promise<Style[]> {
  return [...styles]
}

export async function getFeaturedLooks(): Promise<Outfit[]> {
  return [...outfits]
}

export async function getColorStory(): Promise<Color[]> {
  return [...colors]
}

export async function getFeaturedStories(): Promise<Story[]> {
  return stories.slice(0, 3)
}

export async function getItemBySlug(slug: string): Promise<FashionItem | undefined> {
  return items.find((item) => item.slug === slug)
}
```

- [ ] **Step 6: Chạy test để chắc nó pass**

Run: `pnpm vitest run src/data/index.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 7: Commit**

```bash
git add src/types src/data
git commit -m "feat: add typed content fixtures behind async repository layer"
```

---

### Task 5: Primitive `EditorialImage` và `SectionHeading`

**Files:**
- Create: `src/components/ui/EditorialImage.tsx`
- Create: `src/components/ui/SectionHeading.tsx`
- Test: `src/components/ui/EditorialImage.test.tsx`

**Interfaces:**
- Produces:
  - `type Ratio = 'hero' | 'portrait' | 'look'`
  - `<EditorialImage src={string | null} alt={string} ratio={Ratio} priority?={boolean} />`
  - `<SectionHeading eyebrow={string} title={string} />`

`ratio` map: `hero` = 3/2, `portrait` = 4/5 (story), `look` = 3/4 (item và outfit) — theo `docs/06`.

- [ ] **Step 1: Viết test — `src/components/ui/EditorialImage.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorialImage } from './EditorialImage'

describe('EditorialImage', () => {
  it('render img khi có src', () => {
    render(<EditorialImage src="/images/items/so-mi-trang.jpg" alt="Sơ mi trắng" ratio="look" />)
    expect(screen.getByAltText('Sơ mi trắng')).toBeInTheDocument()
  })

  it('render khối placeholder khi src là null, và không có img', () => {
    const { container } = render(<EditorialImage src={null} alt="Sơ mi trắng" ratio="look" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-placeholder="true"]')).toBeInTheDocument()
  })

  it('placeholder bị ẩn khỏi trình đọc màn hình vì nó chỉ là trang trí', () => {
    const { container } = render(<EditorialImage src={null} alt="Sơ mi trắng" ratio="look" />)
    expect(container.querySelector('[data-placeholder="true"]')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `pnpm vitest run src/components/ui/EditorialImage.test.tsx`
Expected: FAIL — không tìm thấy module `./EditorialImage`.

- [ ] **Step 3: Viết `src/components/ui/EditorialImage.tsx`**

```tsx
import Image from 'next/image'

export type Ratio = 'hero' | 'portrait' | 'look'

const RATIO_CLASS: Record<Ratio, string> = {
  hero: 'aspect-[3/2]',
  portrait: 'aspect-[4/5]',
  look: 'aspect-[3/4]',
}

const RATIO_SIZE: Record<Ratio, { width: number; height: number }> = {
  hero: { width: 1536, height: 1024 },
  portrait: { width: 1024, height: 1280 },
  look: { width: 1024, height: 1365 },
}

type Props = {
  src: string | null
  alt: string
  ratio: Ratio
  priority?: boolean
}

export function EditorialImage({ src, alt, ratio, priority = false }: Props) {
  if (!src) {
    return (
      <div
        data-placeholder="true"
        aria-hidden="true"
        className={`${RATIO_CLASS[ratio]} w-full bg-muted/35`}
      />
    )
  }

  const { width, height } = RATIO_SIZE[ratio]

  return (
    <div className={`${RATIO_CLASS[ratio]} relative w-full overflow-hidden`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none hover:scale-[1.02]"
      />
    </div>
  )
}
```

Khối placeholder cố tình **không** có chữ "coming soon" hay icon — nó là một mảng màu taupe nhạt giữ đúng chỗ, nên layout đọc ra là có chủ ý thay vì thiếu hàng.

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `pnpm vitest run src/components/ui/EditorialImage.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 5: Viết `src/components/ui/SectionHeading.tsx`**

```tsx
type Props = {
  eyebrow: string
  title: string
}

export function SectionHeading({ eyebrow, title }: Props) {
  return (
    <div className="mb-10 border-t border-muted/40 pt-6">
      <p className="font-body text-xs uppercase tracking-[0.18em] text-accent-soft">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-normal sm:text-4xl">{title}</h2>
    </div>
  )
}
```

Đường kẻ mảnh phía trên thay cho việc bọc section vào card — đúng `docs/06`.

- [ ] **Step 6: Kiểm**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui
git commit -m "feat: add EditorialImage with placeholder fallback and SectionHeading"
```

---

### Task 6: Nav, header, mobile nav, footer, layout

**Files:**
- Create: `src/components/layout/nav.ts`
- Create: `src/components/layout/SiteHeader.tsx`
- Create: `src/components/layout/MobileNavigation.tsx`
- Create: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/components/layout/nav.test.ts`

**Interfaces:**
- Produces:
  - `NAV: readonly { href: string; label: string }[]`
  - `isActive(pathname: string, href: string): boolean`

- [ ] **Step 1: Viết test — `src/components/layout/nav.test.ts`**

`isActive` là chỗ duy nhất trong header có logic thật, và nó có một bẫy: prefix match làm `/styles` sáng khi đang ở `/stylist`.

```ts
import { describe, expect, it } from 'vitest'
import { NAV, isActive } from './nav'

describe('NAV', () => {
  it('có đúng 5 mục theo docs/02', () => {
    expect(NAV.map((i) => i.label)).toEqual([
      'Trang chủ', 'Tủ đồ', 'AI phối đồ', 'Phối theo style', 'Tủ đồ của tôi',
    ])
  })
})

describe('isActive', () => {
  it('trang chủ chỉ active khi pathname đúng bằng /', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/wardrobe', '/')).toBe(false)
  })

  it('active cho trang con', () => {
    expect(isActive('/wardrobe/tops/so-mi-trang', '/wardrobe')).toBe(true)
  })

  it('không active do trùng tiền tố — /styles không được sáng khi đang ở /stylist', () => {
    expect(isActive('/stylist', '/styles')).toBe(false)
    expect(isActive('/styles', '/stylist')).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `pnpm vitest run src/components/layout/nav.test.ts`
Expected: FAIL — không tìm thấy module `./nav`.

- [ ] **Step 3: Viết `src/components/layout/nav.ts`**

```ts
export const NAV = [
  { href: '/', label: 'Trang chủ' },
  { href: '/wardrobe', label: 'Tủ đồ' },
  { href: '/stylist', label: 'AI phối đồ' },
  { href: '/styles', label: 'Phối theo style' },
  { href: '/closet', label: 'Tủ đồ của tôi' },
] as const

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `pnpm vitest run src/components/layout/nav.test.ts`
Expected: PASS, 4 test.

- [ ] **Step 5: Viết `src/components/layout/MobileNavigation.tsx`**

Client component duy nhất của M0. Cần Escape để đóng, khoá scroll khi mở, và `aria-expanded`.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NAV, isActive } from './nav'

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="font-body text-xs uppercase tracking-[0.18em]"
      >
        {open ? 'Đóng' : 'Menu'}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Điều hướng chính"
          className="fixed inset-0 top-16 z-50 bg-background px-6 pt-10"
        >
          <ul className="space-y-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`font-display text-3xl ${
                    isActive(pathname, item.href) ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Viết `src/components/layout/SiteHeader.tsx`**

Header là client component vì cần `usePathname` cho trạng thái active — nhưng nó không giữ state nào, và đây là ngoại lệ duy nhất.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MobileNavigation } from './MobileNavigation'
import { NAV, isActive } from './nav'

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-muted/40 bg-background/95 backdrop-blur-none">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Bí Mặc
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.slice(1).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`font-body text-xs uppercase tracking-[0.14em] ${
                    isActive(pathname, item.href)
                      ? 'text-accent'
                      : 'text-foreground hover:text-accent'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <MobileNavigation />
      </div>
    </header>
  )
}
```

- [ ] **Step 7: Viết `src/components/layout/Footer.tsx`**

Dòng công bố ảnh AI nằm ở đây theo spec §6 — nói trước thì nó là quyết định sản xuất, để khách tự phát hiện thì mất uy tín.

```tsx
import Link from 'next/link'
import { NAV } from './nav'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-muted/40 px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <p className="font-display text-2xl">Bí Mặc</p>
          <p className="mt-3 font-body text-sm text-accent-soft">
            Hiểu để mặc đẹp — từ điển thời trang và cách phối đồ cho phụ nữ Việt.
          </p>
        </div>

        <nav aria-label="Điều hướng chân trang">
          <ul className="space-y-3">
            {NAV.slice(1).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-body text-sm hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="mx-auto mt-12 max-w-6xl font-body text-xs text-accent-soft">
        Hình ảnh trên Bí Mặc được tạo bằng AI phục vụ mục đích trình bày sản phẩm.
      </p>
    </footer>
  )
}
```

- [ ] **Step 8: Nối vào `src/app/layout.tsx`**

Thêm import và bọc `children`:

```tsx
import { Footer } from '@/components/layout/Footer'
import { SiteHeader } from '@/components/layout/SiteHeader'
```

```tsx
      <body>
        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </body>
```

- [ ] **Step 9: Kiểm bằng tay**

Run: `pnpm dev`
Expected ở 360px: nút "Menu" hiện, bấm mở overlay full-screen, Escape đóng, điều hướng xong tự đóng, nav desktop ẩn. Ở ≥768px: 4 link hiện, mục đang ở được tô burgundy, nút Menu ẩn. Tab bằng bàn phím thấy rõ viền focus.

- [ ] **Step 10: Commit**

```bash
git add src/components/layout src/app/layout.tsx
git commit -m "feat: add site header, mobile navigation and footer"
```

---

### Task 7: Bốn route shell

**Files:**
- Create: `src/app/wardrobe/page.tsx`, `src/app/styles/page.tsx`, `src/app/stylist/page.tsx`, `src/app/closet/page.tsx`

**Interfaces:**
- Consumes: `SectionHeading` (Task 5), `getStyles` (Task 4)

Shell phải là trang thật có nội dung thật, **không phải thẻ "coming soon"**. Mỗi trang: một `SectionHeading`, một câu trung thực về khu vực đó, và một đường dẫn tiếp vào sản phẩm.

- [ ] **Step 1: `src/app/wardrobe/page.tsx`**

```tsx
import { SectionHeading } from '@/components/ui/SectionHeading'

const CATEGORIES = [
  { slug: 'tops', name: 'Áo' },
  { slug: 'bottoms', name: 'Quần & chân váy' },
  { slug: 'dresses', name: 'Váy liền' },
  { slug: 'outerwear', name: 'Áo khoác' },
  { slug: 'accessories', name: 'Phụ kiện' },
]

export default function WardrobePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ" title="Từ điển thời trang" />
      <p className="max-w-xl font-body text-base text-accent-soft">
        Mỗi món đồ được giải thích là gì, đặc điểm ra sao, phối với gì, và nên tránh điều gì.
      </p>
      <ul className="mt-12 divide-y divide-muted/40 border-t border-muted/40">
        {CATEGORIES.map((c) => (
          <li key={c.slug} className="py-6 font-display text-3xl">
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Danh sách category **không phải link** trong M0 vì `/wardrobe/[category]` thuộc M2. Link
trỏ về chính trang đang mở là một no-op mà khách bấm hai lần sẽ nhận ra. M2 bọc lại
thành `Link`. Bỏ cả `import Link` khỏi file này cho tới lúc đó — `noUnusedLocals` sẽ
báo nếu quên.

- [ ] **Step 2: `src/app/styles/page.tsx`**

```tsx
import { SectionHeading } from '@/components/ui/SectionHeading'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { getStyles } from '@/data'

export default async function StylesPage() {
  const styles = await getStyles()

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Phối theo style" title="Năm hướng style" />
      <div className="mt-4 space-y-16">
        {styles.map((style) => (
          <article key={style.slug} className="grid gap-6 sm:grid-cols-5 sm:items-center">
            <div className="sm:col-span-2">
              <EditorialImage src={style.image} alt={style.name} ratio="look" />
            </div>
            <div className="sm:col-span-3">
              <h3 className="font-display text-3xl">{style.name}</h3>
              <p className="mt-3 max-w-md font-body text-base text-accent-soft">{style.tagline}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
```

Đây cũng là nguyên mẫu của **layout editorial xếp dọc** mà spec §5 yêu cầu cho trang category ở M2.

- [ ] **Step 3: `src/app/stylist/page.tsx`**

```tsx
import { SectionHeading } from '@/components/ui/SectionHeading'

export default function StylistPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="AI phối đồ" title="Gợi ý phối đồ cho riêng bạn" />
      <p className="font-body text-base text-accent-soft">
        Bạn trả lời vài câu về dịp mặc, dáng áo bạn thích và những thứ bạn muốn tránh. Bí Mặc
        gợi ý hướng style, bảng màu và các outfit cụ thể lấy từ tủ đồ của trang — kèm lý do vì
        sao chúng hợp với bạn.
      </p>
      <p className="mt-6 font-body text-sm text-accent-soft">
        Ảnh là tuỳ chọn. Nếu bạn gửi ảnh, nó chỉ dùng để phân tích trong lần đó và không được lưu lại.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: `src/app/closet/page.tsx`**

Empty state này giữ nguyên hình dạng nó sẽ có ở M4, theo `docs/02` — mọi empty state phải mở đường trở lại phần khám phá.

```tsx
import Link from 'next/link'
import { SectionHeading } from '@/components/ui/SectionHeading'

export default function ClosetPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="Tủ đồ của tôi" title="Những gì bạn đã lưu" />
      <p className="font-body text-base text-accent-soft">
        Bạn chưa lưu món nào. Lưu được ngay mà không cần tạo tài khoản.
      </p>
      <div className="mt-8 flex flex-wrap gap-6">
        <Link href="/styles" className="font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline">
          Khám phá theo style
        </Link>
        <Link href="/stylist" className="font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline">
          Thử AI phối đồ
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Kiểm**

Run: `pnpm typecheck && pnpm build`
Expected: PASS, và output build cho thấy `/wardrobe`, `/styles`, `/stylist`, `/closet` đều là static.

Run: `pnpm dev` rồi mở cả bốn URL.
Expected: không trang nào trống, không link chết, header active đúng mục.

- [ ] **Step 6: Commit**

```bash
git add src/app
git commit -m "feat: add four route shells with real content"
```

---

### Task 8: Trang chủ

**Files:**
- Create: `src/components/editorial/{EditorialHero,FashionItemTile,OutfitLook,ColorSwatch,StoryCard,StylistCta}.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: mọi repository function của Task 4; `EditorialImage`, `SectionHeading` của Task 5
- Produces: 8 khối của `docs/02` §Homepage flow

- [ ] **Step 1: Viết sáu primitive**

`EditorialHero.tsx` — ảnh chiếm nửa khung cạnh khối chữ, không phủ kín, theo spec §6 (độ phân giải ảnh AI không đủ cho full-bleed desktop):

```tsx
import Link from 'next/link'
import { EditorialImage } from '@/components/ui/EditorialImage'

export function EditorialHero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 pb-20 sm:grid-cols-2 sm:items-center sm:pt-16">
      <div>
        <p className="font-body text-xs uppercase tracking-[0.2em] text-accent-soft">
          Số mùa thu
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl">
          Chocolate, burgundy
          <br />
          và những sắc trung tính mới
        </h1>
        <p className="mt-6 max-w-sm font-body text-base text-accent-soft">
          Ba màu làm nên mùa này, và cách mặc chúng mà vẫn giữ outfit thanh lịch.
        </p>
        <Link
          href="/wardrobe"
          className="mt-8 inline-block font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
        >
          Vào tủ đồ
        </Link>
      </div>
      <EditorialImage src={null} alt="Số mùa thu của Bí Mặc" ratio="hero" priority />
    </section>
  )
}
```

`FashionItemTile.tsx`:

```tsx
import Link from 'next/link'
import { EditorialImage } from '@/components/ui/EditorialImage'
import type { FashionItem } from '@/types/content'

export function FashionItemTile({ item }: { item: FashionItem }) {
  return (
    <Link href="/wardrobe" className="group block">
      <EditorialImage src={item.image} alt={item.name} ratio="look" />
      <h3 className="mt-4 font-display text-xl group-hover:text-accent">{item.name}</h3>
      <p className="mt-2 font-body text-sm text-accent-soft">{item.excerpt}</p>
    </Link>
  )
}
```

`OutfitLook.tsx`:

```tsx
import { EditorialImage } from '@/components/ui/EditorialImage'
import type { Outfit } from '@/types/content'

export function OutfitLook({ outfit }: { outfit: Outfit }) {
  return (
    <article className="grid gap-6 sm:grid-cols-2 sm:items-center">
      <EditorialImage src={outfit.image} alt={outfit.name} ratio="look" />
      <div>
        <h3 className="font-display text-2xl">{outfit.name}</h3>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.16em] text-accent-soft">
          Vì sao hợp
        </p>
        <p className="mt-2 font-body text-sm text-accent-soft">{outfit.whyItWorks}</p>
      </div>
    </article>
  )
}
```

`ColorSwatch.tsx`:

```tsx
import type { Color } from '@/types/content'

export function ColorSwatch({ color }: { color: Color }) {
  return (
    <div>
      <div
        className="aspect-square w-full border border-muted/40"
        style={{ backgroundColor: color.hex }}
        aria-hidden="true"
      />
      <p className="mt-3 font-body text-sm">{color.name}</p>
    </div>
  )
}
```

`style` inline ở đây là ngoại lệ có lý do: màu đến từ dữ liệu, không phải từ token thiết kế.

`StoryCard.tsx` — **không phải link trong M0**, vì `/stories/[slug]` thuộc M4. Một thẻ
trông bấm được mà bấm không ra gì tệ hơn một thẻ không bấm được; M4 sẽ bọc lại thành
`Link`:

```tsx
import { EditorialImage } from '@/components/ui/EditorialImage'
import type { Story } from '@/types/content'

export function StoryCard({ story }: { story: Story }) {
  return (
    <article>
      <EditorialImage src={story.image} alt={story.title} ratio="portrait" />
      <h3 className="mt-4 font-display text-xl leading-snug">{story.title}</h3>
      <p className="mt-2 font-body text-sm text-accent-soft">{story.excerpt}</p>
    </article>
  )
}
```

`StylistCta.tsx`:

```tsx
import Link from 'next/link'

export function StylistCta() {
  return (
    <section className="border-y border-muted/40 px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-accent-soft">
          Hỏi Bí Mặc
        </p>
        <h2 className="mt-4 font-display text-4xl">Không biết bắt đầu từ đâu?</h2>
        <p className="mt-5 font-body text-base text-accent-soft">
          Trả lời vài câu hỏi, Bí Mặc gợi ý hướng style, bảng màu và outfit cụ thể cho bạn.
        </p>
        <Link
          href="/stylist"
          className="mt-8 inline-block border border-accent px-8 py-3 font-body text-sm uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-ivory"
        >
          Thử AI phối đồ
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Viết `src/app/page.tsx`**

Trang chỉ gọi repository rồi compose — không có fixture nào import trực tiếp vào đây.

```tsx
import { ColorSwatch } from '@/components/editorial/ColorSwatch'
import { EditorialHero } from '@/components/editorial/EditorialHero'
import { FashionItemTile } from '@/components/editorial/FashionItemTile'
import { OutfitLook } from '@/components/editorial/OutfitLook'
import { StoryCard } from '@/components/editorial/StoryCard'
import { StylistCta } from '@/components/editorial/StylistCta'
import { EditorialImage } from '@/components/ui/EditorialImage'
import { SectionHeading } from '@/components/ui/SectionHeading'
import {
  getColorStory, getEssentialItems, getFeaturedLooks,
  getFeaturedStories, getStyles, getTrendingItems,
} from '@/data'
import Link from 'next/link'

export default async function Home() {
  const [trending, colors, essentials, looks, styles, stories] = await Promise.all([
    getTrendingItems(), getColorStory(), getEssentialItems(),
    getFeaturedLooks(), getStyles(), getFeaturedStories(),
  ])

  return (
    <>
      <EditorialHero />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Trending now" title="Đang được mặc nhiều" />
        <div className="grid gap-10 sm:grid-cols-3">
          {trending.map((item) => <FashionItemTile key={item.slug} item={item} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Color story" title="Bảng màu của mùa" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          {colors.map((color) => <ColorSwatch key={color.slug} color={color} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="The wardrobe" title="Những món làm nền cho tủ đồ" />
        <div className="grid gap-10 sm:grid-cols-4">
          {essentials.map((item) => <FashionItemTile key={item.slug} item={item} />)}
        </div>
        <Link
          href="/wardrobe"
          className="mt-10 inline-block font-body text-sm uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
        >
          Xem toàn bộ tủ đồ
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Featured looks" title="Outfit gợi ý" />
        <div className="space-y-16">
          {looks.map((outfit) => <OutfitLook key={outfit.slug} outfit={outfit} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Find your style" title="Hướng style nào giống bạn?" />
        <div className="grid gap-10 sm:grid-cols-5">
          {styles.map((style) => (
            <Link key={style.slug} href="/styles" className="group block">
              <EditorialImage src={style.image} alt={style.name} ratio="look" />
              <h3 className="mt-3 font-display text-lg group-hover:text-accent">{style.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <StylistCta />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Fashion stories" title="Đọc thêm" />
        <div className="grid gap-10 sm:grid-cols-3">
          {stories.map((story) => <StoryCard key={story.slug} story={story} />)}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 3: Viết smoke test — `src/app/page.test.tsx`**

Test này bắt đúng một loại lỗi: một section bị mất khi refactor.

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('trang chủ', () => {
  it('render đủ tám khối theo docs/02', async () => {
    render(await Home())

    for (const heading of [
      'Đang được mặc nhiều',
      'Bảng màu của mùa',
      'Những món làm nền cho tủ đồ',
      'Outfit gợi ý',
      'Hướng style nào giống bạn?',
      'Không biết bắt đầu từ đâu?',
      'Đọc thêm',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }

    expect(
      screen.getByRole('heading', { level: 1, name: /sắc trung tính mới/ }),
    ).toBeInTheDocument()
  })

  it('CTA stylist trỏ sang /stylist', async () => {
    render(await Home())
    expect(screen.getByRole('link', { name: 'Thử AI phối đồ' })).toHaveAttribute('href', '/stylist')
  })
})
```

- [ ] **Step 4: Chạy test**

Run: `pnpm vitest run src/app/page.test.tsx`
Expected: PASS, 2 test.

- [ ] **Step 5: Kiểm bốn lệnh + mắt**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: cả bốn PASS, `/` là static.

Run: `pnpm dev`, xem ở 360px và 1440px.
Expected: không tràn ngang, nhịp section rõ, khối placeholder taupe đọc ra là có chủ ý. Rà lại Global Constraints về thị giác: không gradient, không shadow lớn, không bo góc lớn, không section nào bọc card.

Run: `grep -rnE "#[0-9A-Fa-f]{6}" src/components src/app`
Expected: chỉ khớp trong `globals.css`. Hex trong `src/data/fixtures/colors.ts` là dữ liệu, không tính.

- [ ] **Step 6: Commit**

```bash
git add src/components/editorial src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: build editorial homepage from repository data"
```

---

### Task 9: Deploy Vercel và README

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md` (mục `## Repository state`)

**Interfaces:**
- Produces: URL production live

- [ ] **Step 1: Đăng nhập Vercel — việc của người dùng**

Lệnh này cần xác thực tương tác, agent không chạy được. Yêu cầu người dùng gõ trong session:

```
! pnpm dlx vercel login
```

- [ ] **Step 2: Deploy preview**

```bash
pnpm dlx vercel
```

Nhận mặc định khi nó hỏi scope/liên kết project. Framework phải tự nhận ra là Next.js.

- [ ] **Step 3: Kiểm URL preview trên điện thoại thật**

Mở URL preview trên điện thoại. Expected: năm mục nav đều tới trang thật, menu mobile mở/đóng được, không vỡ layout, không màn hình lỗi.

- [ ] **Step 4: Promote lên production**

```bash
pnpm dlx vercel --prod
```

Ghi lại URL production.

- [ ] **Step 5: Viết lại `README.md`**

Thay toàn bộ nội dung starter-pack hiện tại bằng:

```markdown
# Bí Mặc

Nền tảng kiến thức thời trang và gợi ý phối đồ cho phụ nữ Việt.

Live: <URL production>

## Chạy ở máy

```bash
pnpm install
pnpm dev
```

Không cần credential nào. Không cần Supabase, không cần API key.

## Kiểm tra

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Tài liệu

- Hướng dự án hiện hành: `docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md`
- Quyết định kiến trúc: `docs/11_DECISIONS.md`
- Art direction: `docs/13_ART_DIRECTION.md`
- Nội dung sản phẩm: `docs/00` → `docs/12`

Hình ảnh được tạo bằng AI phục vụ mục đích trình bày sản phẩm.
```

- [ ] **Step 6: Cập nhật `## Repository state` trong `CLAUDE.md`**

Thay mô tả "chỉ có documentation và steering files" bằng trạng thái thật: app Next.js đã có, M0 xong, URL production, và M1 là việc tiếp theo. Kiểm lại mục `## Commands` khớp với script thật trong `package.json`.

- [ ] **Step 7: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: document local commands and live deployment"
```

---

### Task 10: Art direction spec (M1)

**Files:**
- Create: `docs/13_ART_DIRECTION.md`

**Interfaces:**
- Produces: khối prompt dùng lại được cho Task 11 và cho toàn bộ 35 ảnh của M2

- [ ] **Step 1: Viết `docs/13_ART_DIRECTION.md`**

Cấu trúc bắt buộc, mỗi mục viết thành câu cụ thể chứ không phải tính từ:

1. **Luật tuyệt đối** — không mặt nhận diện được trong khung (crop từ vai xuống, sau lưng, nghiêng, hoặc mặt ra ngoài khung); chỉ 5 màu trong palette; không logo, không chữ trong ảnh; không trang sức lấp lánh; không hậu cảnh đô thị ồn.
2. **Ánh sáng** — một nguồn sáng mềm từ bên, không đèn flash trực diện, bóng đổ nhẹ và có hướng rõ.
3. **Hậu cảnh** — tường/vải phẳng tông Warm Ivory hoặc Soft Taupe; không đạo cụ trừ khi là món trong outfit.
4. **Khung và tỷ lệ** — hero 3:2, story 4:5, item và outfit 3:4. Khớp với `Ratio` trong `EditorialImage`.
5. **Hậu kỳ** — tông ấm, độ tương phản trung bình, không filter, không hạt film giả.
6. **Khối prompt dùng lại** — dán nguyên văn ở đầu mỗi thread ChatGPT, trước mọi prompt ảnh:

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
7. **Prompt riêng cho từng loại ảnh** — bốn mẫu: hero, style hero, item, outfit.
8. **Quy ước tên file** — `public/images/<loại>/<slug>.jpg`, ví dụ `public/images/items/so-mi-trang.jpg`, `public/images/outfits/modern-classic-di-lam.jpg`. Khớp chính xác slug trong fixture.
9. **Quy trình** — một thread cho mỗi bộ; ảnh outfit đính kèm ảnh item đã sinh và yêu cầu giữ đúng món đó; lưu prompt thật đã dùng vào cuối file này.

- [ ] **Step 2: Kiểm**

Đọc lại mục 6: một người khác chỉ đọc khối prompt đó, không đọc gì thêm, có sinh ra được ảnh đúng tông không? Nếu còn tính từ chung chung ("đẹp", "sang", "editorial") thì viết lại thành mô tả kiểm được.

- [ ] **Step 3: Commit**

```bash
git add docs/13_ART_DIRECTION.md
git commit -m "docs: add locked art direction spec"
```

---

### Task 11: Lô ảnh thử bốn tấm (M1)

Việc của người dùng, làm tay trong ChatGPT Plus. Mốc này nhỏ có chủ đích: kiểm chứng toàn bộ tiền đề thị giác của dự án trước khi cam kết 35 tấm.

**Files:**
- Create: `public/images/hero/thu-2026.jpg`
- Create: `public/images/styles/modern-classic.jpg`
- Create: `public/images/items/so-mi-trang.jpg`
- Create: `public/images/outfits/modern-classic-di-lam.jpg`

- [ ] **Step 1: Sinh 4 ảnh theo `docs/13_ART_DIRECTION.md`**

Một thread, khối prompt dán ở tin đầu. Thứ tự quan trọng: **sinh ảnh item trước ảnh outfit**, rồi đính ảnh `so-mi-trang.jpg` vào prompt outfit và yêu cầu giữ đúng chiếc áo đó.

- [ ] **Step 2: Lưu file đúng quy ước tên và tỷ lệ**

hero 3:2 · style 3:4 · item 3:4 · outfit 3:4.

- [ ] **Step 3: Đánh giá — cổng quyết định của M1**

Mở bốn ảnh cạnh nhau và trả lời:

1. Có đọc ra là **một bộ** không, hay bốn tấm rời?
2. Màu có nằm trong palette 5 màu không, hay đã trôi sang xám xanh / be hồng?
3. Có khuôn mặt nào nhận diện được không? Nếu có là **fail luật tuyệt đối**, sinh lại.
4. Áo sơ mi trong ảnh outfit có nhận ra là cùng chiếc với ảnh item không?
5. Một tấm mất bao nhiêu phút thật? × 35 = tổng công M2 cho ảnh.

Không đạt mục 1 hoặc 2: sửa `docs/13_ART_DIRECTION.md`, sinh lại, đánh giá lại. **Không đi tiếp sang M2 khi bốn tấm còn rời rạc** — đó là toàn bộ mục đích của mốc này.

- [ ] **Step 4: Ghi kết quả vào cuối `docs/13_ART_DIRECTION.md`**

Prompt thật đã dùng, thời gian mỗi tấm, và những gì phải sửa so với bản spec đầu.

---

### Task 12: Nối 4 ảnh thật vào UI (M1)

**Files:**
- Modify: `src/data/fixtures/{items,styles,outfits}.ts`
- Modify: `src/components/editorial/EditorialHero.tsx`
- Modify: `next.config.ts` (chỉ nếu cần)

**Interfaces:**
- Consumes: 4 file ảnh của Task 11; `EditorialImage` của Task 5

- [ ] **Step 1: Trỏ fixture sang ảnh thật**

Trong `items.ts`, item `so-mi-trang`: `image: '/images/items/so-mi-trang.jpg'`.
Trong `styles.ts`, style `modern-classic`: `image: '/images/styles/modern-classic.jpg'`.
Trong `outfits.ts`, outfit `modern-classic-di-lam`: `image: '/images/outfits/modern-classic-di-lam.jpg'`.

Các record khác giữ `image: null` — đó là lý do `EditorialImage` có nhánh fallback.

- [ ] **Step 2: Trỏ hero sang ảnh thật**

Trong `EditorialHero.tsx`, đổi `src={null}` thành `src="/images/hero/thu-2026.jpg"`, giữ `priority`.

- [ ] **Step 3: Kiểm — đây là lúc pipeline được xác nhận đầu-cuối**

Run: `pnpm build`
Expected: PASS. Không cần cấu hình domain ảnh vì file là local.

Run: `pnpm dev`
Expected: 4 ảnh thật và các khối placeholder **sống cạnh nhau mà trang vẫn đọc ra là có chủ ý**. Không layout shift khi tải (tỷ lệ đã reserve). Không ảnh nào bị méo hay bị crop mất phần quan trọng.

Nếu ảnh thật cạnh placeholder làm trang trông chắp vá, đó là tín hiệu thật và cần ghi lại: M2 phải thay ảnh theo từng section hoàn chỉnh, không rải lẻ.

- [ ] **Step 4: Deploy lại và xem trên điện thoại**

```bash
pnpm dlx vercel --prod
```

Expected: ảnh tải nhanh trên 4G, hero không mờ trên màn hình retina. Hero mờ thì xử lý theo spec §6 — không tăng kích thước ảnh, mà giảm phần khung mà ảnh chiếm.

- [ ] **Step 5: Commit**

```bash
git add public/images src/data/fixtures src/components/editorial/EditorialHero.tsx docs/13_ART_DIRECTION.md
git commit -m "feat: wire first art-directed images into the homepage"
```

---

## Hoàn thành M0 + M1

Điều kiện đóng mốc, phải có output thật cho từng dòng:

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — cả bốn xanh
- [ ] URL production mở được trên điện thoại thật, năm mục nav đều tới trang thật
- [ ] Không link chết; không trang nào trống; không yêu cầu credential nào
- [ ] Không hex thô ngoài `globals.css` và fixture màu
- [ ] Chữ tiếng Việt có dấu hiện đúng ở cả display font và body font
- [ ] 10 ADR đã ghi; 6 file docs cũ đã có dòng trỏ; plan cũ đã đánh dấu hết hiệu lực
- [ ] Bốn ảnh thử đọc ra là một bộ, không có mặt nhận diện được
- [ ] Đã biết số phút thật cho mỗi ảnh → ước lượng được công ảnh của M2

**Mốc tiếp theo:** M2 — 15 item, 5 style, 10 outfit đủ nội dung và ảnh, trang category layout editorial xếp dọc, item detail, style detail, cross-link. Viết plan riêng.
