// DELETE /api/account — ranh giới HTTP của việc xoá tài khoản.
//
// Đây là route duy nhất trong app chạy bằng service-role key (qua
// `deleteAccount` → `src/lib/supabase/admin.ts`), và hệ quả của điều đó là
// toàn bộ lý do file này được viết cẩn thận tới vậy: **service role đi
// xuyên RLS**. Hai mươi policy trong `0001_account_and_closet.sql` không
// đánh giá một dòng nào cho khoá đó. Nghĩa là ranh giới "chỉ xoá được chính
// mình" — thứ mà ở mọi route khác do database giữ — ở đây chỉ còn đúng một
// nơi để giữ: đoạn code dưới đây.
//
// Cụ thể là một dòng: `userId` đến từ `getCurrentUserId()` (cookie phiên,
// Supabase tự xác thực), **không bao giờ** từ body, query string, header hay
// bất cứ thứ gì người gọi điều khiển được. Handler này cố ý không nhận tham
// số `Request` nào cả — không có biến nào để lỡ tay đọc. Đừng thêm vào.
//
// `src/proxy.ts` chỉ khớp `/api/closet/:path*`, nên route này **không** có
// lớp 401 bên ngoài nào đỡ hộ như `/api/closet/tag` có. Bước 1 dưới đây là
// lớp duy nhất.
//
// Dùng method DELETE (không phải POST) nên trình duyệt không thể bắn nó
// bằng một `<form>` thường từ trang khác; chỉ `fetch` cùng origin mới gọi
// được, và cookie phiên của app là `SameSite=Lax` — một request CSRF kiểu
// form-post không mang được phiên tới đây.
//
// ADR-012: không log id người dùng, đường dẫn ảnh, hay chi tiết lỗi gốc.
// Mọi thông điệp trả ra là hằng số tĩnh viết sẵn bằng tiếng Việt.
//
// Runtime Node.js mặc định — không set `runtime = 'edge'`.

import { AccountDeletionError, deleteAccount, type AccountDeletionReason } from '@/features/account/delete'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/session'

const GENERIC_ERROR = 'Chưa xoá được tài khoản. Vui lòng thử lại sau ít phút.'

const ERROR_MESSAGES: Record<AccountDeletionReason, string> = {
  // Thiếu `SUPABASE_SERVICE_ROLE_KEY` là lỗi cấu hình phía máy chủ, không
  // phải lỗi của người dùng — nói thật thay vì để họ bấm lại mãi.
  'missing-service-role': 'Chức năng xoá tài khoản chưa được cấu hình trên máy chủ.',
  // Quan trọng nhất trong ba thông điệp: khi dọn ảnh thất bại, tài khoản
  // được giữ nguyên có chủ đích (xem `delete.ts`), và người dùng cần biết
  // chính xác điều đó thay vì phải đoán xem mình đã bị xoá một nửa hay chưa.
  'bucket-cleanup': 'Chưa xoá được ảnh trong tủ đồ nên tài khoản của bạn vẫn còn nguyên. Vui lòng thử lại.',
  'auth-delete': GENERIC_ERROR,
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// `getCurrentUserId()` (Task 1) không tự bọc `auth.getUser()` khỏi việc ném.
// `requireUserId()` có bọc nhưng nó `redirect()`, sai kiểu cho một API JSON.
// Nên route này mang try/catch riêng, giống hệt `/api/closet/tag`: một sự cố
// thoáng qua của Supabase đọc ra thành "chưa đăng nhập" (401), không thành
// 500 — và tuyệt đối không thành "cứ xoá đại".
async function resolveUserId(): Promise<string | null> {
  try {
    return await getCurrentUserId()
  } catch {
    return null
  }
}

// Tài khoản không còn, nhưng cookie phiên thì vẫn nằm trong trình duyệt.
// `scope: 'local'` xoá cookie mà không gọi ngược lên server auth — đúng thứ
// cần ở đây, vì phiên đó trỏ tới một user vừa biến mất và một lời gọi
// `signOut` bình thường sẽ lỗi. Route Handler là một trong hai nơi Next.js
// cho phép ghi cookie (xem `server.ts`), nên chỗ này làm được.
async function clearSession(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Dữ liệu đã xoá xong rồi; cookie thừa chỉ dẫn tới một phiên chết mà
    // lần gọi `auth.getUser()` kế tiếp sẽ tự từ chối. Không đáng để biến
    // một lần xoá thành công thành lỗi.
  }
}

export async function DELETE(): Promise<Response> {
  // 1. Ai đang gọi. Đây là *toàn bộ* phần kiểm quyền của endpoint này.
  const userId = await resolveUserId()
  if (!userId) {
    return jsonResponse(401, { error: 'Cần đăng nhập để dùng chức năng này.' })
  }

  // 2. Xoá bucket rồi tới database — thứ tự nằm trong `deleteAccount`.
  try {
    await deleteAccount(userId)
  } catch (error) {
    const message =
      error instanceof AccountDeletionError ? ERROR_MESSAGES[error.reason] : GENERIC_ERROR
    return jsonResponse(500, { error: message })
  }

  // 3. Chỉ dọn cookie khi đã xoá xong thật. Đăng xuất một người mà dữ liệu
  //    vẫn còn nguyên sẽ làm họ tưởng là xong.
  await clearSession()

  return jsonResponse(200, { ok: true })
}
