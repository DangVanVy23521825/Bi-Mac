// Cổng vào cho các test *tích hợp* — những test chỉ chạy được khi có một
// project Supabase thật. Dùng chung bởi `rls.integration.test.ts` và
// `src/features/account/delete.integration.test.ts` (Task 13).
//
// Vì sao là module riêng chứ không phải helper nằm trong từng test file: hai
// bản sao của cùng một điều kiện skip sẽ lệch nhau theo thời gian, và cái giá
// của việc lệch là một test tích hợp bỗng chạy thật trong CI rồi fail vì
// không có database — đúng kiểu lỗi tốn nhiều giờ để lần ra.
//
// File này **chỉ** được import từ test. Nó không có `import 'server-only'`
// (thứ đó sẽ gãy trong môi trường vitest), nên hàng rào thật nằm ở chỗ: không
// code app nào import nó, và `SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc ở đây
// và ở `src/lib/supabase/admin.ts` (Task 13, có `server-only`). Không hàm nào
// dưới đây log giá trị nó đọc được.
//
// Lưu ý về đặt tên: `test-env.ts` cố ý *không* khớp `src/**/*.test.{ts,tsx}`
// trong vitest.config.mts, nên vitest không coi nó là một test file rỗng.

import { getSupabaseEnv } from './env'

export type ServiceRoleEnv = {
  url: string
  anonKey: string
  serviceRoleKey: string
}

/**
 * Trả về đủ ba biến cần cho một test tích hợp, hoặc `null`. Cần cả anon key
 * (để đăng nhập *đúng tư cách* người dùng thường — chính thứ RLS phải chặn)
 * lẫn service-role key (để tạo/xoá user test và để kiểm chứng lại kết quả từ
 * bên ngoài RLS). Thiếu một trong hai là không kiểm được gì có nghĩa.
 */
export function getServiceRoleEnv(
  source: Record<string, string | undefined> = process.env,
): ServiceRoleEnv | null {
  const env = getSupabaseEnv(source)
  if (!env) return null

  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null

  return { url: env.url, anonKey: env.anonKey, serviceRoleKey }
}

export function hasServiceRoleEnv(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return getServiceRoleEnv(source) !== null
}
