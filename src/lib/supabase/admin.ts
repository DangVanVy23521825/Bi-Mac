import 'server-only'

// Client service-role. Đây là module nguy hiểm nhất trong `src/`: khoá này
// đi xuyên **toàn bộ** RLS trong `supabase/migrations/0001_account_and_closet.sql`
// — mọi policy `auth.uid() = user_id` đều vô hiệu với nó. Lọt vào bundle
// client là lộ quyền đọc/ghi/xoá dữ liệu của mọi người dùng, không chỉ của
// một người.
//
// `import 'server-only'` ở dòng đầu là hàng rào cho đúng chuyện đó, và nó là
// hàng rào *cơ học*, không phải quy ước: package này chỉ resolve về một
// module rỗng dưới điều kiện export `react-server`. Nếu bất kỳ module
// `'use client'` nào (trực tiếp hay qua chuỗi import) kéo file này vào,
// `next build` gãy ngay với thông điệp của chính package đó. Không có nó,
// một dòng `import` nhầm chỗ sẽ build thành công và đẩy khoá ra trình duyệt.
// (Vitest chạy theo điều kiện `node` nên alias trong `vitest.config.mts` trỏ
// `server-only` về một stub rỗng — xem `test/server-only-stub.ts`.)
//
// Hợp đồng trả `null` thay vì ném, giống hệt `getSupabaseEnv` và
// `createSupabaseServerClient`: app phải boot/typecheck/test được với zero
// biến Supabase (CLAUDE.md). Nơi quyết định "thiếu khoá thì làm gì" là phía
// gọi — `deleteAccount` biến `null` thành một lỗi có tên, vì xoá tài khoản
// là việc không được phép âm thầm không xảy ra.
//
// `SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc ở đúng hai nơi trong repo: file
// này và `./test-env.ts` (chỉ test import). Không nơi nào log giá trị đó.
//
// Hai tuỳ chọn `auth` bên dưới không phải trang trí: client này không có
// người dùng nào để giữ phiên, và một `autoRefreshToken` chạy nền trong
// môi trường serverless là một timer không ai dừng.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from './env'

export function createSupabaseAdminClient(
  source: Record<string, string | undefined> = process.env,
): SupabaseClient | null {
  const env = getSupabaseEnv(source)
  if (!env) return null

  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null

  return createClient(env.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
