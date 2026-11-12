# Tủ đồ cá nhân có tài khoản — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đăng nhập bằng Google, tự upload quần áo của mình vào tủ đồ có AI gắn nhãn sẵn, và AI phối đồ dùng chính đồ đó trong kết quả.

**Architecture:** Supabase (Auth + Postgres + Storage) cắm vào sau một seam env trả `null` khi thiếu credentials, nên app vẫn boot/test/build khi chưa cấu hình. Ảnh đi thẳng từ trình duyệt lên bucket private; server chỉ nhận đường dẫn. Năng lực gắn nhãn là một provider mới trong `src/lib/ai/` theo đúng mẫu `StylistProvider` (Gemini + fallback deterministic, output ràng enum). Pipeline stylist hiện tại được nới bằng một type `RankableItem` hẹp để xếp hạng được cả món catalog lẫn món cá nhân, và món cá nhân ra ở một nhóm kết quả riêng (`closetItems`) nên mọi test/UI hiện có không đổi.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind 4 · `@supabase/supabase-js` + `@supabase/ssr` · Zod 4 · AI SDK 7 + `@ai-sdk/google` · Vitest 5 (jsdom) · Playwright

**Spec:** `docs/superpowers/specs/2026-10-31-tu-do-ca-nhan-design.md`

## Global Constraints

- `pnpm build`, `pnpm test`, `pnpm typecheck` phải xanh khi **không có** biến Supabase và **không có** `GOOGLE_GENERATIVE_AI_API_KEY`.
- Trang công khai (`/`, `/wardrobe/*`, `/styles/*`) không được đòi session.
- Runtime Node.js mặc định. Không `export const runtime = 'edge'`.
- Service-role key chỉ dùng ở server, không bao giờ nằm trong bundle client.
- Bucket ảnh tủ đồ là **private**; client chỉ nhận signed URL hạn ngắn sinh ở server.
- `src/lib/ai/**` không được import `@/data` hay entity catalog (`FashionItem`, `Style`, `Color`, `Outfit`) — xem đầu `src/lib/ai/provider.ts`.
- `MAX_PHOTO_BYTES = 4_000_000` và `ALLOWED_PHOTO_TYPES = ['image/jpeg','image/png','image/webp']` chỉ định nghĩa ở `src/features/stylist/photo-limits.ts`.
- `OCCASIONS` trong `src/types/stylist.ts` là nguồn duy nhất của `Occasion`.
- `CategorySlug` không được đổi — nó là segment URL công khai.
- Ảnh cơ thể gửi cho AI phối đồ vẫn **không bao giờ lưu** (ADR-012).
- Tên món và ghi chú do AI sinh ra phải bằng **tiếng Việt**.
- Commit theo mẫu đang dùng trong repo: `feat(closet): …`, `fix(auth): …`, mô tả tiếng Việt.

## Review Focus

1. **Thiếu env Supabase** — `/closet` hiện trạng thái "chưa cấu hình", `/stylist` chạy catalog-only, không trang nào crash. (Task 1, Task 11)
2. **Người dùng A thao tác lên id của người dùng B** — đọc/sửa/xoá/ảnh đều bị từ chối, kể cả khi đoán đúng id và đường dẫn file. (Task 2, Task 4)
3. **Model gắn nhãn trả giá trị ngoài từ vựng** (category lạ, màu không có trong fixtures) — bị bỏ, không ghi rác vào database. (Task 5)
4. **Slug catalog đã lưu nhưng không còn trong fixtures** — bỏ qua khi đọc, không ném lỗi, không hiện mục rỗng. (Task 8)
5. **Xoá tài khoản mà file còn sót trong bucket** — test phải kiểm cả bucket, không chỉ database. (Task 13)

---

## File Structure

| Đường dẫn | Trách nhiệm |
|---|---|
| `src/lib/supabase/env.ts` | Đọc + validate env, trả `null` khi chưa cấu hình |
| `src/lib/supabase/server.ts` | Client phía server gắn cookie session |
| `src/lib/supabase/client.ts` | Client phía trình duyệt |
| `src/lib/supabase/admin.ts` | Client service-role, chỉ cho xoá tài khoản |
| `src/lib/supabase/session.ts` | `getCurrentUserId()` |
| `supabase/migrations/*.sql` | Bảng, RLS, bucket, policy storage |
| `src/types/closet.ts` | `ClosetItem`, `ClosetItemDraft`, `LabelSource` |
| `src/features/closet/schema.ts` | Zod cho draft/patch, dùng chung client + route |
| `src/features/closet/repository.ts` | CRUD `closet_items` |
| `src/features/closet/images.ts` | Đường dẫn bucket + signed URL |
| `src/features/closet/saved.ts` | CRUD `saved_items` / `saved_outfits` / `saved_styles` |
| `src/features/closet/quota.ts` | Hạn mức gọi model theo người dùng, lưu Postgres |
| `src/lib/ai/tagger.ts` | Contract `GarmentTagger` + schema Zod |
| `src/lib/ai/tagger-deterministic.ts` | Fallback không cần key |
| `src/lib/ai/tagger-gemini.ts` | Provider Gemini |
| `src/app/api/closet/tag/route.ts` | Biên HTTP cho gắn nhãn |
| `src/app/api/account/route.ts` | Xoá tài khoản |
| `src/features/stylist/rankable.ts` | `RankableItem`, `PersonalItem` |
| `src/app/closet/**` | UI tủ đồ |
| `src/components/closet/**` | Component tủ đồ |

---

### Task 1: Seam Supabase chịu được thiếu credentials

**Files:**
- Create: `src/lib/supabase/env.ts`, `src/lib/supabase/env.test.ts`
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/session.ts`
- Modify: `package.json` (thêm `@supabase/supabase-js`, `@supabase/ssr`)
- Create: `.env.example`

**Interfaces:**
- Consumes: —
- Produces:
  - `type SupabaseEnv = { url: string; anonKey: string }`
  - `getSupabaseEnv(): SupabaseEnv | null`
  - `isSupabaseConfigured(): boolean`
  - `createSupabaseServerClient(): Promise<SupabaseClient | null>` (null khi chưa cấu hình)
  - `createSupabaseBrowserClient(): SupabaseClient | null`
  - `getCurrentUserId(): Promise<string | null>`

- [ ] **Step 1: Viết test fail** — `src/lib/supabase/env.test.ts`

```ts
it('trả null khi thiếu biến môi trường', () => {
  expect(getSupabaseEnv({})).toBeNull()
})
it('trả null khi chỉ có url mà thiếu anon key', () => {
  expect(getSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull()
})
it('trả env khi có đủ hai biến', () => {
  expect(getSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  })).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon' })
})
it('isSupabaseConfigured false khi env rỗng', () => {
  expect(isSupabaseConfigured({})).toBe(false)
})
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/lib/supabase/env.test.ts` → FAIL "getSupabaseEnv is not defined"

- [ ] **Step 3: Cài dependency**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 4: Implement `getSupabaseEnv(source: Record<string, string | undefined> = process.env): SupabaseEnv | null` và `isSupabaseConfigured(source?): boolean` trong `src/lib/supabase/env.ts`**

Nhận `source` làm tham số (mặc định `process.env`) để test không phải mutate môi trường. Validate bằng Zod; parse thất bại trả `null`, **không** throw — đây là ràng buộc "chạy được khi thiếu credentials".

- [ ] **Step 5: Implement ba client trong `server.ts` / `client.ts` / `session.ts`**

Dùng `createServerClient`/`createBrowserClient` của `@supabase/ssr`. Cả ba hàm trả `null` khi `getSupabaseEnv()` là `null`. `server.ts` đọc/ghi cookie qua `cookies()` của `next/headers`. `getCurrentUserId()` gọi `supabase.auth.getUser()` và trả `data.user?.id ?? null`.

- [ ] **Step 6: Viết `.env.example`** — liệt kê `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, kèm một dòng ghi rõ cả bốn đều tuỳ chọn.

- [ ] **Step 7: Chạy test + typecheck + build** — `pnpm vitest run src/lib/supabase/ && pnpm typecheck && pnpm build` (shell không có biến Supabase) → PASS

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example src/lib/supabase
git commit -m "feat(supabase): seam client trả null khi chưa cấu hình"
```

---

### Task 2: Migration, RLS, bucket

**Files:**
- Create: `supabase/migrations/0001_account_and_closet.sql`
- Create: `supabase/README.md`
- Create: `scripts/setup-supabase.sh`
- Create: `src/lib/supabase/rls.integration.test.ts`

**Interfaces:**
- Consumes: Task 1 env seam
- Produces: schema — `profiles(id, display_name, avatar_url, preferences jsonb, created_at, updated_at)`; `closet_items(id, user_id, name, image_path, category, color_slugs text[], style_slugs text[], occasions text[], fit, attributes text[], note, label_source, created_at, updated_at)`; `saved_items(user_id, item_slug, created_at)`; `saved_outfits(user_id, outfit_slug, created_at)`; `saved_styles(user_id, style_slug, created_at)`; bucket private `closet`

- [ ] **Step 1: Viết test fail** — `src/lib/supabase/rls.integration.test.ts`

Test tự bỏ qua khi thiếu env, theo đúng cách `src/lib/ai/gemini.test.ts` đang làm với API key. Dùng hai user thật.

```ts
it.skipIf(!hasServiceRoleEnv())('A không đọc được closet_items của B', async () => { /* select trả 0 hàng */ })
it.skipIf(!hasServiceRoleEnv())('A không sửa được closet_items của B', async () => { /* update ảnh hưởng 0 hàng */ })
it.skipIf(!hasServiceRoleEnv())('A không xoá được closet_items của B', async () => { /* delete ảnh hưởng 0 hàng */ })
it.skipIf(!hasServiceRoleEnv())('A không tải được file trong thư mục của B', async () => { /* download lỗi */ })
it.skipIf(!hasServiceRoleEnv())('cùng một user không lưu trùng item_slug', async () => { /* insert thứ hai vi phạm unique */ })
```

- [ ] **Step 2: Chạy test, xác nhận nó SKIP khi không có env** — `pnpm vitest run src/lib/supabase/rls.integration.test.ts` → skipped, không fail

- [ ] **Step 3: Viết migration `supabase/migrations/0001_account_and_closet.sql`**

Bắt buộc trong migration: `enable row level security` trên cả năm bảng; policy select/insert/update/delete so khớp `auth.uid()`; `unique (user_id, item_slug)` (và tương ứng cho outfit/style); bucket `closet` tạo với `public = false`; policy trên `storage.objects` so khớp `auth.uid()::text = (storage.foldername(name))[1]`; `on delete cascade` từ `auth.users` xuống mọi bảng. `category`/`fit`/`label_source` là enum hoặc check constraint, không phải text tự do.

- [ ] **Step 4: Viết `scripts/setup-supabase.sh`**

Script tương tác dẫn người dùng tạo project Supabase, tạo OAuth client trên Google Cloud Console, dán client ID/secret vào Supabase, rồi ghi `.env.local`. Dừng ở mỗi bước chờ xác nhận — đây là phần máy không tự làm được (spec §5).

- [ ] **Step 5: Áp migration lên một project thật rồi chạy test** — `pnpm vitest run src/lib/supabase/rls.integration.test.ts` với env thật → PASS

- [ ] **Step 6: Chạy toàn bộ test không có env** — `pnpm test` → PASS (integration test skip)

- [ ] **Step 7: Commit**

```bash
git add supabase scripts/setup-supabase.sh src/lib/supabase/rls.integration.test.ts
git commit -m "feat(supabase): migration, RLS và bucket private cho tủ đồ"
```

---

### Task 3: Đăng nhập Google và ranh giới route

**Files:**
- Create: `src/app/auth/callback/route.ts`, `src/app/auth/sign-out/route.ts`
- Create: `src/components/layout/AuthMenu.tsx`, `src/components/layout/AuthMenu.test.tsx`
- Modify: `src/components/layout/SiteHeader.tsx`, `src/components/layout/MobileNavigation.tsx`
- Create: `src/features/account/guard.ts`, `src/features/account/guard.test.ts`

**Interfaces:**
- Consumes: `getCurrentUserId()`, `createSupabaseServerClient()` (Task 1)
- Produces: `requireUserId(): Promise<string>` — redirect `/` khi chưa đăng nhập; `AuthState = { status: 'unconfigured' } | { status: 'signed-out' } | { status: 'signed-in'; displayName: string | null }`; `getAuthState(): Promise<AuthState>`

- [ ] **Step 1: Viết test fail** — `src/features/account/guard.test.ts` và `src/components/layout/AuthMenu.test.tsx`

```ts
// guard.test.ts
it('getAuthState trả unconfigured khi thiếu env Supabase', async () => { /* ... */ })
it('getAuthState trả signed-out khi không có user', async () => { /* ... */ })
it('requireUserId redirect khi chưa đăng nhập', async () => { /* ... */ })

// AuthMenu.test.tsx
it('không hiện nút đăng nhập khi Supabase chưa cấu hình', () => { /* ... */ })
it('hiện nút đăng nhập bằng Google khi đã đăng xuất', () => { /* ... */ })
it('hiện nút đăng xuất khi đã đăng nhập', () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/account src/components/layout/AuthMenu.test.tsx`

- [ ] **Step 3: Implement `getAuthState()` và `requireUserId()` trong `src/features/account/guard.ts`**

`requireUserId` dùng `redirect('/')` của `next/navigation` khi không có user.

- [ ] **Step 4: Implement `AuthMenu` và hai route `/auth/callback`, `/auth/sign-out`**

`AuthMenu` gọi `signInWithOAuth({ provider: 'google' })` trên client. `/auth/callback` đổi `code` lấy session (`exchangeCodeForSession`) rồi redirect `/closet`. Trạng thái `unconfigured` không render gì — đây là Review Focus #1.

- [ ] **Step 5: Chạy test** — `pnpm vitest run src/features/account src/components/layout` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/auth src/features/account src/components/layout
git commit -m "feat(auth): đăng nhập Google và ranh giới vùng cần tài khoản"
```

---

### Task 4: Repository tủ đồ và signed URL

**Files:**
- Create: `src/types/closet.ts`
- Create: `src/features/closet/schema.ts`, `src/features/closet/schema.test.ts`
- Create: `src/features/closet/repository.ts`, `src/features/closet/repository.test.ts`
- Create: `src/features/closet/images.ts`, `src/features/closet/images.test.ts`

**Interfaces:**
- Consumes: Task 1 client, Task 2 schema
- Produces:
  - `type LabelSource = 'ai' | 'user'`
  - `type ClosetItem = { id, userId, name, imagePath, category: CategorySlug, colorSlugs: string[], styleSlugs: string[], occasions: Occasion[], fit: Fit | null, attributes: ItemAttribute[], note: string | null, labelSource: LabelSource, createdAt: string }`
  - `type ClosetItemDraft = Omit<ClosetItem, 'id' | 'userId' | 'createdAt'>`
  - `closetItemDraftSchema: ZodType<ClosetItemDraft>` — mọi trường từ vựng là enum, không phải string
  - `listClosetItems(userId: string): Promise<ClosetItem[]>`
  - `createClosetItem(userId: string, draft: ClosetItemDraft): Promise<ClosetItem>`
  - `updateClosetItem(userId: string, id: string, patch: Partial<ClosetItemDraft>): Promise<ClosetItem | null>`
  - `deleteClosetItem(userId: string, id: string): Promise<boolean>`
  - `closetImagePath(userId: string, fileName: string): string` → `${userId}/${fileName}`
  - `signClosetImage(path: string): Promise<string | null>`

- [ ] **Step 1: Viết test fail**

```ts
// schema.test.ts
it('từ chối category không có trong CategorySlug', () => { /* safeParse fail */ })
it('từ chối màu không có trong fixtures', () => { /* safeParse fail */ })
it('chấp nhận fit null', () => { /* safeParse ok */ })
it('GarmentCategory và CategorySlug có cùng tập giá trị', () => { /* so hai mảng đã sort */ })

// repository.test.ts  (dùng client giả, không gọi database thật)
it('listClosetItems lọc theo đúng user_id', async () => { /* ... */ })
it('updateClosetItem trả null khi id thuộc user khác', async () => { /* ... */ })
it('deleteClosetItem trả false khi id thuộc user khác', async () => { /* ... */ })
it('createClosetItem đặt labelSource theo draft', async () => { /* ... */ })

// images.test.ts
it('closetImagePath đặt userId ở segment đầu', () => {
  expect(closetImagePath('u1', 'a.jpg')).toBe('u1/a.jpg')
})
it('signClosetImage trả null khi Supabase chưa cấu hình', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/closet`

- [ ] **Step 3: Implement `src/types/closet.ts`, `schema.ts`, `repository.ts`, `images.ts`**

Repository nhận client qua tham số (hoặc một factory inject được) để test dùng client giả — không import trực tiếp `createSupabaseServerClient` ở thân hàm. Mọi query đều kèm `.eq('user_id', userId)` **ngoài** RLS: RLS là lớp cuối, không phải lớp duy nhất (Review Focus #2). `closetItemDraftSchema` lấy danh sách màu/style từ `@/data` — `src/features/**` được phép, `src/lib/ai/**` thì không.

- [ ] **Step 4: Chạy test** — `pnpm vitest run src/features/closet` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/closet.ts src/features/closet
git commit -m "feat(closet): repository, schema và signed URL cho món cá nhân"
```

---

### Task 5: AI gắn nhãn quần áo

**Files:**
- Create: `src/lib/ai/tagger.ts`, `src/lib/ai/tagger.test.ts`
- Create: `src/lib/ai/tagger-deterministic.ts`, `src/lib/ai/tagger-deterministic.test.ts`
- Create: `src/lib/ai/tagger-gemini.ts`, `src/lib/ai/tagger-gemini.test.ts`
- Modify: `src/lib/ai/prompts.ts`

**Interfaces:**
- Consumes: `StylistVocabulary` từ `@/types/stylist`; `StylistPhoto`, `StylistCallOptions` từ `./provider`
- Produces:
  - `type GarmentCategory = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories'` (khai báo tại chỗ trong `tagger.ts`; **không** import `CategorySlug` từ `@/types/content` — xem Global Constraints)
  - `type GarmentTag = { name: string; category: GarmentCategory; colorSlugs: string[]; styleSlugs: string[]; occasions: Occasion[]; fit: Fit | null; attributes: ItemAttribute[]; note: string | null }`
  - `type TagRequest = { photo: StylistPhoto; vocabulary: StylistVocabulary }`
  - `type GarmentTagger = { readonly id: 'gemini' | 'deterministic'; tag(req: TagRequest, opts?: StylistCallOptions): Promise<GarmentTag> }`
  - `garmentTagSchema: ZodType<GarmentTag>`
  - `createDeterministicTagger(): GarmentTagger`
  - `createGeminiTagger(): GarmentTagger`
  - `TAGGER_TIMEOUT_MS = 20_000`

- [ ] **Step 1: Viết test fail**

```ts
// tagger.test.ts
it('schema từ chối category ngoài từ vựng', () => { /* safeParse fail */ })
it('schema từ chối màu không có trong vocabulary', () => { /* safeParse fail */ })
it('schema chấp nhận mảng rỗng cho attributes', () => { /* safeParse ok */ })

// tagger-deterministic.test.ts
it('trả nhãn trống để người dùng tự điền, không ném lỗi', async () => {
  const tag = await createDeterministicTagger().tag(req)
  expect(tag.category).toBe('tops')
  expect(tag.occasions).toEqual([])
  expect(tag.name).toMatch(/\p{Script=Latin}/u)
})

// tagger-gemini.test.ts
it('không gọi model thật khi thiếu key', async () => { /* ... */ })
it('bỏ giá trị lạ model trả về thay vì ghi vào kết quả', async () => { /* model giả trả category 'spacesuit' → ném, caller fallback */ })
it('chuyển tiếp AbortSignal xuống SDK', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/lib/ai/tagger`

- [ ] **Step 3: Implement contract + schema trong `tagger.ts`**

`garmentTagSchema` nhận `vocabulary` để dựng enum động cho `colorSlugs`/`styleSlugs` (danh sách màu/style không cố định trong `src/lib/ai/`); `fit`/`attributes`/`occasions` dùng enum tĩnh từ `@/types/stylist`; `category` dùng `GarmentCategory` khai báo tại chỗ. Một test trong `src/features/closet/schema.test.ts` (Task 4) phải khẳng định `GarmentCategory` và `CategorySlug` có đúng cùng tập giá trị, để hai bản sao không lệch nhau.

- [ ] **Step 4: Implement `createDeterministicTagger()` và `createGeminiTagger()`**

Deterministic trả nhãn tối thiểu, tên tiếng Việt chung chung, `occasions: []`, `labelSource` do caller đặt. Gemini theo đúng mẫu `src/lib/ai/gemini.ts`: `Output.object` với schema, forward `signal`. Prompt mới trong `prompts.ts` **chỉ** hỏi về món đồ — cấm mô tả người, cấm suy luận về chủ sở hữu.

- [ ] **Step 5: Chạy test** — `pnpm vitest run src/lib/ai` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai
git commit -m "feat(ai): provider gắn nhãn quần áo, ràng vào từ vựng catalog"
```

---

### Task 6: Route gắn nhãn và hạn mức theo người dùng

**Files:**
- Create: `src/app/api/closet/tag/route.ts`, `src/app/api/closet/tag/route.test.ts`
- Create: `src/features/closet/quota.ts`, `src/features/closet/quota.test.ts`
- Modify: `supabase/migrations/` (thêm bảng `ai_usage`)

**Interfaces:**
- Consumes: Task 3 `requireUserId`, Task 4 `signClosetImage`, Task 5 tagger
- Produces: `POST /api/closet/tag` — body `{ imagePath: string }` → `{ tag: GarmentTag, labelSource: LabelSource, degradedReason: string | null }`; `consumeTagQuota(userId: string): Promise<boolean>`; `TAG_DAILY_LIMIT = 60`

- [ ] **Step 1: Viết test fail** — `src/app/api/closet/tag/route.test.ts`

```ts
it('401 khi chưa đăng nhập', async () => { /* ... */ })
it('400 khi imagePath không thuộc thư mục của chính user', async () => { /* ... */ })
it('trả nhãn deterministic kèm degradedReason khi thiếu key, không 429', async () => { /* ... */ })
it('vượt hạn mức vẫn trả 200 với nhãn deterministic', async () => { /* ... */ })
it('không log đường dẫn ảnh hay nội dung ảnh', async () => { /* spy console */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/app/api/closet`

- [ ] **Step 3: Thêm bảng `ai_usage(user_id, day date, count int)` vào migration, unique `(user_id, day)`, RLS theo `auth.uid()`**

- [ ] **Step 4: Implement `consumeTagQuota` và route**

Thứ tự kiểm ở route, cùng tinh thần `src/app/api/stylist/route.ts`: đăng nhập → `imagePath` bắt đầu bằng `${userId}/` → quota → gọi model. Vượt hạn mức hoặc thiếu key **không bao giờ** trả lỗi; rơi xuống deterministic và nói thật qua `degradedReason`.

- [ ] **Step 5: Chạy test** — `pnpm vitest run src/app/api/closet src/features/closet` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/closet src/features/closet/quota.ts supabase/migrations
git commit -m "feat(closet): route gắn nhãn với hạn mức theo người dùng"
```

---

### Task 7: UI tủ đồ — thêm, sửa nhãn, xoá

**Files:**
- Create: `src/app/closet/items/page.tsx`
- Create: `src/components/closet/AddItemForm.tsx`, `src/components/closet/AddItemForm.test.tsx`
- Create: `src/components/closet/ClosetItemCard.tsx`, `src/components/closet/ClosetItemCard.test.tsx`
- Create: `src/components/closet/EmptyCloset.tsx`
- Modify: `src/app/closet/page.tsx`

**Interfaces:**
- Consumes: Task 4 repository, Task 6 route
- Produces: UI; không export type cho task sau

- [ ] **Step 1: Viết test fail**

```ts
// AddItemForm.test.tsx
it('từ chối file vượt MAX_PHOTO_BYTES trước khi upload', async () => { /* ... */ })
it('từ chối định dạng ngoài ALLOWED_PHOTO_TYPES', async () => { /* ... */ })
it('hiện form đã điền sẵn sau khi gắn nhãn xong', async () => { /* ... */ })
it('đổi labelSource sang user khi người dùng sửa một trường', async () => { /* ... */ })

// ClosetItemCard.test.tsx
it('hiện ảnh bằng signed URL, không bằng đường dẫn thô', () => { /* ... */ })
it('hỏi xác nhận trước khi xoá', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/components/closet`

- [ ] **Step 3: Implement form, card, trạng thái rỗng và trang `/closet/items`**

Upload đi **thẳng** từ trình duyệt lên bucket qua client Supabase, rồi POST `imagePath` sang `/api/closet/tag`. Form hiện ra **đã điền**, không phải trống. Trạng thái rỗng dẫn người dùng đi thêm món, không chỉ báo rỗng. `/closet` khi Supabase chưa cấu hình hiện trạng thái "chưa cấu hình" — Review Focus #1.

- [ ] **Step 4: Chạy test + lint** — `pnpm vitest run src/components/closet && pnpm lint` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/closet src/components/closet
git commit -m "feat(closet): thêm, sửa nhãn và xoá món trong tủ"
```

---

### Task 8: Lưu món/bộ/style của Bí Mặc theo slug

**Files:**
- Create: `src/features/closet/saved.ts`, `src/features/closet/saved.test.ts`
- Create: `src/components/closet/SaveButton.tsx`, `src/components/closet/SaveButton.test.tsx`
- Create: `src/app/closet/looks/page.tsx`, `src/app/closet/styles/page.tsx`
- Modify: `src/app/wardrobe/[category]/[slug]/page.tsx`, `src/app/styles/[slug]/page.tsx`

**Interfaces:**
- Consumes: Task 1 client, Task 3 `getAuthState`
- Produces:
  - `toggleSavedItem(userId: string, itemSlug: string): Promise<boolean>` (true = đang lưu sau thao tác)
  - `listSavedItems(userId: string): Promise<FashionItem[]>`
  - `listSavedOutfits(userId: string): Promise<Outfit[]>`
  - `listSavedStyles(userId: string): Promise<Style[]>`

- [ ] **Step 1: Viết test fail** — `src/features/closet/saved.test.ts`

```ts
it('listSavedItems bỏ qua slug không còn trong fixtures', async () => {
  // database trả ['ao-so-mi-lua', 'slug-da-bi-xoa'] → kết quả chỉ 1 món, không ném lỗi
})
it('toggleSavedItem lưu rồi bỏ lưu đúng một lần mỗi lượt', async () => { /* ... */ })
it('toggleSavedItem từ chối slug không có trong fixtures', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/closet/saved.test.ts`

- [ ] **Step 3: Implement `saved.ts`**

Đọc: lấy slug từ database rồi map qua fixtures, slug không khớp thì **bỏ qua im lặng** (Review Focus #4). Ghi: validate slug tồn tại trong fixtures trước khi insert.

- [ ] **Step 4: Implement `SaveButton` và cắm vào trang item/style, thêm `/closet/looks`, `/closet/styles`**

Chưa đăng nhập: nút dẫn sang đăng nhập, không ẩn đi. Supabase chưa cấu hình: không render nút.

- [ ] **Step 5: Chạy test** — `pnpm vitest run src/features/closet src/components/closet` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/closet/saved.ts src/components/closet/SaveButton.tsx src/app/closet src/app/wardrobe src/app/styles
git commit -m "feat(closet): lưu món, bộ và style của Bí Mặc theo slug"
```

---

### Task 9: `RankableItem` — nới ranker để xếp hạng được món cá nhân

**Files:**
- Create: `src/features/stylist/rankable.ts`
- Modify: `src/features/stylist/rank.ts:107-151` (`rankItems`)
- Modify: `src/features/stylist/rank.test.ts`
- Modify: `src/features/stylist/pipeline.ts` (call site `rankItems`)

**Interfaces:**
- Consumes: `ResolvedAnalysis`, `StylistAnswers`
- Produces:
  - `type RankableItem = { slug: string; colorSlugs: readonly string[]; styleSlugs: readonly string[]; occasions: readonly Occasion[]; fit: Fit | null; attributes: readonly ItemAttribute[] }`
  - `type PersonalItem = RankableItem & { name: string; image: string | null; note: string | null }` — `slug` kế thừa từ `RankableItem` và mang **id của món trong tủ**, nên không có trường `id` riêng
  - `rankItems<T extends RankableItem>(analysis: ResolvedAnalysis, answers: StylistAnswers, items: readonly T[], limit?: number): T[]`

- [ ] **Step 1: Viết test fail** — thêm vào `src/features/stylist/rank.test.ts`

```ts
it('rankItems xếp hạng được object chỉ có các trường của RankableItem', () => {
  // mảng 2 PersonalItem dựng tay, không phải FashionItem → trả về đúng kiểu đó
})
it('rankItems giữ nguyên hard filter avoid trên món cá nhân', () => { /* ... */ })
it('rankItems giữ nguyên hard filter occasion trên món cá nhân', () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/stylist/rank.test.ts`

- [ ] **Step 3: Khai báo `RankableItem`/`PersonalItem` và đổi chữ ký `rankItems` sang generic nhận `items` thay vì `catalog`**

Thân hàm không đổi logic — chỉ đổi nguồn lặp từ `catalog.items` sang `items` và kiểu trả về sang `T[]`. `rankOutfits` **không** đổi: nó vẫn nhận `StylistCatalog`. Cập nhật call site trong `pipeline.ts` thành `rankItems(resolved, input.answers, deps.catalog.items)`.

- [ ] **Step 4: Chạy toàn bộ test stylist** — `pnpm vitest run src/features/stylist && pnpm typecheck` → PASS, không test cũ nào phải sửa assertion

- [ ] **Step 5: Commit**

```bash
git add src/features/stylist
git commit -m "refactor(stylist): rankItems nhận RankableItem thay vì cả catalog"
```

---

### Task 10: Pipeline trả nhóm `closetItems`

**Files:**
- Modify: `src/features/stylist/pipeline.ts` (`StylistDeps`, `StylistOutcome`, `runStylist`)
- Modify: `src/features/stylist/pipeline.test.ts`

**Interfaces:**
- Consumes: Task 9 `PersonalItem`, `rankItems`
- Produces:
  - `StylistDeps.personalItems?: readonly PersonalItem[]`
  - `StylistOutcome.closetItems: Array<{ id: string; name: string; image: string | null; note: string | null }>` — `id` lấy từ `PersonalItem.slug`

- [ ] **Step 1: Viết test fail** — thêm vào `src/features/stylist/pipeline.test.ts`

```ts
it('closetItems rỗng khi không truyền personalItems', async () => { /* ... */ })
it('closetItems chứa món cá nhân hợp lệ, items catalog không đổi', async () => { /* ... */ })
it('món cá nhân có thuộc tính bị avoid thì không lọt vào closetItems', async () => { /* ... */ })
it('tủ rỗng cho kết quả giống hệt khi không có personalItems', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/stylist/pipeline.test.ts`

- [ ] **Step 3: Thêm `personalItems` vào `StylistDeps` và `closetItems` vào `StylistOutcome`**

Gọi `rankItems` lần thứ hai trên `deps.personalItems ?? []`. `items` (catalog) giữ nguyên hoàn toàn — không đổi hình dạng, không đổi thứ tự. `closetItems` không có `href`: món cá nhân không có trang công khai.

- [ ] **Step 4: Chạy test** — `pnpm vitest run src/features/stylist` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/stylist
git commit -m "feat(stylist): pipeline trả nhóm closetItems từ tủ đồ người dùng"
```

---

### Task 11: Route và UI stylist dùng tủ đồ

**Files:**
- Modify: `src/app/api/stylist/route.ts`
- Modify: `src/app/api/stylist/route.test.ts`
- Modify: `src/components/stylist/StylistResult.tsx`, `src/components/stylist/StylistResult.test.tsx`, `src/components/stylist/StylistFlow.tsx`

**Interfaces:**
- Consumes: Task 3 `getCurrentUserId`, Task 4 `listClosetItems`/`signClosetImage`, Task 10 `personalItems`
- Produces: dòng NDJSON `result` thêm trường `closetItems`

- [ ] **Step 1: Viết test fail** — `src/app/api/stylist/route.test.ts`

```ts
it('chưa đăng nhập vẫn chạy, closetItems rỗng', async () => { /* ... */ })
it('Supabase chưa cấu hình vẫn chạy, không ném lỗi', async () => { /* ... */ })
it('đã đăng nhập thì closetItems lấy từ tủ của đúng user đó', async () => { /* ... */ })
it('lỗi khi đọc tủ đồ không làm hỏng cả request', async () => { /* closetItems rỗng, result vẫn về */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/app/api/stylist`

- [ ] **Step 3: Nạp tủ đồ trong route và chuyển thành `PersonalItem[]`**

Đọc trước khi dựng stream. `image` là signed URL sinh tại đây — pipeline là hàm thuần, không được gọi Supabase. Đọc tủ thất bại thì coi như tủ rỗng, **không** làm hỏng request (Review Focus #1).

- [ ] **Step 4: Thêm mục "Món trong tủ bạn dùng được" vào UI kết quả**

Nhóm riêng, có nhãn nói rõ đây là đồ của người dùng. Tủ rỗng hoặc chưa đăng nhập thì không render mục này.

- [ ] **Step 5: Chạy test + lint** — `pnpm vitest run src/app/api/stylist src/components/stylist && pnpm lint` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stylist src/components/stylist
git commit -m "feat(stylist): phối đồ bằng món trong tủ của người dùng"
```

---

### Task 12: Nhớ câu trả lời questionnaire

**Files:**
- Create: `src/features/account/preferences.ts`, `src/features/account/preferences.test.ts`
- Modify: `src/app/api/stylist/route.ts`
- Modify: `src/components/stylist/Questionnaire.tsx`

**Interfaces:**
- Consumes: Task 1 client, `stylistAnswersSchema` từ `src/features/stylist/input.ts`
- Produces: `savePreferences(userId: string, answers: StylistAnswers): Promise<void>`; `loadPreferences(userId: string): Promise<StylistAnswers | null>`

- [ ] **Step 1: Viết test fail**

```ts
it('loadPreferences trả null khi profiles.preferences rỗng', async () => { /* ... */ })
it('loadPreferences trả null khi dữ liệu cũ không còn hợp schema', async () => { /* occasion đã bị xoá khỏi OCCASIONS */ })
it('savePreferences ghi đè lần trả lời trước', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/account/preferences.test.ts`

- [ ] **Step 3: Implement `preferences.ts`**

Đọc luôn validate lại bằng `stylistAnswersSchema`; dữ liệu cũ không hợp thì trả `null`, không throw — từ vựng có thể đã nới từ lần lưu trước.

- [ ] **Step 4: Ghi preferences sau mỗi lượt stylist thành công, và điền sẵn `Questionnaire` khi đã đăng nhập**

Ghi không được chặn response: lỗi ghi chỉ bỏ qua.

- [ ] **Step 5: Chạy test** — `pnpm vitest run src/features/account src/components/stylist` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/account src/app/api/stylist src/components/stylist
git commit -m "feat(account): nhớ câu trả lời questionnaire giữa các lần dùng"
```

---

### Task 13: Xoá tài khoản

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/features/account/delete.ts`, `src/features/account/delete.test.ts`
- Create: `src/app/api/account/route.ts`, `src/app/api/account/route.test.ts`
- Create: `src/app/closet/account/page.tsx`
- Create: `src/features/account/delete.integration.test.ts`

**Interfaces:**
- Consumes: Task 1 env, Task 4 `closetImagePath`
- Produces: `deleteAccount(userId: string): Promise<void>`; `DELETE /api/account`

- [ ] **Step 1: Viết test fail**

```ts
// delete.test.ts
it('xoá file trong bucket trước khi xoá hàng database', async () => {
  // thứ tự lời gọi: storage.remove đứng trước auth.admin.deleteUser
})
it('ném lỗi khi thiếu SUPABASE_SERVICE_ROLE_KEY', async () => { /* ... */ })

// route.test.ts
it('401 khi chưa đăng nhập', async () => { /* ... */ })
it('chỉ xoá được chính mình, không nhận userId từ body', async () => { /* ... */ })

// delete.integration.test.ts  (skip khi thiếu env)
it.skipIf(!hasServiceRoleEnv())('sau khi xoá, bucket không còn file nào của user', async () => { /* list trả rỗng */ })
it.skipIf(!hasServiceRoleEnv())('sau khi xoá, năm bảng không còn hàng nào của user', async () => { /* ... */ })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL** — `pnpm vitest run src/features/account src/app/api/account`

- [ ] **Step 3: Implement `admin.ts` và `deleteAccount`**

`admin.ts` đọc `SUPABASE_SERVICE_ROLE_KEY`, có `import 'server-only'` ở đầu file để build gãy nếu lọt vào bundle client. Thứ tự bắt buộc: liệt kê + xoá file trong bucket → `auth.admin.deleteUser` (cascade dọn năm bảng). Đảo thứ tự là mất đường dẫn ảnh trước khi dùng tới (Review Focus #5).

- [ ] **Step 4: Implement route + trang xác nhận**

Route lấy userId từ session, **không** từ body. Trang có bước xác nhận không bấm nhầm được và nói rõ không hoàn tác được.

- [ ] **Step 5: Chạy test** — `pnpm vitest run src/features/account src/app/api/account && pnpm build` → PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/admin.ts src/features/account src/app/api/account src/app/closet/account
git commit -m "feat(account): xoá tài khoản kèm dọn sạch bucket và database"
```

---

### Task 14: E2E, tài liệu và ADR

**Files:**
- Create: `e2e/closet.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `docs/11_DECISIONS.md`, `CLAUDE.md`, `docs/09_MVP_ROADMAP.md`, `docs/04_DATA_MODEL.md`, `docs/07_SECURITY_PRIVACY.md`

**Interfaces:**
- Consumes: mọi task trước
- Produces: —

- [ ] **Step 1: Viết `e2e/closet.spec.ts`**

```ts
test('thêm món vào tủ rồi thấy nó trong kết quả phối đồ', async ({ page }) => { /* ... */ })
test('/closet đòi đăng nhập', async ({ page }) => { /* ... */ })
test('trang công khai vẫn mở được khi chưa đăng nhập', async ({ page }) => { /* ... */ })
```

Spec này cần session thật nên phải `test.skip` khi thiếu env Supabase — `e2e/demo-path.spec.ts` hiện có **không** được đổi và phải vẫn xanh trên server không key.

- [ ] **Step 2: Chạy e2e** — `pnpm test:e2e` → PASS (spec mới skip khi không có env, `demo-path` vẫn xanh)

- [ ] **Step 3: Ghi ADR vào `docs/11_DECISIONS.md`**

Thay `ADR-009` (sản phẩm thật, không còn portfolio), thay `ADR-010` (tủ đồ cần đăng nhập; bỏ `localStorage` vốn chưa từng được code), thay `ADR-008` (dựng ranh giới vùng cần đăng nhập), mở rộng `ADR-012` (ảnh quần áo lưu bucket private; ảnh cơ thể vẫn không lưu), và bốn ADR mới: slug text thay khoá ngoại; AI gắn nhãn trước người dùng sửa sau; app chạy được khi thiếu credentials; xoá tài khoản là xoá thật cả bucket lẫn database.

- [ ] **Step 4: Cập nhật `CLAUDE.md`**

`/closet` không còn là vỏ copy-only. Thêm `pnpm` command mới nếu có. **Xoá** block `<!-- BEGIN:nextjs-agent-rules -->` khỏi diff nếu `pnpm dev` đã chèn vào.

- [ ] **Step 5: Chạy toàn bộ kiểm chứng trong shell không có env Supabase và không có AI key**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: cả bốn PASS

- [ ] **Step 6: Commit**

```bash
git add e2e playwright.config.ts docs CLAUDE.md
git commit -m "docs: ghi ADR cho tủ đồ cá nhân, e2e luồng đã đăng nhập"
```
