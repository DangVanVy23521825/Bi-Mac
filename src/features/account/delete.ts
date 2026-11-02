// Xoá tài khoản — đường ra khỏi Bí Mặc, và nó phải là xoá thật.
//
// Người đã upload bốn mươi tấm ảnh quần áo của chính mình phải rời đi được
// và dữ liệu đó thật sự biến mất: mọi hàng trong `profiles`, `closet_items`,
// `saved_items`, `saved_outfits`, `saved_styles`, **và mọi file trong
// bucket** — không phải một cờ `deleted_at` với dữ liệu còn nằm nguyên đó.
//
// ── Thứ tự, và vì sao nó là cả bài toán ──────────────────────────────────
//
// `on delete cascade` từ `auth.users` dọn sạch năm bảng (migration 0001), và
// đó là lý do bước cuối cùng chỉ cần `auth.admin.deleteUser`. Nhưng
// **Supabase Storage là một hệ thống riêng**: cascade không xoá một byte nào
// trong bucket. Đường dẫn tới ảnh chỉ tồn tại ở hai chỗ — hàng `closet_items`
// (bị cascade cuốn đi) và chính bucket. Xoá user trước là xoá mất chỉ mục
// trước khi dùng tới nó: file ảnh riêng tư nằm lại vĩnh viễn, không còn truy
// vấn nào tìm ra được.
//
// Nên thứ tự bắt buộc là: **liệt kê + xoá file trong bucket → xoá auth
// user**. Không bao giờ ngược lại.
//
// ── Dọn bucket hỏng giữa chừng thì sao ───────────────────────────────────
//
// Fail closed: ném lỗi và **không** xoá auth user. Lý do là bất đối xứng của
// hai kiểu sai. Dừng lại để tài khoản còn nguyên là một thất bại có thể thử
// lại — dữ liệu vẫn ở đó, người dùng bấm lại lần nữa. Xoá user khi bucket
// chưa sạch là một thất bại **không thể sửa**: ảnh riêng tư còn đó mà không
// ai — kể cả chính chủ, kể cả người vận hành — biết đường dẫn để tìm. Giữa
// "chưa xong, thử lại" và "mất kiểm soát vĩnh viễn một phần dữ liệu riêng
// tư", chọn cái thứ nhất.
//
// ── Ranh giới "chỉ chính mình" ───────────────────────────────────────────
//
// Hàm này chạy bằng service-role key, tức là RLS không còn chặn gì — nó đi
// xuyên mọi policy. `userId` vì thế là một tham số **đầy quyền lực**: ai gọi
// được hàm này với id bất kỳ thì xoá được tài khoản bất kỳ. Hàm không tự bảo
// vệ được chỗ đó (nó không biết ai đang gọi); ranh giới nằm ở phía gọi, tại
// `src/app/api/account/route.ts`, nơi `userId` lấy từ session chứ không bao
// giờ từ body. Đừng thêm một call site thứ hai cho hàm này mà không đọc
// comment đầu file route đó trước.
//
// ADR-012: không log đường dẫn ảnh, id người dùng, hay bất cứ thứ gì suy ra
// từ dữ liệu cá nhân. Mọi thông điệp lỗi dưới đây là hằng số tĩnh.

import type { SupabaseClient } from '@supabase/supabase-js'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'closet'

/**
 * Số file mỗi lần `list`/`remove`. Mặc định của Supabase Storage là 100 và
 * nó **không** trả thêm trang nào nếu người gọi không tự hỏi tiếp — một tủ
 * đồ 120 món sẽ bị dọn đúng 100 file rồi coi như xong. Export ra để test
 * phân trang không phải chép lại con số này.
 */
export const CLOSET_LIST_PAGE_SIZE = 100

export type AccountDeletionReason = 'missing-service-role' | 'bucket-cleanup' | 'auth-delete'

export class AccountDeletionError extends Error {
  readonly reason: AccountDeletionReason

  constructor(reason: AccountDeletionReason) {
    // Thông điệp là hằng số, không nội suy id hay đường dẫn nào vào.
    super(`account-delete-${reason}`)
    this.name = 'AccountDeletionError'
    this.reason = reason
  }
}

/**
 * Mọi đường dẫn file nằm dưới `prefix`, đã phân trang hết và đã đi vào thư
 * mục con.
 *
 * Liệt kê **toàn bộ trước**, xoá sau — không vừa xoá vừa lật trang. Xoá giữa
 * chừng làm danh sách dịch đi dưới chân con trỏ `offset`, và chỗ bị bỏ sót
 * là file nằm lại trong bucket mà không ai biết.
 *
 * Thư mục con: `closetImagePath` (Task 4) chỉ sinh đường dẫn phẳng
 * `<uid>/<file>`, nên app này không tạo thư mục con — nhưng check constraint
 * `closet_items_image_path_in_own_folder` lại cho phép, và một file nằm sót
 * trong thư mục con cũng là ảnh riêng tư y như mọi file khác. Supabase đánh
 * dấu thư mục bằng `id === null`; đệ quy vào đó rẻ hơn nhiều so với việc
 * đoán sai.
 */
async function listFilePaths(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const files: string[] = []
  const folders: string[] = []

  for (let offset = 0; ; ) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list(prefix, { limit: CLOSET_LIST_PAGE_SIZE, offset })

    if (error) throw new AccountDeletionError('bucket-cleanup')

    const entries = data ?? []
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`
      if (entry.id === null) folders.push(path)
      else files.push(path)
    }

    if (entries.length < CLOSET_LIST_PAGE_SIZE) break
    offset += entries.length
  }

  for (const folder of folders) {
    files.push(...(await listFilePaths(admin, folder)))
  }

  return files
}

async function emptyUserFolder(admin: SupabaseClient, userId: string): Promise<void> {
  // Prefix là chính `userId` — segment đầu mà `closetImagePath` đặt vào mọi
  // đường dẫn, mà storage policy so khớp bằng `(storage.foldername(name))[1]`,
  // và mà check constraint trên `closet_items` ép bằng `strpos(...) = 1`. Ba
  // chỗ đó cùng bảo đảm: không file nào của người dùng này nằm ngoài đây, và
  // không file nào trong đây thuộc về người khác.
  const paths = await listFilePaths(admin, userId)

  for (let i = 0; i < paths.length; i += CLOSET_LIST_PAGE_SIZE) {
    const { error } = await admin.storage
      .from(BUCKET)
      .remove(paths.slice(i, i + CLOSET_LIST_PAGE_SIZE))

    if (error) throw new AccountDeletionError('bucket-cleanup')
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  if (!admin) throw new AccountDeletionError('missing-service-role')

  // 1. Bucket trước. Xem comment đầu file: đảo thứ tự là bỏ lại ảnh riêng tư
  //    không ai tìm được nữa.
  await emptyUserFolder(admin, userId)

  // 2. Rồi mới tới auth user — `on delete cascade` dọn nốt năm bảng.
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new AccountDeletionError('auth-delete')
}
