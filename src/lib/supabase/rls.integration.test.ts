// @vitest-environment node
//
// Kiểm chứng RLS bằng HAI người dùng thật trên một project Supabase thật.
// Đây là test duy nhất trong repo được phép gọi database thật, và nó chỉ chạy
// khi shell có đủ ba biến (url + anon key + service-role key) — xem
// `./test-env.ts`. Không có env thì cả `describe` bị skip, kể cả hook, nên
// `pnpm test` trong một shell trắng vẫn xanh và không gọi mạng.
//
// Vì sao phải là test tích hợp, không phải unit test: policy RLS nằm trong
// Postgres, không nằm trong TypeScript. Một client giả lập chỉ chứng minh
// được repository có gọi `.eq('user_id', …)` hay không — nó không bao giờ
// chứng minh được rằng khi *thiếu* điều kiện đó, database sẽ từ chối. Lớp
// cuối cùng bảo vệ ảnh quần áo của người dùng chỉ kiểm được bằng cách thật
// sự đăng nhập làm A rồi chĩa vào dữ liệu của B.
//
// `@vitest-environment node` ở dòng đầu là có chủ đích: cả repo chạy jsdom
// (vitest.config.mts), nhưng file này đi mạng thật và `@supabase/supabase-js`
// trong jsdom bị ràng CORS/`localStorage` của môi trường giả. Node env cho
// `fetch` thật và không có origin nào để chặn.

import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getServiceRoleEnv, hasServiceRoleEnv } from './test-env'

const BUCKET = 'closet'

// Mạng thật + tạo/xoá user thật: mặc định 5s của vitest là quá chặt.
const NETWORK_TIMEOUT_MS = 30_000
const SETUP_TIMEOUT_MS = 60_000

// PNG 1x1 hợp lệ. Bucket `closet` chặn `allowed_mime_types`, nên upload phải
// là ảnh thật với contentType đúng, không phải vài byte rác.
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

type TestUser = {
  id: string
  /** Client đã đăng nhập bằng anon key — đúng tư cách mà app dùng ở runtime. */
  client: SupabaseClient
}

// `describe.skipIf` (không chỉ `it.skipIf`) là thứ thật sự bảo vệ `beforeAll`:
// skip ở cấp test vẫn để hook chạy, và hook là chỗ tạo user thật. Guard trên
// từng `it` được giữ lại để một test bị di chuyển ra khỏi block này không âm
// thầm bắt đầu gọi mạng.
describe.skipIf(!hasServiceRoleEnv())('RLS trên project Supabase thật', () => {
  let admin: SupabaseClient
  /** Chưa đăng nhập — role `anon`, đúng tư cách của một khách vào trang công khai. */
  let guest: SupabaseClient
  let userA: TestUser
  let userB: TestUser
  let itemOfA: string
  let itemOfB: string
  const pathOfB = () => `${userB.id}/ao-cua-b.png`

  // Một ngày cố định, không phải "hôm nay": hạn mức là một hàng cho mỗi
  // (người dùng, ngày UTC), nên một ngày hằng số giữ các assertion dưới đây
  // chính xác tuyệt đối (`count` phải đúng bằng 1) bất kể suite chạy lúc
  // nào, và không chạm vào hàng của ngày thật.
  const USAGE_DAY = '2026-01-01'

  async function createTestUser(url: string, anonKey: string) {
    const email = `bimac-rls-${randomUUID()}@example.com`
    const password = randomUUID()

    // `email_confirm: true` để bỏ qua bước xác nhận email — không có hộp thư
    // nào ở đây, và test cần một user dùng được ngay.
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (created.error || !created.data.user) {
      throw new Error(`Không tạo được user test: ${created.error?.message ?? 'thiếu user'}`)
    }

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const signedIn = await client.auth.signInWithPassword({ email, password })
    if (signedIn.error) {
      throw new Error(`Không đăng nhập được user test: ${signedIn.error.message}`)
    }

    return { id: created.data.user.id, client }
  }

  async function insertOwnItem(user: TestUser, name: string) {
    const { data, error } = await user.client
      .from('closet_items')
      .insert({
        user_id: user.id,
        name,
        image_path: `${user.id}/${name}.png`,
        category: 'tops',
        color_slugs: ['kem'],
        style_slugs: ['modern-classic'],
        occasions: ['work'],
        fit: 'relaxed',
        attributes: [],
        label_source: 'ai',
      })
      .select('id')
      .single()

    // Không chỉ là setup: đây là positive control cho policy insert. Nếu
    // policy chặt quá tay (chặn cả chủ sở hữu), dòng này sẽ nổ ở đây thay vì
    // để các test "A không làm được X" đậu một cách rỗng nghĩa.
    if (error || !data) {
      throw new Error(`Chủ sở hữu không insert được món của chính mình: ${error?.message}`)
    }
    return data.id as string
  }

  beforeAll(async () => {
    const env = getServiceRoleEnv()
    if (!env) throw new Error('describe.skipIf lẽ ra đã chặn block này khi thiếu env')

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    guest = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    userA = await createTestUser(env.url, env.anonKey)
    userB = await createTestUser(env.url, env.anonKey)

    itemOfA = await insertOwnItem(userA, 'ao-cua-a')
    itemOfB = await insertOwnItem(userB, 'ao-cua-b')

    const uploaded = await userB.client.storage
      .from(BUCKET)
      .upload(pathOfB(), PNG_1X1, { contentType: 'image/png', upsert: true })
    if (uploaded.error) {
      throw new Error(`Chủ sở hữu không upload được vào thư mục của mình: ${uploaded.error.message}`)
    }

    // Hạn mức gắn nhãn AI: mỗi người tự tăng bộ đếm của mình qua RPC —
    // sau `0003_ai_usage_lock_down.sql` đó là con đường DUY NHẤT ghi vào
    // `ai_usage` (role `authenticated` chỉ còn `select` trên bảng này).
    // Hai lệnh gọi này vì vậy cũng là positive control cho cả hai nửa của
    // migration đó: nếu hàm không còn `security definer`, nó mất quyền ghi
    // và nổ ngay ở đây thay vì để các test "A không làm được X" bên dưới
    // đậu một cách rỗng nghĩa.
    for (const user of [userA, userB]) {
      const incremented = await user.client.rpc('increment_ai_usage', {
        p_user_id: user.id,
        p_day: USAGE_DAY,
      })
      if (incremented.error || incremented.data !== 1) {
        throw new Error(
          `Chủ sở hữu không tăng được hạn mức của chính mình: ${incremented.error?.message ?? `count = ${incremented.data}`}`,
        )
      }
    }
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return

    // Dọn từng user độc lập, không gộp điều kiện. Nếu `beforeAll` tạo được A
    // rồi gãy ở B (rate limit, mạng chớp), một guard dạng `userA && userB` sẽ
    // bỏ qua toàn bộ cleanup và để A nằm lại **vĩnh viễn** trong một project
    // thật — mỗi lần chạy lỗi lại thêm một user rác.
    //
    // Và mỗi bước bọc try/catch riêng: lỗi dọn bucket không được chặn việc
    // xoá user, vì xoá user mới là thứ `on delete cascade` dọn năm bảng.
    const created: Array<TestUser | undefined> = [userA, userB]

    for (const user of created) {
      if (!user) continue

      // Liệt kê rồi xoá, thay vì xoá theo đường dẫn đoán trước: dọn luôn mọi
      // file test đã tạo, kể cả file của một bước setup gãy nửa đường.
      // `on delete cascade` KHÔNG chạm storage (bucket là hệ thống riêng —
      // đúng cái bẫy spec §6.8 mô tả), nên bước này phải làm tay.
      try {
        const listed = await admin.storage.from(BUCKET).list(user.id)
        const paths = (listed.data ?? []).map((file) => `${user.id}/${file.name}`)
        if (paths.length > 0) await admin.storage.from(BUCKET).remove(paths)
      } catch {
        // Dọn được tới đâu hay tới đó — không để lỗi ở đây che mất kết quả test.
      }

      try {
        await admin.auth.admin.deleteUser(user.id)
      } catch {
        // Như trên.
      }
    }
  }, SETUP_TIMEOUT_MS)

  it.skipIf(!hasServiceRoleEnv())(
    'A đọc được closet_items của chính mình',
    async () => {
      const { data, error } = await userA.client.from('closet_items').select('id')

      expect(error).toBeNull()
      expect(data?.map((row) => row.id)).toEqual([itemOfA])
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'mỗi tài khoản mới có sẵn một hàng profiles, và chỉ thấy hàng của mình',
    async () => {
      // Trigger `on_auth_user_created` là thứ tạo hàng này. Nếu nó không chạy
      // (thiếu quyền trên `auth.users` chẳng hạn), `profiles` rỗng và mọi
      // `update profiles` sau này sẽ ảnh hưởng 0 hàng mà không báo lỗi —
      // mất dữ liệu im lặng, nên phải có test.
      const { data, error } = await userA.client.from('profiles').select('id')

      expect(error).toBeNull()
      expect(data).toEqual([{ id: userA.id }])
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'khách chưa đăng nhập không đọc được bảng nào',
    async () => {
      // Năm bảng này không có gì công khai. Trang công khai của Bí Mặc đọc
      // fixtures, không đọc database, nên role `anon` không cần quyền nào —
      // và policy nào cũng `to authenticated` nên không có policy nào khớp.
      // `data` rỗng dù vì `permission denied` (revoke ở mức bảng) hay vì 0
      // hàng khớp policy đều đạt: điều cần khẳng định là không rò hàng nào.
      for (const table of ['profiles', 'closet_items', 'saved_items']) {
        const { data } = await guest.from(table).select('*')
        expect(data ?? []).toEqual([])
      }
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không đọc được closet_items của B',
    async () => {
      // Đoán đúng id cũng không đọc được: policy lọc theo hàng, không dựa vào
      // việc id là bí mật.
      const { data, error } = await userA.client
        .from('closet_items')
        .select('id, name, image_path')
        .eq('id', itemOfB)

      expect(error).toBeNull()
      expect(data).toEqual([])
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không sửa được closet_items của B',
    async () => {
      const { data } = await userA.client
        .from('closet_items')
        .update({ name: 'bị A chiếm' })
        .eq('id', itemOfB)
        .select('id')

      expect(data).toEqual([])

      // Bắt buộc phải xác nhận lại bằng service role. `data: []` một mình
      // KHÔNG chứng minh được gì: `UPDATE … RETURNING` dưới RLS còn cần quyền
      // select trên hàng, nên một policy update hở nhưng select kín vẫn trả về
      // mảng rỗng. Chỉ hàng thật của B mới nói được sự thật.
      const after = await admin.from('closet_items').select('name').eq('id', itemOfB).single()
      expect(after.data?.name).toBe('ao-cua-b')
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không xoá được closet_items của B',
    async () => {
      const { data } = await userA.client
        .from('closet_items')
        .delete()
        .eq('id', itemOfB)
        .select('id')

      expect(data).toEqual([])

      const after = await admin.from('closet_items').select('id').eq('id', itemOfB)
      expect(after.data).toHaveLength(1)
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không ghi được hàng mang user_id của B',
    async () => {
      // Đây là test cho `with check`. Thiếu `with check`, `using` vẫn chặn đọc
      // đúng nhưng A ghi được hàng đứng tên B — hàng A không bao giờ thấy lại
      // mà B thì thấy trong tủ của mình.
      const inserted = await userA.client.from('closet_items').insert({
        user_id: userB.id,
        name: 'hàng gài vào tủ của B',
        image_path: `${userB.id}/gai.png`,
        category: 'tops',
        color_slugs: [],
        style_slugs: [],
        occasions: [],
        fit: null,
        attributes: [],
        label_source: 'ai',
      })

      expect(inserted.error).not.toBeNull()

      const rowsOfB = await admin.from('closet_items').select('id').eq('user_id', userB.id)
      expect(rowsOfB.data).toHaveLength(1)
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không tải được file trong thư mục của B',
    async () => {
      const downloaded = await userA.client.storage.from(BUCKET).download(pathOfB())
      expect(downloaded.error).not.toBeNull()

      // Signed URL là đường duy nhất app phát ảnh ra client, nên nó cũng phải
      // bị từ chối — không chỉ `download`.
      const signed = await userA.client.storage.from(BUCKET).createSignedUrl(pathOfB(), 60)
      expect(signed.error).not.toBeNull()

      // Và A không được *thấy* thư mục của B: biết tên file cũng là rò rỉ.
      const listed = await userA.client.storage.from(BUCKET).list(userB.id)
      expect(listed.data ?? []).toEqual([])
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không ghi được file vào thư mục của B',
    async () => {
      const uploaded = await userA.client.storage
        .from(BUCKET)
        .upload(`${userB.id}/cua-a.png`, PNG_1X1, { contentType: 'image/png' })

      expect(uploaded.error).not.toBeNull()
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'cùng một user không lưu trùng item_slug',
    async () => {
      const slug = 'ao-so-mi-lua'

      const first = await userA.client
        .from('saved_items')
        .insert({ user_id: userA.id, item_slug: slug })
      expect(first.error).toBeNull()

      const second = await userA.client
        .from('saved_items')
        .insert({ user_id: userA.id, item_slug: slug })
      expect(second.error?.code).toBe('23505')
    },
    NETWORK_TIMEOUT_MS,
  )

  // ── ai_usage: bảng thứ sáu, và bảng duy nhất mà một hàng bị sửa KHÔNG
  // làm rò rỉ dữ liệu của ai — nó làm mất trần chi phí. Review toàn nhánh
  // chỉ ra đúng khoảng trống này: `0002` thêm bảng + hàm, nhưng file test
  // tích hợp vẫn chỉ phủ `closet_items`/`profiles`/`saved_items`, nên một
  // người có project thật chạy cả hai file gated vẫn thấy xanh trong khi
  // hạn mức tốn-tiền thì ai cũng tự reset được.

  it.skipIf(!hasServiceRoleEnv())(
    'A không đọc được hàng ai_usage của B, khách chưa đăng nhập không đọc được hàng nào',
    async () => {
      const seenByA = await userA.client
        .from('ai_usage')
        .select('user_id, count')
        .eq('user_id', userB.id)

      expect(seenByA.error).toBeNull()
      expect(seenByA.data).toEqual([])

      // Và A chỉ thấy đúng hàng của mình khi không lọc gì cả.
      const allSeenByA = await userA.client.from('ai_usage').select('user_id')
      expect(allSeenByA.data).toEqual([{ user_id: userA.id }])

      const seenByGuest = await guest.from('ai_usage').select('*')
      expect(seenByGuest.data ?? []).toEqual([])
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A KHÔNG reset được hạn mức của chính mình — đây là lỗ hổng 0003 đóng lại',
    async () => {
      // Trước `0003`, `authenticated` có `update` ở mức bảng và policy
      // `ai_usage_update_own` cho qua cả `using` lẫn `with check` (hàng đó
      // đúng là của A), nên đúng lệnh này trả về thành công với
      // `count = 0` và A gọi lại `/api/closet/tag` được từ đầu. Sau `0003`
      // thì A không còn quyền `update` nào trên bảng này cả.
      const reset = await userA.client
        .from('ai_usage')
        .update({ count: 0 })
        .eq('user_id', userA.id)
        .select('count')

      expect(reset.error).not.toBeNull()

      // Service role mới nói được sự thật — `data: []` một mình không
      // chứng minh gì (cùng lý do như test "A không sửa được closet_items
      // của B" phía trên).
      const after = await admin
        .from('ai_usage')
        .select('count')
        .eq('user_id', userA.id)
        .eq('day', USAGE_DAY)
        .single()
      expect(after.data?.count).toBe(1)
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không sửa được hàng ai_usage của B',
    async () => {
      const stolen = await userA.client
        .from('ai_usage')
        .update({ count: 999 })
        .eq('user_id', userB.id)
        .select('count')

      expect(stolen.error).not.toBeNull()

      const after = await admin
        .from('ai_usage')
        .select('count')
        .eq('user_id', userB.id)
        .eq('day', USAGE_DAY)
        .single()
      expect(after.data?.count).toBe(1)
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không tăng được hạn mức của B qua RPC — hàm tự chặn, không nhờ RLS',
    async () => {
      // Đây là test cho dòng `p_user_id <> auth.uid()` trong
      // `0003_ai_usage_lock_down.sql`, và nó phải đứng riêng: hàm là
      // `security definer` nên nó BỎ QUA RLS — `with check` của
      // `ai_usage_insert_own`/`ai_usage_update_own` không còn là thứ chặn
      // lệnh gọi này. Nếu ai bỏ dòng kiểm tra đó đi, A đốt được hạn mức
      // của B mà mọi policy vẫn nguyên vẹn.
      const incremented = await userA.client.rpc('increment_ai_usage', {
        p_user_id: userB.id,
        p_day: USAGE_DAY,
      })

      expect(incremented.error).not.toBeNull()

      const after = await admin
        .from('ai_usage')
        .select('count')
        .eq('user_id', userB.id)
        .eq('day', USAGE_DAY)
        .single()
      expect(after.data?.count).toBe(1)
    },
    NETWORK_TIMEOUT_MS,
  )

  it.skipIf(!hasServiceRoleEnv())(
    'A không ghi đè được file của B bằng upsert',
    async () => {
      // `upload` không có `upsert` đi đường INSERT, nên policy *update*
      // của `storage.objects` — thứ chặn A ghi đè hoặc dời một file vào
      // thư mục của B — chưa từng được test nào chạm tới. `upsert: true`
      // trên một đường dẫn đã tồn tại của B là đúng đường đi đó.
      const overwritten = await userA.client.storage
        .from(BUCKET)
        .upload(pathOfB(), PNG_1X1, { contentType: 'image/png', upsert: true })

      expect(overwritten.error).not.toBeNull()

      // File của B vẫn còn nguyên và vẫn thuộc về B.
      const listed = await admin.storage.from(BUCKET).list(userB.id)
      expect((listed.data ?? []).map((file) => file.name)).toContain('ao-cua-b.png')
    },
    NETWORK_TIMEOUT_MS,
  )
})
