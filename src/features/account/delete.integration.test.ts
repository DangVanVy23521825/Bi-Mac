// @vitest-environment node
//
// Test tích hợp duy nhất của Task 13, và là thứ duy nhất chứng minh được
// điều quan trọng nhất ở đây: **bucket thật sự rỗng sau khi xoá tài khoản**.
//
// Vì sao unit test không đủ. `delete.test.ts` chứng minh `deleteAccount`
// *ra lệnh* xoá file trước rồi mới xoá user — nó không chứng minh được rằng
// lệnh đó có tác dụng. Supabase Storage là hệ thống riêng: `on delete
// cascade` dọn năm bảng nhưng không chạm một byte nào trong bucket. Một
// test chỉ soi database sẽ xanh trong khi ảnh riêng tư vẫn nằm nguyên đó —
// đúng cái bẫy spec §6.8 mô tả. Chỉ một lần `storage.list` thật trên một
// project thật mới nói được sự thật.
//
// Điều kiện chạy: dùng chung `hasServiceRoleEnv()` với
// `src/lib/supabase/rls.integration.test.ts` — một nguồn sự thật, không
// phải hai bản sao sẽ lệch nhau. Shell trắng (không có biến Supabase nào)
// thì cả `describe` bị skip, kể cả hook, nên `pnpm test` vẫn xanh và không
// gọi mạng.
//
// `@vitest-environment node`: cả repo chạy jsdom, nhưng file này đi mạng
// thật và `@supabase/supabase-js` trong jsdom bị ràng CORS/`localStorage`
// giả lập. Cùng lý do với `rls.integration.test.ts`.

import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getServiceRoleEnv, hasServiceRoleEnv } from '@/lib/supabase/test-env'
import { deleteAccount } from './delete'

const BUCKET = 'closet'
const SETUP_TIMEOUT_MS = 60_000
const NETWORK_TIMEOUT_MS = 30_000

// PNG 1x1 hợp lệ — bucket `closet` chặn theo `allowed_mime_types`, nên
// upload phải là ảnh thật chứ không phải vài byte rác.
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

// Sáu bảng, không năm: `ai_usage` (migration `0002`) là bảng thứ sáu mang
// `user_id` của người dùng, và nó bị bỏ sót khỏi danh sách này cho tới khi
// review toàn nhánh chỉ ra. Nó *có* `on delete cascade` trỏ về
// `auth.users` giống năm bảng kia — nhưng "có cascade trong file SQL" và
// "không còn hàng nào sau khi xoá tài khoản" là hai điều khác nhau, và chỉ
// một lần đọc thật trên project thật mới nói được điều thứ hai.
const OWNED_TABLES = [
  'profiles',
  'closet_items',
  'saved_items',
  'saved_outfits',
  'saved_styles',
  'ai_usage',
] as const

describe.skipIf(!hasServiceRoleEnv())('deleteAccount trên project Supabase thật', () => {
  let admin: SupabaseClient
  let userId: string
  /** Ảnh đã upload trước khi xoá — số này phải > 0, nếu không test rỗng nghĩa. */
  let uploadedCount = 0

  beforeAll(async () => {
    const env = getServiceRoleEnv()
    if (!env) throw new Error('describe.skipIf lẽ ra đã chặn block này khi thiếu env')

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const created = await admin.auth.admin.createUser({
      email: `bimac-delete-${randomUUID()}@example.com`,
      password: randomUUID(),
      email_confirm: true,
    })
    if (created.error || !created.data.user) {
      throw new Error(`Không tạo được user test: ${created.error?.message ?? 'thiếu user'}`)
    }
    userId = created.data.user.id

    // Hai file, một trong thư mục con: `closetImagePath` (Task 4) chỉ sinh
    // đường dẫn phẳng `<uid>/<file>`, nhưng check constraint của
    // `closet_items` cho phép thư mục con, nên bước dọn phải xử lý được cả
    // hai — và bước duy nhất kiểm được điều đó là ở đây.
    const flatPath = `${userId}/ao-so-mi.png`
    const nestedPath = `${userId}/2026/vay-cu.png`
    for (const path of [flatPath, nestedPath]) {
      const uploaded = await admin.storage
        .from(BUCKET)
        .upload(path, PNG_1X1, { contentType: 'image/png', upsert: true })
      if (uploaded.error) throw new Error(`Không upload được ảnh test: ${uploaded.error.message}`)
      uploadedCount += 1
    }

    const seeded = await Promise.all([
      admin.from('closet_items').insert({
        user_id: userId,
        name: 'ao-so-mi',
        image_path: flatPath,
        category: 'tops',
        color_slugs: ['kem'],
        style_slugs: ['modern-classic'],
        occasions: ['work'],
        fit: 'relaxed',
        attributes: [],
        label_source: 'ai',
      }),
      admin.from('saved_items').insert({ user_id: userId, item_slug: 'ao-so-mi-lua' }),
      admin.from('saved_outfits').insert({ user_id: userId, outfit_slug: 'look-cong-so' }),
      admin.from('saved_styles').insert({ user_id: userId, style_slug: 'modern-classic' }),
      // Seed bằng service_role, không qua `increment_ai_usage`: sau
      // `0003_ai_usage_lock_down.sql` hàm đó chỉ chạy trong một phiên đăng
      // nhập thật (`auth.uid()` phải khớp `p_user_id`), còn file này chỉ
      // có client admin. Service role ghi thẳng vào bảng được — đó cũng là
      // đường duy nhất còn lại để sửa hạn mức bằng tay.
      admin.from('ai_usage').insert({ user_id: userId, day: '2026-01-01', count: 3 }),
    ])
    for (const result of seeded) {
      if (result.error) throw new Error(`Không seed được dữ liệu test: ${result.error.message}`)
    }

    // Positive control: nếu setup không tạo được gì thì hai test dưới đậu
    // một cách rỗng nghĩa ("không còn hàng nào" vì vốn chưa từng có hàng).
    const before = await admin.storage.from(BUCKET).list(userId)
    if ((before.data ?? []).length === 0) {
      throw new Error('Setup hỏng: bucket đã rỗng từ trước khi xoá')
    }

    await deleteAccount(userId)
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    // Chỉ còn tác dụng khi `deleteAccount` hoặc setup gãy giữa chừng — không
    // để lại user/ảnh rác trong một project thật.
    if (!admin || !userId) return

    try {
      const listed = await admin.storage.from(BUCKET).list(userId)
      const paths = (listed.data ?? []).map((entry) => `${userId}/${entry.name}`)
      if (paths.length > 0) await admin.storage.from(BUCKET).remove(paths)
    } catch {
      // Dọn tới đâu hay tới đó.
    }

    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {
      // Như trên — user có thể đã bị xoá đúng như mong đợi.
    }
  }, SETUP_TIMEOUT_MS)

  it.skipIf(!hasServiceRoleEnv())(
    'sau khi xoá, bucket không còn file nào của user',
    async () => {
      expect(uploadedCount).toBeGreaterThan(0)

      const root = await admin.storage.from(BUCKET).list(userId)
      expect(root.error).toBeNull()
      expect(root.data ?? []).toEqual([])

      const nested = await admin.storage.from(BUCKET).list(`${userId}/2026`)
      expect(nested.data ?? []).toEqual([])
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'sau khi xoá, sáu bảng không còn hàng nào của user',
    async () => {
      for (const table of OWNED_TABLES) {
        const column = table === 'profiles' ? 'id' : 'user_id'
        const { data, error } = await admin.from(table).select(column).eq(column, userId)

        expect(error).toBeNull()
        expect(data ?? []).toEqual([])
      }
    },
    NETWORK_TIMEOUT_MS,
  )
})
