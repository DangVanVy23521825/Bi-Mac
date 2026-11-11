'use server'

// Ba Server Action cho `/closet/items` — thêm, sửa nhãn, xoá. Sống trong
// module riêng của chính nó (không phải closure lồng trong `page.tsx`
// nữa) vì đó là cách duy nhất để test được chúng bằng Vitest: mock
// `@/features/account/guard`, `@/lib/supabase/server`,
// `@/features/closet/repository`, `next/cache`, rồi gọi trực tiếp — không
// phải render cả cây Server Component của trang để chạm tới logic này.
//
// Mỗi action tự gọi lại `requireUserId()` của chính nó (không nhận
// `userId` qua tham số, dù `page.tsx` đã có sẵn một bản) — cùng triết lý
// "phòng thủ theo lớp" mà `repository.ts` áp cho `.eq('user_id', …)` trên
// mọi câu truy vấn: một Server Action, một khi đã export, là một RPC
// endpoint Next.js tự expose ra ngoài — không còn là một lời gọi hàm nội
// bộ đã được gác cổng sẵn bởi UI gọi nó.
//
// `updateItemAction` chạy qua đúng `closetItemDraftSchema` mà
// `createItemAction` dùng. `schema.ts`'s header gọi đây là "the one
// validation gate a closet item draft must pass... whether typed by a
// user or produced by an AI label" — review trước đó chỉ ra đường sửa
// nhãn đã đi tắt qua cổng này, rủi ro cụ thể là `colorSlugs`/`styleSlugs`
// không có check constraint ở DB (xem comment trong `src/types/closet.ts`),
// nên một patch tuỳ ý gửi thẳng vào action này sẽ lưu được slug không có
// trong catalog nếu không chặn ở đây.

import { revalidatePath } from 'next/cache'

import { requireUserId } from '@/features/account/guard'
import { closetItemDraftSchema } from '@/features/closet/schema'
import { createClosetItem, deleteClosetItem, updateClosetItem } from '@/features/closet/repository'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ClosetItemDraft } from '@/types/closet'

const PATH = '/closet/items'
const CONFIG_ERROR = 'Tính năng này cần Supabase được cấu hình, hiện chưa có.'
const SAVE_ERROR = 'Chưa lưu được món đồ này. Vui lòng thử lại.'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createItemAction(draft: ClosetItemDraft): Promise<ActionResult> {
  const userId = await requireUserId()

  const parsed = closetItemDraftSchema.safeParse(draft)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ.' }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  // `createClosetItem` throw trên mọi lỗi insert (`repository.ts`), khác
  // hai hàm repository mà `updateItemAction`/`deleteItemAction` gọi (chúng
  // trả `null`/`false`). Bắt ở đây để cả ba action cùng một hình dạng kết
  // quả: lỗi nào cũng về tới `AddItemForm` dưới dạng `{ ok: false }` kèm
  // một dòng đọc được, thay vì bay qua ranh giới Server Action và treo
  // form lại ở trạng thái "Đang lưu…".
  //
  // ADR-012: chỉ thông điệp tĩnh ra ngoài, không bao giờ là `error` gốc —
  // nó mang được cả `image_path` lẫn `user_id` của người dùng.
  try {
    await createClosetItem(supabase, userId, parsed.data)
  } catch {
    return { ok: false, error: SAVE_ERROR }
  }

  revalidatePath(PATH)
  return { ok: true }
}

// Nhận nguyên một `ClosetItemDraft` đầy đủ (không phải `Partial`) — đúng
// thứ `ClosetItemCard` thực sự gửi (`draft` ở đó luôn là bản đầy đủ, chỉ
// chỉnh dần từng field) — nên có thể chạy qua cùng một
// `closetItemDraftSchema` không cần biến thể `.partial()`.
export async function updateItemAction(id: string, draft: ClosetItemDraft): Promise<ActionResult> {
  const userId = await requireUserId()

  const parsed = closetItemDraftSchema.safeParse(draft)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ.' }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  const updated = await updateClosetItem(supabase, userId, id, parsed.data)
  if (!updated) return { ok: false, error: 'Không thể lưu thay đổi cho món đồ này. Vui lòng thử lại.' }

  revalidatePath(PATH)
  return { ok: true }
}

export async function deleteItemAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: CONFIG_ERROR }

  const deleted = await deleteClosetItem(supabase, userId, id)
  if (!deleted) return { ok: false, error: 'Không thể xoá món đồ này. Vui lòng thử lại.' }

  revalidatePath(PATH)
  return { ok: true }
}
