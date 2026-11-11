import { randomUUID } from 'node:crypto'

import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Cookie } from '@playwright/test'

import { getServiceRoleEnv, hasServiceRoleEnv } from '@/lib/supabase/test-env'

// Luồng đã đăng nhập: thêm món vào tủ, thấy nó trong kết quả AI phối đồ;
// `/closet` đòi đăng nhập; trang công khai vẫn mở được khi chưa đăng nhập.
//
// Cả ba kịch bản cần một project Supabase THẬT đang chạy phía
// `webServer` (xem `playwright.config.ts`) — kịch bản đầu cần một session
// thật để đưa vào cookie trình duyệt, hai kịch bản sau cần phân biệt được
// trạng thái "chưa cấu hình" khỏi "đã cấu hình nhưng chưa đăng nhập"
// (`getAuthState()`, `src/features/account/guard.ts`), thứ chỉ tồn tại khi
// Supabase thật sự được cấu hình. Không có credentials, `hasServiceRoleEnv()`
// (`src/lib/supabase/test-env.ts`, cùng cổng mà `rls.integration.test.ts` và
// `delete.integration.test.ts` dùng ở tầng Vitest) trả `false` và toàn bộ
// `describe` bị `test.skip` — Playwright báo "skipped", không báo "passed",
// nên một regression thật không thể âm thầm trôi qua dưới dạng "test này
// không chạy gì mà vẫn xanh".
//
// Lưu ý về `webServer`: `run-server-without-key.sh` di dời `.env` đi trước
// khi build/start, để buộc `GOOGLE_GENERATIVE_AI_API_KEY` thật sự vắng mặt
// (cho `demo-path.spec.ts`). Script đó chỉ di dời FILE `.env` — nó không xoá
// biến đã export thật trong shell. Vì vậy, để chạy được bộ test này, người
// chạy phải `export` ba biến Supabase thật ra shell (không chỉ để trong
// `.env`) trước khi gọi `pnpm test:e2e`; khi đó server khởi động vẫn có
// Supabase thật nhưng vẫn không có AI key — đúng những gì kịch bản 1 cần:
// AI gắn nhãn suy giảm về bản nháp rỗng (`tagger-deterministic.ts`), người
// dùng tự điền tên rồi lưu, giống đúng tinh thần ADR-011/ADR-018 áp cho
// việc gắn nhãn.
test.describe('tủ đồ cá nhân — luồng đã đăng nhập', () => {
  test.skip(
    !hasServiceRoleEnv(),
    'cần ba biến Supabase thật (url, anon key, service-role key) export ra shell — bỏ qua khi không có env',
  )

  const NETWORK_TIMEOUT_MS = 30_000

  // PNG 1x1 hợp lệ — giống fixture `rls.integration.test.ts` dùng. Bucket
  // `closet` chặn `allowed_mime_types`, nên upload phải là ảnh thật với
  // content type đúng, không phải vài byte rác.
  const PNG_1X1 = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ])

  let admin: SupabaseClient
  let userId: string
  let sessionCookies: Cookie[]

  test.beforeAll(async () => {
    const env = getServiceRoleEnv()
    // `test.skip` trên `describe` đã loại trường hợp `env === null` khỏi
    // việc chạy thật — nhánh này chỉ còn lại để tsc không phàn nàn về
    // `env` có thể null ở các dòng dưới.
    if (!env) return

    admin = createClient(env.url, env.serviceRoleKey)

    const email = `bimac-e2e-${randomUUID()}@example.com`
    const password = randomUUID()
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data.user) {
      throw new Error(`Không tạo được user test: ${created.error?.message ?? 'không rõ lỗi'}`)
    }
    userId = created.data.user.id

    const anon = createClient(env.url, env.anonKey)
    const signIn = await anon.auth.signInWithPassword({ email, password })
    if (signIn.error || !signIn.data.session) {
      throw new Error(`Không đăng nhập được user test: ${signIn.error?.message ?? 'không rõ lỗi'}`)
    }

    // Tái dùng chính `createServerClient` mà `src/lib/supabase/server.ts`
    // dùng ở app thật, với một cookie jar giả, để bắt lại đúng tên/giá trị
    // cookie mà `setSession` sẽ ghi — thay vì tự mã hoá base64url bằng
    // tay. Cách này không thể lệch định dạng với app thật vì nó chạy đúng
    // cùng một đoạn code thư viện mà app thật chạy.
    const jar = new Map<string, string>()
    const serverLikeClient = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll: () => [],
        setAll: (toSet) => {
          for (const { name, value } of toSet) jar.set(name, value)
        },
      },
    })
    await serverLikeClient.auth.setSession(signIn.data.session)

    sessionCookies = [...jar.entries()].map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    }))

    expect(sessionCookies.length).toBeGreaterThan(0)
  })

  test.afterAll(async () => {
    if (!userId) return

    // `auth.admin.deleteUser` tự cascade xoá `profiles`/`closet_items`/
    // `saved_*` (migration 0001, xem ADR-022) — nhưng nếu kịch bản 1 fail
    // giữa đường, trước khi route xoá tài khoản chạy tới, ảnh đã upload có
    // thể còn treo trong bucket. Dọn thêm một lần cho chắc, không phải vì
    // không tin ADR-022, mà vì test này không đi qua route đó.
    const listed = await admin.storage.from('closet').list(userId)
    const files = listed.data ?? []
    if (files.length > 0) {
      await admin.storage.from('closet').remove(files.map((file) => `${userId}/${file.name}`))
    }
    await admin.auth.admin.deleteUser(userId)
  })

  test('thêm món vào tủ rồi thấy nó trong kết quả phối đồ', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies(sessionCookies)
    const page = await context.newPage()

    const itemName = `Áo test ${randomUUID().slice(0, 8)}`

    await page.goto('/closet/items')
    await page
      .getByLabel('Chụp hoặc chọn ảnh món đồ')
      .setInputFiles({ name: 'ao-test.png', mimeType: 'image/png', buffer: Buffer.from(PNG_1X1) })

    // Không có AI key, nhãn luôn suy giảm về bản nháp gần-rỗng
    // (`tagger-deterministic.ts`: tên đặt sẵn "Món đồ mới", category
    // "tops", mọi danh sách rỗng) — form vẫn hiện ra đã điền một phần,
    // đúng hợp đồng §6.5. Đợi nó xuất hiện rồi đặt một tên riêng để việc
    // tìm lại món này ở bước sau không mơ hồ với món của lần chạy khác.
    const nameInput = page.getByLabel('Tên món đồ')
    await expect(nameInput).toBeVisible({ timeout: NETWORK_TIMEOUT_MS })
    await nameInput.fill(itemName)

    await page.getByRole('button', { name: 'Lưu vào tủ đồ' }).click()
    await expect(page.getByText(itemName)).toBeVisible({ timeout: NETWORK_TIMEOUT_MS })

    await page.goto('/stylist')
    await page.getByLabel('Đi làm').check()
    await page.getByRole('button', { name: /Xem gợi ý/ }).click()

    // Nhánh dự phòng của AI phối đồ (không key) vẫn đi qua hai chặng NDJSON
    // trước khi render xong — chờ tiêu đề của nhóm "món cá nhân" xuất hiện,
    // nó chỉ render khi `closetItems` không rỗng (xem `StylistResult.tsx`).
    await expect(page.getByRole('heading', { name: 'Món trong tủ bạn dùng được' })).toBeVisible({
      timeout: NETWORK_TIMEOUT_MS,
    })
    await expect(page.getByText(itemName)).toBeVisible()

    await context.close()
  })

  test('/closet đòi đăng nhập', async ({ page }) => {
    // `page` mặc định không có cookie session nào — đúng tư cách khách
    // chưa đăng nhập, trên một server ĐÃ cấu hình Supabase (khác trạng
    // thái "chưa cấu hình" mà `demo-path.spec.ts` kiểm trên server
    // keyless). `getAuthState()` phải trả `signed-out`, không phải
    // `unconfigured`, nên thông điệp phải là lời mời đăng nhập, không
    // phải lời xin lỗi vì thiếu cấu hình.
    await page.goto('/closet')
    await expect(page.getByText('Đăng nhập để xem nội dung này.')).toBeVisible()
  })

  test('trang công khai vẫn mở được khi chưa đăng nhập', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('link', { name: /AI phối đồ/ }).first()).toBeVisible()

    const itemResponse = await page.goto('/wardrobe/tops/so-mi-trang')
    expect(itemResponse?.status()).toBe(200)

    const styleResponse = await page.goto('/styles/modern-classic')
    expect(styleResponse?.status()).toBe(200)
  })
})
